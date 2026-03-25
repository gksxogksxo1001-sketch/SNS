import { db } from "./config";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  limit,
  writeBatch 
} from "firebase/firestore";
import { Notification, NotificationType } from "@/types/notification";

export const notificationService = {
  // Create a notification
  async createNotification(data: {
    uid: string;
    type: NotificationType;
    fromUid: string;
    fromNickname: string;
    fromAvatarUrl: string | null;
    postId?: string;
    postImage?: string;
    content?: string;
  }): Promise<void> {
    console.log("[notificationService] Creating notification:", data.type, "from:", data.fromUid, "to:", data.uid);
    
    // Avoid self-notifications
    if (data.uid === data.fromUid) {
      console.log("[notificationService] Notification skipped: self-action");
      return;
    }

    try {
      // Sanitize data: remove undefined values as Firestore doesn't allow them
      const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
      }));

      await addDoc(collection(db, "notifications"), {
        ...sanitizedData,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      console.log("[notificationService] Notification created successfully");
    } catch (error) {
      console.error("[notificationService] Failed to create notification:", error);
    }
  },

  // Subscribe to user's notifications
  subscribeToNotifications(uid: string, callback: (notifications: Notification[]) => void, onError?: (error: any) => void) {
    // Simplified query to avoid immediate composite index requirement
    // We will sort client-side in the callback
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", uid),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Client-side sort by createdAt desc
      const sorted = notifications.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      callback(sorted);
    }, (error) => {
      console.error("Notification subscription error:", error);
      if (onError) onError(error);
    });
  },

  // Mark all notifications as read
  async markAllAsRead(uid: string): Promise<void> {
    try {
      const q = query(
        collection(db, "notifications"),
        where("uid", "==", uid),
        where("isRead", "==", false)
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  },

  // Delete all notifications for a user
  async deleteAllNotifications(uid: string): Promise<void> {
    try {
      const q = query(
        collection(db, "notifications"),
        where("uid", "==", uid)
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  },

  // Mark a single notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  // Update a notification
  async updateNotification(notificationId: string, data: Partial<Notification>): Promise<void> {
    try {
      await updateDoc(doc(db, "notifications", notificationId), data);
    } catch (error) {
      console.error("Failed to update notification:", error);
    }
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  /**
   * Send settlement request notifications to multiple users
   */
  async sendSettlementNotifications(
    recipients: { uid: string; amount: number }[],
    fromUser: { uid: string; nickname: string; avatarUrl: string | null },
    groupName: string,
    groupId: string
  ): Promise<void> {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, "notifications");

    recipients.forEach((recipient) => {
      const newDocRef = doc(notificationsRef);
      batch.set(newDocRef, {
        uid: recipient.uid,
        type: "settlement_request", 
        fromUid: fromUser.uid,
        fromNickname: fromUser.nickname,
        fromAvatarUrl: fromUser.avatarUrl,
        groupId: groupId,
        content: `'${groupName}' 여행 정산 요청: ${recipient.amount.toLocaleString()}원을 확인해 주세요.`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
      console.log(`[notificationService] Sent ${recipients.length} settlement notifications`);
    } catch (error) {
      console.error("[notificationService] Failed to send settlement notifications:", error);
    }
  },

  async sendSettlementPaymentNotification(
    toUid: string,
    fromUser: { uid: string; nickname: string; avatarUrl: string | null },
    groupName: string,
    groupId: string,
    amount: number
  ): Promise<void> {
    try {
      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        uid: toUid,
        type: "settlement_pay",
        fromUid: fromUser.uid,
        fromNickname: fromUser.nickname,
        fromAvatarUrl: fromUser.avatarUrl,
        groupId: groupId,
        content: `'${groupName}' 정산 완료: ${amount.toLocaleString()}원 입금을 확인했습니다.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      console.log(`[notificationService] Sent settlement payment notification to ${toUid}`);
    } catch (error) {
      console.error("[notificationService] Failed to send settlement payment notification:", error);
    }
  }
};
