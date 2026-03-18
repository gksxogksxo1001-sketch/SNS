export type NotificationType = "like" | "comment" | "friend_request" | "friend_accept";

export interface Notification {
  id: string;
  uid: string; // recipient
  type: NotificationType;
  fromUid: string;
  fromNickname: string;
  fromAvatarUrl: string | null;
  postId?: string;
  postImage?: string;
  content?: string;
  isRead: boolean;
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: "pending" | "accepted" | "declined";
  createdAt: any;
}
