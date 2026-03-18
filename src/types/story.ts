import { Timestamp } from "firebase/firestore";

export interface Story {
  id: string;
  userId: string;
  user: {
    uid: string;
    name: string;
    image: string;
  };
  mediaUrl: string;
  type: "image" | "video";
  createdAt: Timestamp | any;
  expiresAt: Timestamp | any;
  viewedBy: string[];
  likesCount: number;
  likedBy: string[];
}

export interface UserStoryGroup {
  userId: string;
  user: {
    uid: string;
    name: string;
    image: string;
  };
  stories: Story[];
  hasUnread: boolean;
}
