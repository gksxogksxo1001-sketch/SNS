export interface PostComment {
  id: string;
  postId: string;
  user: {
    uid: string;
    name: string;
    image?: string;
    group?: string;
  };
  content: string;
  createdAt: any;
}

export interface Post {
  id?: string;
  user: {
    uid: string;
    name: string;
    image?: string | null; // null 허용
    group?: string;
  };
  groupId?: string | null; // 소속 그룹 ID
  content: string;
  tags: string[];
  images: string[];
  location?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null; // null 허용
  expenses: {
    plane?: number;
    stay?: number;
    transport?: number;
    food?: number;
    other?: number;
  };
  totalExpense: number;
  visibility: "public" | "friends" | "group";
  likes: number;
  likedBy: string[]; // List of user UIDs who liked this post
  bookmarkedBy?: string[]; // List of user UIDs who bookmarked this post
  comments: number;
  createdAt: any; // firebase.firestore.Timestamp
}
