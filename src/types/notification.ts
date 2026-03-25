export type NotificationType = "like" | "comment" | "friend_request" | "friend_accept" | "story_like" | "group_invite" | "settlement_request" | "settlement_pay";

export interface Notification {
  id: string;
  uid: string; // recipient
  type: NotificationType;
  fromUid: string;
  fromNickname: string;
  fromAvatarUrl: string | null;
  postId?: string;
  groupId?: string;
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
