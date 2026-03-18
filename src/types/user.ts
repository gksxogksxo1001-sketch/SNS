export interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  visitedCountries: string[];
  friends: string[]; // array of uids
  stats: {
    totalPosts: number;
    totalCountries: number;
  };
  createdAt: any;
  updatedAt: any;
}
