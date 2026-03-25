export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[]; // array of uids
  ownerId: string;
  status?: 'ongoing' | 'completed'; // Travel group status
  settlementStatus?: 'ongoing' | 'completed'; // Settlement specific status
  startDate?: string;
  endDate?: string;
  splitStates?: Record<string, 'requested' | 'paid'>; // Tracks settlement status between participants (fromUserId_toUserId)
  createdAt: any;
  updatedAt?: any;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  fromUid: string;
  fromNickname: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}
