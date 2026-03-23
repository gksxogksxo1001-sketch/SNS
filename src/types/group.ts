export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[]; // array of uids
  ownerId: string;
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
