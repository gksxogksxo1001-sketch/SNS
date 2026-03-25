import { db } from "./config";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  writeBatch,
  deleteDoc,
  deleteField
} from "firebase/firestore";
import { Group } from "@/types/group";
import { notificationService } from "./notificationService";
import { userService } from "./userService";
import { messageService } from "./messageService";

export const groupService = {
  // Create a new travel group
  async createGroup(ownerId: string, name: string, description: string, startDate?: string, endDate?: string): Promise<string> {
    const groupRef = await addDoc(collection(db, "groups"), {
      name,
      description,
      ownerId,
      members: [ownerId],
      status: "ongoing",
      startDate: startDate || null,
      endDate: endDate || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Automatically create a group chat room for this travel group
    await messageService.createGroupRoom(groupRef.id, name, [ownerId]);

    return groupRef.id;
  },

  // Get group details
  async getGroup(groupId: string): Promise<Group | null> {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (groupDoc.exists()) {
      return { id: groupDoc.id, ...groupDoc.data() } as Group;
    }
    return null;
  },

  // Get all groups for a user
  async getUserGroups(uid: string): Promise<Group[]> {
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
  },

  // Invite a member by email (Simulated for now by creating a notification if user exists)
  async inviteMemberByEmail(groupId: string, email: string, fromUid: string): Promise<void> {
    // 1. Find user by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("해당 이메일을 사용하는 사용자를 찾을 수 없습니다.");
    }

    const targetUser = querySnapshot.docs[0].data();
    const targetUid = querySnapshot.docs[0].id;
    const group = await this.getGroup(groupId);

    if (!group) throw new Error("그룹을 찾을 수 없습니다.");
    if (group.members.includes(targetUid)) {
      throw new Error("이미 그룹에 소속된 멤버입니다.");
    }

    // 2. Create notification for the target user
    const fromProfile = await userService.getUserProfile(fromUid);
    await notificationService.createNotification({
      uid: targetUid,
      type: "group_invite",
      fromUid,
      fromNickname: fromProfile?.nickname || "알 수 없음",
      fromAvatarUrl: fromProfile?.avatarUrl || "",
      postId: groupId, // Use postId field for groupId ref
      content: `${group.name} 그룹에 초대되었습니다.`
    });
  },

  // Accept group invitation
  async acceptInvitation(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    const roomRef = doc(db, "chatRooms", groupId);
    
    // Update Group members
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    // Update Chat Room participants (redundant but helps with unread counts and UI)
    try {
      await updateDoc(roomRef, {
        participants: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      // If room doesn't exist, it's fine. 
    }
  },

  // Update group status
  async updateGroupStatus(groupId: string, status: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    try {
      await updateDoc(groupRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating group status:", error);
      throw error;
    }
  },

  /**
   * Update the status of a specific settlement split between two users
   */
  async updateSplitState(groupId: string, fromUserId: string, toUserId: string, state: 'requested' | 'paid' | null): Promise<void> {
    try {
      const groupRef = doc(db, "groups", groupId);
      const splitKey = `${fromUserId}_${toUserId}`;
      const updateData: Record<string, any> = {};
      
      if (state === null) {
        updateData[`splitStates.${splitKey}`] = deleteField();
      } else {
        updateData[`splitStates.${splitKey}`] = state;
      }
      
      await updateDoc(groupRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating split state:", error);
      throw error;
    }
  },

  // Update group info
  async updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Delete a group
  async deleteGroup(groupId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    const roomRef = doc(db, "chatRooms", groupId);
    
    // Batch delete expenses
    const expensesRef = collection(db, "expenses");
    const q = query(expensesRef, where("groupId", "==", groupId));
    const expensesSnap = await getDocs(q);
    
    const batch = writeBatch(db);
    expensesSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    batch.delete(groupRef);
    batch.delete(roomRef);
    
    await batch.commit();
  },

  // Leave a group
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    const roomRef = doc(db, "chatRooms", groupId);
    
    // Remove from group
    const { arrayRemove } = await import("firebase/firestore");
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
    
    // Remove from chatroom
    try {
      await updateDoc(roomRef, {
        participants: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      // Ignore if room doesn't exist
    }
  },

  // Transfer Group Owner
  async transferGroupOwner(groupId: string, newOwnerId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      ownerId: newOwnerId,
      updatedAt: serverTimestamp()
    });
  }
};

