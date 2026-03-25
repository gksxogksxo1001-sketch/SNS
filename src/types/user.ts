export interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  visitedCountries: string[];
  friends: string[]; // array of uids
  closeFriends: string[]; // array of uids for manual selection
  travelStyle?: string; // 배낭여행, 미식, 휴양 등
  stats: {
    totalPosts: number;
    totalCountries: number;
  };
  createdAt: any;
  updatedAt: any;
}
