import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | Date;
  isRead: boolean;
  type?: "text" | "settlement" | "storyReply";
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
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  likes?: string[]; // Array of User UIDs
}

export interface ChatRoom {
  id: string;
  participants: string[]; // User IDs of people in the room
  lastMessage?: {
    text: string;
    createdAt: Timestamp | Date;
    senderId: string;
  };
  updatedAt: Timestamp | Date;
}
