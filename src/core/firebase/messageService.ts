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
  updateDoc,
  arrayUnion
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
      // Either explicitly 'direct' or no type (legacy), and has exactly these 2 participants
      const isDirect = data.type === "direct" || !data.type;
      if (isDirect && data.participants.includes(userId2) && data.participants.length === 2) {
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
    type: "text" | "settlement" | "storyReply" | "postShare" | "settlementSummary" | "image" = "text",
    imageUrl?: string,
    settlementData?: { title: string; amountToPay: number; bankAccount: string; },
    storyData?: { mediaUrl: string; storyId: string; },
    replyTo?: { id: string; text: string; senderId: string; senderName?: string; },
    postShareData?: { postId: string; postImage: string; postTitle?: string; authorName: string; },
    settlementSummaryData?: { groupId: string; groupName: string; totalAmount: number; splitCount: number; }
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
    
    if (type === "postShare" && postShareData) {
      messagePayload.postShareData = postShareData;
    }

    if (type === "settlementSummary" && settlementSummaryData) {
      messagePayload.settlementSummaryData = settlementSummaryData;
    }

    // Add message
    const messageDoc = await addDoc(messagesRef, messagePayload);

    // Update room's lastMessage and unread counts
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const roomData = roomSnap.data();
      const participants = roomData.participants || [];
      
      const unreadUpdate: any = {};
      participants.forEach((pId: string) => {
        if (pId !== senderId) {
          // Increment unread count for others
          const currentCount = (roomData.unreadCount && roomData.unreadCount[pId]) || 0;
          unreadUpdate[`unreadCount.${pId}`] = currentCount + 1;
        }
      });
      await updateDoc(roomRef, {
        lastMessage: {
          text: type === "text" ? text : 
                type === "settlement" ? "정산 요청" : 
                type === "storyReply" ? "스토리 답장" : 
                type === "postShare" ? "게시물 공유" : 
                "정산 요약 공유",
          createdAt: serverTimestamp(),
          senderId
        },
        updatedAt: serverTimestamp(),
        ...unreadUpdate
      });
      
      // Trigger Notification for Toast
      const { notificationService } = await import("./notificationService");
      const { userService } = await import("./userService");
      const senderProfile = await userService.getUserProfile(senderId);
      
      // Create notification for each participant except sender
      await Promise.all(participants.map((pId: string) => {
        if (pId !== senderId) {
          return notificationService.createNotification({
            uid: pId,
            type: "message",
            fromUid: senderId,
            fromNickname: senderProfile?.nickname || "사용자",
            fromAvatarUrl: senderProfile?.avatarUrl || null,
            content: type === "text" ? text : 
                     type === "settlement" ? "정산 요청" : 
                     type === "storyReply" ? "스토리 답장" : 
                     type === "postShare" ? "게시물 공유" : 
                     "정산 요약 공유",
          });
        }
        return Promise.resolve();
      }));
    }
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
          postShareData: data.postShareData,
          replyTo: data.replyTo,
          likes: data.likes || [],
          isEdited: data.isEdited || false,
          isDeleted: data.isDeleted || false,
          createdAt: data.createdAt,
          isRead: data.isRead,
          readBy: data.readBy || [],
          isEphemeral: data.isEphemeral || false
        } as Message;
      });
      callback(messages);
    });
  },

  // Mark an individual message as read for a specific user
  async markMessageAsRead(roomId: string, messageId: string, userId: string) {
    const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
    await updateDoc(messageRef, {
      readBy: arrayUnion(userId)
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
  },

  // Simplified: Sum up the individual unread counts for this user across all rooms
  subscribeToTotalUnreadCount(userId: string, callback: (count: number) => void) {
    const roomsRef = collection(db, "chatRooms");
    const q = query(roomsRef, where("participants", "array-contains", userId));

    return onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as ChatRoom;
        if (data.unreadCount && data.unreadCount[userId]) {
          totalUnread += data.unreadCount[userId];
        }
      });
      callback(totalUnread);
    });
  },

  // Mark all messages in a room as read for a specific user
  async markRoomAsRead(roomId: string, userId: string) {
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      // Use setDoc with merge so it works even if the room document doesn't exist yet
      // Also ensure the user is in the participants list for future notifications/unread counts
      await setDoc(roomRef, {
        unreadCount: {
          [userId]: 0
        },
        participants: arrayUnion(userId),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("[messageService] Failed to mark room as read:", error);
    }
  },

  // Update room name or image
  async updateRoomProfile(roomId: string, data: { name?: string; groupImage?: string }) {
    const roomRef = doc(db, "chatRooms", roomId);
    // Use setDoc with merge to ensure it creates the document if it somehow doesn't exist
    await setDoc(roomRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  // Delete an entire chat room and its messages
  async deleteRoom(roomId: string) {
    const roomRef = doc(db, "chatRooms", roomId);
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    
    // 1. Delete all messages first (Firestore requires manual batching for subcollections)
    const messagesSnapshot = await getDocs(messagesRef);
    const { deleteDoc } = await import("firebase/firestore");
    
    await Promise.all(messagesSnapshot.docs.map(mDoc => deleteDoc(mDoc.ref)));
    
    // 2. Delete the room document
    await deleteDoc(roomRef);
  }
};
