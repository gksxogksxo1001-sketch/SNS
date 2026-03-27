import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | Date;
  isRead: boolean;
  type?: "text" | "settlement" | "storyReply" | "postShare" | "settlementSummary" | "image" | "video";
  settlementData?: {
    title: string;
    amountToPay: number;      // Amount the OTHER person needs to pay (e.g. Total / 2)
    bankAccount: string;      // e.g. "신한 110-123-456789"
    isSettled?: boolean;      // Whether the money has been sent
  };
  storyData?: {
    mediaUrl: string;
    storyId: string;
  };
  postShareData?: {
    postId: string;
    postImage: string;
    postTitle?: string;
    authorName: string;
  };
  settlementSummaryData?: {
    groupId: string;
    groupName: string;
    totalAmount: number;
    splitCount: number;
  };
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  likes?: string[];
  readBy?: string[]; // Array of User UIDs who have read the message
  isEphemeral?: boolean; // Whether the message should disappear after reading
}

export interface ChatRoom {
  id: string;
  type: "direct" | "group";
  participants: string[]; // User IDs of people in the room
  name?: string;          // Group name if type is "group"
  groupImage?: string;    // Group avatar if type is "group"
  lastMessage?: {
    text: string;
    createdAt: Timestamp | Date;
    senderId: string;
  };
  unreadCount?: Record<string, number>; // { [userId]: count }
  updatedAt: Timestamp | Date;
}
