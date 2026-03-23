import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from "firebase/firestore";
import { db } from "./config";
import { Post } from "@/types/post";
import { Group } from "@/types/group";
import { groupService } from "./groupService";
import { SettlementGroup, SettlementSplit } from "@/types/settlement";

export const settlementService = {
  /**
   * Calculate settlement balances for a specific group based on posts
   */
  async calculateGroupSettlement(groupId: string): Promise<{
    totalAmount: number;
    balances: Record<string, number>;
    splits: SettlementSplit[];
    memberCount: number;
  }> {
    // 1. Get Group info to know members
    const group = await groupService.getGroup(groupId);
    if (!group) throw new Error("Group not found");
    
    const members = group.members;
    const memberCount = members.length;
    
    // 2. Fetch all posts associated with this groupId
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() } as Post);
    });
    
    // 3. Aggregate expenses
    let totalAmount = 0;
    const paidAmounts: Record<string, number> = {}; // amount each member paid
    
    // Initialize paidAmounts for all members
    members.forEach((uid: string) => paidAmounts[uid] = 0);
    
    posts.forEach(post => {
      const amount = post.totalExpense || 0;
      totalAmount += amount;
      
      const paidBy = post.user.uid;
      if (members.includes(paidBy)) {
        paidAmounts[paidBy] += amount;
      } else {
        // If the payer is not in the group anymore, or somehow different
        // We might need a special logic, but for now just skip or assign to first member
        console.warn(`[settlementService] Post by ${paidBy} found in group ${groupId} but user not in members list.`);
      }
    });
    
    // 4. Calculate individual balances (amount paid - amount should pay)
    const shouldPay = totalAmount / (memberCount || 1);
    const balances: Record<string, number> = {};
    
    members.forEach((uid: string) => {
      balances[uid] = paidAmounts[uid] - shouldPay;
    });
    
    // 5. Generate splits (who owes whom)
    const splits: SettlementSplit[] = [];
    const debtors = members
      .filter((uid: string) => balances[uid] < 0)
      .sort((a: string, b: string) => balances[a] - balances[b]); // Most negative first
    
    const creditors = members
      .filter((uid: string) => balances[uid] > 0)
      .sort((a: string, b: string) => balances[b] - balances[a]); // Most positive first
      
    let dIdx = 0;
    let cIdx = 0;
    
    // Temporary work arrays
    const tempBalances = { ...balances };
    
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      
      const toPay = Math.min(Math.abs(tempBalances[debtor]), tempBalances[creditor]);
      
      if (toPay > 0.01) { // Skip tiny amounts
        splits.push({
          fromUserId: debtor,
          toUserId: creditor,
          amount: toPay
        });
      }
      
      tempBalances[debtor] += toPay;
      tempBalances[creditor] -= toPay;
      
      if (Math.abs(tempBalances[debtor]) < 0.01) dIdx++;
      if (Math.abs(tempBalances[creditor]) < 0.01) cIdx++;
    }
    
    return {
      totalAmount,
      balances,
      splits,
      memberCount
    };
  },

  /**
   * Get all groups for a user with calculated settlement summaries
   */
  async getUserSettlementOverview(userId: string): Promise<any[]> {
    const userGroups = await groupService.getUserGroups(userId);
    
    const summaries = await Promise.all(userGroups.map(async (group) => {
      try {
        const settlement = await this.calculateGroupSettlement(group.id);
        return {
          id: group.id,
          name: group.name,
          date: "최근 여행", // In real app, get from group duration or last post
          participants: group.members,
          status: "ongoing", // Default to ongoing
          totalAmount: settlement.totalAmount,
          myBalance: settlement.balances[userId] || 0
        };
      } catch (err) {
        console.error(`Failed to summarize group ${group.id}:`, err);
        return null;
      }
    }));
    
    return summaries.filter(s => s !== null);
  }
};
