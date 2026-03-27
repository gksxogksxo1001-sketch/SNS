import { db, storage, auth } from "./config";
import { updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserProfile } from "@/types/user";
import { notificationService } from "./notificationService";
import { collection, query, where, getDocs, addDoc, deleteDoc, writeBatch, limit } from "firebase/firestore";
import { FriendRequest } from "@/types/notification";

export const userService = {
  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  },

  // Update profile photo
  async updateProfilePhoto(uid: string, file: File): Promise<string> {
    const storageRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // Update Firestore
    await setDoc(doc(db, "users", uid), {
      avatarUrl: downloadURL,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update Firebase Auth Profile (for immediate session sync)
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
    }

    return downloadURL;
  },

  // Update nickname
  async updateNickname(uid: string, nickname: string): Promise<void> {
    // Update Firestore
    await updateDoc(doc(db, "users", uid), {
      nickname: nickname,
      updatedAt: serverTimestamp()
    });

    // Update Firebase Auth Profile
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateProfile(auth.currentUser, { displayName: nickname });
    }
  },

  // Add visited country
  async addVisitedCountry(uid: string, country: string): Promise<void> {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      visitedCountries: arrayUnion(country),
      updatedAt: serverTimestamp()
    });

    // Increment totalCountries count
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const count = data.visitedCountries?.length || 0;
      await updateDoc(userRef, {
        "stats.totalCountries": count
      });
    }
  },

  // Update travel style
  async updateTravelStyle(uid: string, style: string): Promise<void> {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      travelStyle: style,
      updatedAt: serverTimestamp()
    });
  },

  // Remove visited country
  async removeVisitedCountry(uid: string, country: string): Promise<void> {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      visitedCountries: arrayRemove(country),
      updatedAt: serverTimestamp()
    });

    // Update totalCountries count
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const count = data.visitedCountries?.length || 0;
      await updateDoc(userRef, {
        "stats.totalCountries": count
      });
    }
  },

  // Get friends list
  async getFriends(uid: string): Promise<string[]> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().friends || [];
    }
    return [];
  },

  // Get friends list profiles
  async getFriendsProfiles(uid: string): Promise<UserProfile[]> {
    const friendUids = await this.getFriends(uid);
    if (friendUids.length === 0) return [];

    // Fetch all profiles
    const profiles = await Promise.all(
      friendUids.map((fUid: string) => this.getUserProfile(fUid))
    );

    return profiles.filter(Boolean) as UserProfile[];
  },

  // Send friend request
  async sendFriendRequest(fromUid: string, toUid: string): Promise<void> {
    const requestsRef = collection(db, "friendRequests");

    // Check if already exists
    const q = query(requestsRef, where("fromUid", "==", fromUid), where("toUid", "==", toUid));
    const snap = await getDocs(q);
    if (!snap.empty) return;

    await addDoc(requestsRef, {
      fromUid,
      toUid,
      status: "pending",
      createdAt: serverTimestamp()
    });

    // Trigger Notification
    const fromProfile = await this.getUserProfile(fromUid);
    if (fromProfile) {
      await notificationService.createNotification({
        uid: toUid,
        type: "friend_request",
        fromUid,
        fromNickname: fromProfile.nickname,
        fromAvatarUrl: fromProfile.avatarUrl
      });
    }
  },

  // Get pending friend requests for user
  async getPendingRequests(uid: string): Promise<FriendRequest[]> {
    const requestsRef = collection(db, "friendRequests");
    const q = query(requestsRef, where("toUid", "==", uid), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
  },

  // Accept friend request
  async acceptFriendRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, "friendRequests", requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) return;

    const { fromUid, toUid } = requestSnap.data() as FriendRequest;

    const batch = writeBatch(db);

    // Add to each other's friends list
    const fromUserRef = doc(db, "users", fromUid);
    const toUserRef = doc(db, "users", toUid);

    batch.update(fromUserRef, { friends: arrayUnion(toUid) });
    batch.update(toUserRef, { friends: arrayUnion(fromUid) });

    // Delete the request
    batch.delete(requestRef);

    await batch.commit();

    // Trigger Notification (to the one who sent the request)
    const toProfile = await this.getUserProfile(toUid);
    if (toProfile) {
      await notificationService.createNotification({
        uid: fromUid,
        type: "friend_accept",
        fromUid: toUid,
        fromNickname: toProfile.nickname,
        fromAvatarUrl: toProfile.avatarUrl
      });
    }
  },

  // Decline friend request
  async declineFriendRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, "friendRequests", requestId);
    await deleteDoc(requestRef);
  },

  // Search users by nickname (prefix search)
  async searchUsers(queryText: string): Promise<UserProfile[]> {
    if (!queryText.trim()) return [];

    const usersRef = collection(db, "users");
    // Simple prefix search: nickname >= query AND nickname < query + \uf8ff
    const q = query(
      usersRef,
      where("nickname", ">=", queryText),
      where("nickname", "<=", queryText + "\uf8ff"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  },

  // Unfollow/Remove friend
  async unfollowUser(uid: string, targetUid: string): Promise<void> {
    const userRef = doc(db, "users", uid);
    const targetRef = doc(db, "users", targetUid);

    const batch = writeBatch(db);

    // Remove from both friends lists
    batch.update(userRef, {
      friends: arrayRemove(targetUid),
      updatedAt: serverTimestamp()
    });
    batch.update(targetRef, {
      friends: arrayRemove(uid),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  },

  // Toggle close friend status
  async toggleCloseFriend(uid: string, targetUid: string, isCloseFriend: boolean): Promise<void> {
    const userRef = doc(db, "users", uid);
    if (isCloseFriend) {
      await updateDoc(userRef, {
        closeFriends: arrayRemove(targetUid),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userRef, {
        closeFriends: arrayUnion(targetUid),
        updatedAt: serverTimestamp()
      });
    }
  },

  // Get close friends list
  async getCloseFriends(uid: string): Promise<string[]> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().closeFriends || [];
    }
    return [];
  }
};
