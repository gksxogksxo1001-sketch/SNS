import { db, storage } from "./config";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  where,
  limit,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Post, PostComment } from "@/types/post";
import { notificationService } from "./notificationService";
import { userService } from "./userService";
import { groupService } from "./groupService";

export interface LocationTag {
  name: string;
  lat?: number;
  lng?: number;
}

export const postService = {
  // Upload multiple images to Firebase Storage
  async uploadImages(files: File[], userId: string): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      try {
        const storageRef = ref(storage, `posts/${userId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
      } catch (error: any) {
        console.error(`[postService] Upload failed for ${file.name}:`, error);
        if (error.code === 'storage/unauthorized') {
          throw new Error("보안 규칙에 의해 업로드가 차단되었습니다. Storage 규칙을 확인해주세요.");
        }
        if (error.message?.includes('network-error') || !error.code) {
          throw new Error("네트워크 오류 또는 CORS 차단이 발생했습니다. \n\n[해결 방법]\n1. Firebase 콘솔의 Storage가 '시작하기' 되어 있는지 확인\n2. 브라우저 CORS 문제라면 gsutil을 통해 도메인 허용 설정이 필요합니다.");
        }
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  },

  // Create a new post in Firestore
  async createPost(postData: Omit<Post, "id" | "createdAt" | "likes" | "comments" | "likedBy">): Promise<string> {
    try {
      // Helper function to deep-clean undefined values (Firestore doesn't allow undefined)
      const cleanData = JSON.parse(JSON.stringify(postData, (key, value) => {
        return value === undefined ? null : value;
      }));
      
      console.log("[postService] Attempting to create post with sanitized data:", cleanData);
      const postsRef = collection(db, "posts");
      const docRef = await addDoc(postsRef, {
        ...cleanData,
        likes: 0,
        likedBy: [],
        comments: 0,
        createdAt: serverTimestamp(),
      });
      console.log("[postService] Post created successfully. ID:", docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error("[postService] Error in createPost:", error);
      const customError = new Error(error.message || "알 수 없는 데이터베이스 오류");
      (customError as any).code = error.code;
      throw customError;
    }
  },

  // Extract location from tags in content (#장소)
  async extractLocationFromTags(content: string): Promise<LocationTag | null> {
    const hashtagRegex = /#([^\s#@]+)/g;
    const matches = Array.from(content.matchAll(hashtagRegex));
    
    if (matches.length > 0) {
      // Simple logic: Use the first hashtag as the primary location
      // In a real app, this would call Google Places API to get lat/lng
      const locationName = matches[0][1];
      console.log(`[postService] Extracted location tag: ${locationName}`);
      
      return {
        name: locationName,
        // lat, lng would come from Google Places API
      };
    }
    return null;
  },

  // Update an existing post in Firestore
  async updatePost(postId: string, postData: Partial<Post>): Promise<void> {
    try {
      const cleanData = JSON.parse(JSON.stringify(postData, (key, value) => {
        return value === undefined ? null : value;
      }));
      
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        ...cleanData,
        updatedAt: serverTimestamp(),
      });
      console.log("[postService] Post updated successfully. ID:", postId);
    } catch (error: any) {
      console.error("[postService] Error in updatePost:", error);
      throw error;
    }
  },

  // Delete a post from Firestore
  async deletePost(postId: string): Promise<void> {
    const postRef = doc(db, "posts", postId);
    await deleteDoc(postRef);
  },

  // Fetch all posts from Firestore with visibility filtering
  async getPosts(currentUserId?: string): Promise<Post[]> {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    // Fetch unique users involved in these posts to optimize hits
    const userUids = Array.from(new Set(querySnapshot.docs.map(d => d.data().user?.uid).filter(Boolean)));
    const userProfiles: Record<string, any> = {};
    
    await Promise.all(userUids.map(async (uid) => {
      const userDoc = await getDoc(doc(db, "users", uid as string));
      if (userDoc.exists()) {
        userProfiles[uid as string] = userDoc.data();
      }
    }));

    const allPosts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const latestUserProgress = userProfiles[data.user?.uid];
      
      return {
        id: doc.id,
        ...data,
        user: {
          ...data.user,
          name: latestUserProgress?.nickname || data.user?.name,
          image: latestUserProgress?.avatarUrl || data.user?.image
        }
      };
    }) as Post[];

    // Filter by visibility
    return this.filterPostsByVisibility(allPosts, currentUserId, userProfiles);
  },

  // Helper method to filter posts based on visibility rules
  async filterPostsByVisibility(posts: Post[], currentUserId?: string, userProfiles: Record<string, any> = {}): Promise<Post[]> {
    if (!currentUserId) {
      return posts.filter(post => post.visibility === "public" || !post.visibility);
    }

    // Fetch user relations for filtering
    const [myFriends, myGroups] = await Promise.all([
      userService.getFriends(currentUserId),
      groupService.getUserGroups(currentUserId)
    ]);
    const myGroupIds = myGroups.map(g => g.id);

    return posts.filter(post => {
      // 1. My own post
      if (post.user.uid === currentUserId) return true;
      
      // 2. Public post
      if (post.visibility === "public" || !post.visibility) return true;
      
      // 3. Friends only post (Viewer must follow the author)
      if (post.visibility === "friends" && myFriends.includes(post.user.uid)) return true;
      
      const authorProfile = userProfiles[post.user.uid];
      
      // 4. Close Friends (Group OR Personal List)
      if (post.visibility === "close_friends") {
        // A. Group-based Close Friends
        if (post.groupId && myGroupIds.includes(post.groupId)) return true;
        
        // B. Personal List-based Close Friends
        // Must have author profile and viewer must be in their personal closeFriends list
        const authorCloseFriends = authorProfile?.closeFriends || [];
        if (!post.groupId && authorCloseFriends.includes(currentUserId)) return true;
        
        return false;
      }
      
      return false;
    });
  },

  // Fetch posts filtered by group ID
  async getPostsByGroup(groupId: string): Promise<Post[]> {
    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("groupId", "==", groupId)
      // Removed orderBy("createdAt", "desc") to prevent requiring a composite index.
    );
    const querySnapshot = await getDocs(q);

    // Fetch unique users involved in these posts to optimize hits
    const userUids = Array.from(new Set(querySnapshot.docs.map(d => d.data().user?.uid).filter(Boolean)));
    const userProfiles: Record<string, any> = {};

    await Promise.all(userUids.map(async (uid) => {
      const userDoc = await getDoc(doc(db, "users", uid as string));
      if (userDoc.exists()) {
        userProfiles[uid as string] = userDoc.data();
      }
    }));

    const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const latestUserProgress = userProfiles[data.user?.uid];

      return {
        id: doc.id,
        ...data,
        user: {
          ...data.user,
          name: latestUserProgress?.nickname || data.user?.name,
          image: latestUserProgress?.avatarUrl || data.user?.image
        }
      };
    }) as Post[];

    // Sort posts client-side so we don't need a composite index on Firebase
    return posts.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  },

  // Fetch a single post by ID
  async getPostById(postId: string): Promise<Post | null> {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    
    if (postSnap.exists()) {
      const data = postSnap.data();
      // Fetch user profile for latest data
      const userDoc = await getDoc(doc(db, "users", data.user?.uid));
      const latestUser = userDoc.exists() ? userDoc.data() : null;

      return {
        id: postSnap.id,
        ...data,
        user: {
          ...data.user,
          name: latestUser?.nickname || data.user?.name,
          image: latestUser?.avatarUrl || data.user?.image
        }
      } as Post;
    }
    return null;
  },

  // Toggle like status for a post
  async toggleLike(postId: string, userId: string, isLiked: boolean): Promise<void> {
    const { doc, updateDoc, arrayUnion, arrayRemove, increment } = await import("firebase/firestore");
    const postRef = doc(db, "posts", postId);
    
    if (isLiked) {
      // Unlike
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId),
        likes: increment(-1)
      });
    } else {
      // Like
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId),
        likes: increment(1)
      });

      // Trigger Notification
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data() as Post;
        const likerProfile = await userService.getUserProfile(userId);
        if (likerProfile) {
          await notificationService.createNotification({
            uid: postData.user.uid,
            type: "like",
            fromUid: userId,
            fromNickname: likerProfile.nickname,
            fromAvatarUrl: likerProfile.avatarUrl,
            postId: postId,
            postImage: postData.images?.[0] || ""
          });
        }
      }
    }
  },

  // Add a comment to a post
  async addComment(postId: string, commentData: Omit<PostComment, "id" | "createdAt" | "postId">): Promise<void> {
    const { doc, collection, addDoc, updateDoc, increment, serverTimestamp } = await import("firebase/firestore");
    const commentsRef = collection(db, "posts", postId, "comments");
    
    await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp(),
    });

    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      comments: increment(1)
    });

    // Trigger Notification
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data() as Post;
      const commenterProfile = await userService.getUserProfile(commentData.user.uid);
      if (commenterProfile) {
        await notificationService.createNotification({
          uid: postData.user.uid,
          type: "comment",
          fromUid: commentData.user.uid,
          fromNickname: commenterProfile.nickname,
          fromAvatarUrl: commenterProfile.avatarUrl,
          postId: postId,
          postImage: postData.images?.[0] || "",
          content: commentData.content
        });
      }
    }
  },

  // Fetch comments for a post
  async getComments(postId: string): Promise<PostComment[]> {
    const { collection, query, orderBy, getDocs } = await import("firebase/firestore");
    const commentsRef = collection(db, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as PostComment[];
  },

  // Subscribe to comments for real-time updates
  subscribeToComments(postId: string, callback: (comments: PostComment[]) => void): () => void {
    const commentsRef = collection(db, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as PostComment[];
      callback(comments);
    });
  },

  // Toggle bookmark status for a post
  async toggleBookmark(postId: string, userId: string, isBookmarked: boolean): Promise<void> {
    const { doc, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
    const postRef = doc(db, "posts", postId);
    
    if (isBookmarked) {
      // Unbookmark
      await updateDoc(postRef, {
        bookmarkedBy: arrayRemove(userId),
      });
    } else {
      // Bookmark
      await updateDoc(postRef, {
        bookmarkedBy: arrayUnion(userId),
      });
    }
  },

  // Subscribe to all posts for real-time updates with visibility filtering
  subscribeToPosts(currentUserId: string | undefined, callback: (posts: Post[]) => void): () => void {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, async (querySnapshot) => {
      // Fetch unique users involved in these posts to optimize hits
      const userUids = Array.from(new Set(querySnapshot.docs.map((d: any) => d.data().user?.uid).filter(Boolean)));
      const userProfiles: Record<string, any> = {};
      
      await Promise.all(userUids.map(async (uid) => {
        const userDoc = await getDoc(doc(db, "users", uid as string));
        if (userDoc.exists()) {
          userProfiles[uid as string] = userDoc.data();
        }
      }));

      const allPosts = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        const latestUserProgress = userProfiles[data.user?.uid];
        
        return {
          id: doc.id,
          ...data,
          user: {
            ...data.user,
            name: latestUserProgress?.nickname || data.user?.name,
            image: latestUserProgress?.avatarUrl || data.user?.image
          }
        };
      }) as Post[];

      // Apply visibility filtering
      const filteredPosts = await this.filterPostsByVisibility(allPosts, currentUserId, userProfiles);
      callback(filteredPosts);
    });
  },

  // Search posts by location name
  async searchPostsByLocation(queryText: string): Promise<Post[]> {
    const postsRef = collection(db, "posts");
    
    // Simplistic search: where("location.name", ">=", queryText) 
    // Note: Firestore doesn't support full-text search easily without external services
    // but we can do a prefix search for location names if they are indexed.
    const q = query(
      postsRef, 
      where("location.name", ">=", queryText), 
      where("location.name", "<=", queryText + "\uf8ff"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Post));
  }
};
