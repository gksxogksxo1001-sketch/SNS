import { db, storage } from "./config";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Story, UserStoryGroup } from "@/types/story";
import { messageService } from "./messageService";
import { updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";

export const storyService = {
  // Upload a story image
  async uploadStory(userId: string, file: File, userData: { name: string, image: string }): Promise<string> {
    const storageRef = ref(storage, `stories/${userId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const mediaUrl = await getDownloadURL(snapshot.ref);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const storyRef = await addDoc(collection(db, "stories"), {
      userId,
      user: {
        uid: userId,
        name: userData.name,
        image: userData.image
      },
      mediaUrl,
      type: "image",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      viewedBy: [],
      likesCount: 0,
      likedBy: []
    });

    return storyRef.id;
  },

  // Toggle story like
  async toggleStoryLike(storyId: string, userId: string, isLiked: boolean): Promise<void> {
    const storyRef = doc(db, "stories", storyId);
    if (isLiked) {
      await updateDoc(storyRef, {
        likedBy: arrayRemove(userId),
        likesCount: increment(-1)
      });
    } else {
      await updateDoc(storyRef, {
        likedBy: arrayUnion(userId),
        likesCount: increment(1)
      });
    }
  },

  // Reply to story (sends a DM)
  async replyToStory(story: Story, senderId: string, text: string): Promise<void> {
    // 1. Get or create chat room with owner
    const roomId = await messageService.createOrGetRoom(senderId, story.userId);
    
    // 2. Send message with story context
    await messageService.sendMessage(
      roomId,
      senderId,
      text || "스토리에 답장했습니다.",
      "storyReply",
      undefined,
      {
        mediaUrl: story.mediaUrl,
        storyId: story.id
      }
    );
  },

  // Get all active stories (not expired)
  async getActiveStories(): Promise<UserStoryGroup[]> {
    const now = new Date();
    const storiesRef = collection(db, "stories");
    const q = query(
      storiesRef, 
      where("expiresAt", ">", Timestamp.fromDate(now)),
      orderBy("expiresAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Story[];

    // Group stories by user
    const userGroups: Record<string, UserStoryGroup> = {};
    
    stories.forEach(story => {
      if (!userGroups[story.userId]) {
        userGroups[story.userId] = {
          userId: story.userId,
          user: story.user,
          stories: [],
          hasUnread: false // Logic for unread could be implemented based on viewedBy
        };
      }
      userGroups[story.userId].stories.push(story);
    });

    return Object.values(userGroups);
  }
};
