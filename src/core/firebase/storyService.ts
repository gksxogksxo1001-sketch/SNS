import { db, storage } from "./config";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Story, UserStoryGroup } from "@/types/story";
import { messageService } from "./messageService";
import { notificationService } from "./notificationService";
import { userService } from "./userService";

export const storyService = {
  // Upload a story image
  async uploadStory(userId: string, file: File, userData: { name: string, image: string }, visibility: "public" | "friends" | "close_friends" = "public"): Promise<string> {
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
      visibility,
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

      // Trigger Notification
      try {
        const storySnap = await getDoc(storyRef);
        if (storySnap.exists()) {
          const storyData = storySnap.data();
          const fromProfile = await userService.getUserProfile(userId);
          
          if (fromProfile) {
            await notificationService.createNotification({
              uid: storyData.userId, // recipient (story owner)
              type: "story_like",
              fromUid: userId,
              fromNickname: fromProfile.nickname,
              fromAvatarUrl: fromProfile.avatarUrl,
              postImage: storyData.mediaUrl, // use as thumbnail
              postId: storyId // keep for reference, though navigation might differ
            });
          }
        }
      } catch (error) {
        console.error("[storyService] Failed to send like notification:", error);
      }
    }
  },

  // Delete a story
  async deleteStory(storyId: string, mediaUrl?: string): Promise<void> {
    // 1. Delete Firestore document
    await deleteDoc(doc(db, "stories", storyId));

    // 2. Delete media from storage if URL provided
    if (mediaUrl) {
      try {
        // storage Url contains gs:// or https://, we need to extract the path if it's a full URL
        // But Firebase ref() can handle full URLs if they are download URLs
        const storageRef = ref(storage, mediaUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error("[StoryService] Failed to delete storage object:", error);
      }
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
      undefined,
      {
        mediaUrl: story.mediaUrl,
        storyId: story.id
      }
    );
  },

  // Mark story as viewed
  async markStoryAsViewed(storyId: string, userId: string): Promise<void> {
    const storyRef = doc(db, "stories", storyId);
    await updateDoc(storyRef, {
      viewedBy: arrayUnion(userId)
    });
  },

  // Get all active stories (not expired)
  async getActiveStories(currentUserId?: string): Promise<UserStoryGroup[]> {
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
          hasUnread: false
        };
      }
      userGroups[story.userId].stories.push(story);
    });

    // Calculate hasUnread for each group and gather author profiles for visibility filtering
    const groups = Object.values(userGroups);
    
    if (!currentUserId) {
      // If not logged in, only see public stories
      return groups.map(group => ({
        ...group,
        stories: group.stories.filter(s => s.visibility === "public" || !s.visibility)
      })).filter(group => group.stories.length > 0);
    }

    // For logged in users:
    const myProfile = await userService.getUserProfile(currentUserId);
    const myFriends = myProfile?.friends || [];
    const userGroupsData = await userService.getUserProfile(currentUserId); // Actually we need group membership here too if we ever add group stories
    
    const filteredGroups = await Promise.all(groups.map(async (group) => {
      const authorProfile = await userService.getUserProfile(group.userId);
      
      const allowedStories = group.stories.filter(story => {
        // 1. My own story
        if (story.userId === currentUserId) return true;

        // 2. Public story
        if (story.visibility === "public" || !story.visibility) return true;

        // 3. Friends only story (Viewer must follow the author)
        if (story.visibility === "friends" && myFriends.includes(story.userId)) return true;

        // 4. Close Friends only story (Viewer must be in author's personal closeFriends list)
        if (story.visibility === "close_friends") {
          return authorProfile?.closeFriends?.includes(currentUserId) || false;
        }

        return false;
      });

      if (allowedStories.length === 0) return null;

      return {
        ...group,
        stories: allowedStories,
        hasUnread: allowedStories.some(story => !story.viewedBy.includes(currentUserId))
      };
    }));

    return filteredGroups.filter((g): g is UserStoryGroup => g !== null);
  },

  // Get all stories for a specific user (Archive)
  async getUserStories(userId: string): Promise<Story[]> {
    const storiesRef = collection(db, "stories");
    const q = query(
      storiesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Story[];
  },

  // Subscribe to active stories with real-time updates and visibility filtering
  subscribeToStories(currentUserId: string | undefined, callback: (groups: UserStoryGroup[]) => void) {
    const now = new Date();
    const storiesRef = collection(db, "stories");
    const q = query(
      storiesRef, 
      where("expiresAt", ">", Timestamp.fromDate(now)),
      orderBy("expiresAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
      const stories = snapshot.docs.map(doc => ({
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
            hasUnread: false
          };
        }
        userGroups[story.userId].stories.push(story);
      });

      const groups = Object.values(userGroups);
      
      if (!currentUserId) {
        callback(groups.map(group => ({
          ...group,
          stories: group.stories.filter(s => s.visibility === "public" || !s.visibility)
        })).filter(group => group.stories.length > 0));
        return;
      }

      // Filter for logged-in users
      const myProfile = await userService.getUserProfile(currentUserId);
      const myFriends = myProfile?.friends || [];
      
      const filteredGroups = await Promise.all(groups.map(async (group) => {
        const authorProfile = await userService.getUserProfile(group.userId);
        
        const allowedStories = group.stories.filter(story => {
          if (story.userId === currentUserId) return true;
          if (story.visibility === "public" || !story.visibility) return true;
          if (story.visibility === "friends" && myFriends.includes(story.userId)) return true;
          if (story.visibility === "close_friends") {
            return authorProfile?.closeFriends?.includes(currentUserId) || false;
          }
          return false;
        });

        if (allowedStories.length === 0) return null;

        return {
          ...group,
          stories: allowedStories,
          hasUnread: allowedStories.some(story => !story.viewedBy.includes(currentUserId))
        };
      }));

      callback(filteredGroups.filter((g): g is UserStoryGroup => g !== null));
    });
  }
};
