import { db } from "./config";
import { 
  collection, 
  doc, 
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query, 
  where,
  orderBy, 
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { Message, ChatRoom } from "@/types/message";

export const messageService = {
  // Create or get an existing chat room between two users
  async createOrGetRoom(userId1: string, userId2: string): Promise<string> {
    const roomsRef = collection(db, "chatRooms");
    
    // Check if room exists
    // Firestore doesn't easily query array exact matches without advanced indexing, 
    // so we query for array-contains and filter locally for 1-on-1 chats.
    const q = query(
      roomsRef, 
      where("participants", "array-contains", userId1)
    );
    
    const snapshot = await getDocs(q);
    let existingRoomId: string | null = null;
    
    snapshot.forEach((doc) => {
      const data = doc.data() as ChatRoom;
      if (data.participants.includes(userId2) && data.participants.length === 2) {
        existingRoomId = doc.id;
      }
    });

    if (existingRoomId) {
      return existingRoomId;
    }

    // Create new room if not found
    const newRoomRef = await addDoc(roomsRef, {
      type: "direct",
      participants: [userId1, userId2],
      updatedAt: serverTimestamp(),
    });
    
    return newRoomRef.id;
  },

  // Create or get a group chat room
  async createGroupRoom(groupId: string, name: string, participants: string[], image?: string): Promise<string> {
    const roomsRef = collection(db, "chatRooms");
    const roomRef = doc(db, "chatRooms", groupId); // Use groupId as roomId for easy lookup
    
    const docSnap = await getDoc(roomRef);
    if (docSnap.exists()) {
      return docSnap.id;
    }

    await setDoc(roomRef, {
      type: "group",
      name,
      groupImage: image || "",
      participants,
      updatedAt: serverTimestamp(),
    });
    
    return groupId;
  },

  // Listen to user's chat rooms
  subscribeToUserRooms(userId: string, callback: (rooms: ChatRoom[]) => void) {
    const roomsRef = collection(db, "chatRooms");
    const q = query(
      roomsRef,
      where("participants", "array-contains", userId)
      // Removed orderBy("updatedAt", "desc") to prevent composite index error
      // while the index is building. We sort client-side instead.
    );

    return onSnapshot(q, (snapshot) => {
      let rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatRoom[];
      
      // Client-side sort by updatedAt descending
      rooms = rooms.sort((a, b) => {
        const timeA = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : ((a.updatedAt as any)?.getTime ? (a.updatedAt as any).getTime() : 0);
        const timeB = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : ((b.updatedAt as any)?.getTime ? (b.updatedAt as any).getTime() : 0);
        return timeB - timeA;
      });
      
      callback(rooms);
    });
  },

  // Get a single room by ID
  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const roomRef = doc(db, "chatRooms", roomId);
    const docSnap = await getDoc(roomRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ChatRoom;
    }
    return null;
  },

  async sendMessage(
    roomId: string, 
    senderId: string, 
    text: string, 
    type: "text" | "settlement" | "storyReply" = "text",
    settlementData?: { title: string; amountToPay: number; bankAccount: string; },
    storyData?: { mediaUrl: string; storyId: string; },
    replyTo?: { id: string; text: string; senderId: string; senderName?: string; }
  ): Promise<void> {
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    const roomRef = doc(db, "chatRooms", roomId);
    
    const timestamp = serverTimestamp();
    
    // Create base message
    const messagePayload: any = {
      roomId,
      senderId,
      text,
      type,
      createdAt: timestamp,
      isRead: false,
      likes: [],
      isEdited: false,
      isDeleted: false
    };

    if (replyTo) {
      messagePayload.replyTo = replyTo;
    }

    if (type === "settlement" && settlementData) {
      messagePayload.settlementData = settlementData;
    }

    if (type === "storyReply" && storyData) {
      messagePayload.storyData = storyData;
    }

    // Add message
    await addDoc(messagesRef, messagePayload);

    // Update room's last message and updatedAt
    await updateDoc(roomRef, {
      lastMessage: {
        text: type === "settlement" ? "정산 요청이 도착했습니다." : (type === "storyReply" ? "스토리에 답장했습니다." : text),
        senderId,
        createdAt: timestamp
      },
      updatedAt: timestamp
    });
  },

  // Listen to messages in a specific room
  subscribeToMessages(roomId: string, callback: (messages: Message[]) => void) {
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          roomId: data.roomId,
          senderId: data.senderId,
          text: data.text,
          type: data.type || "text",
          settlementData: data.settlementData,
          storyData: data.storyData,
          replyTo: data.replyTo,
          likes: data.likes || [],
          isEdited: data.isEdited || false,
          isDeleted: data.isDeleted || false,
          createdAt: data.createdAt,
          isRead: data.isRead
        } as Message;
      });
      callback(messages);
    });
  },

  // Mark a settlement message as paid
  async markSettlementAsPaid(roomId: string, messageId: string) {
    const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
    await updateDoc(messageRef, {
      "settlementData.isSettled": true
    });
  },

  // Toggle message like
  async toggleMessageLike(roomId: string, messageId: string, userId: string, isLiked: boolean) {
    const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
    const { arrayUnion, arrayRemove } = await import("firebase/firestore");
    await updateDoc(messageRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  },

  // Update message text
  async updateMessage(roomId: string, messageId: string, newText: string) {
    const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
    await updateDoc(messageRef, {
      text: newText,
      isEdited: true
    });
  },

  // Delete message (soft delete)
  async deleteMessage(roomId: string, messageId: string) {
    const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
    await updateDoc(messageRef, {
      isDeleted: true,
      text: "삭제된 메시지입니다."
    });
  }
};
