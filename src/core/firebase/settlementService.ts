import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "./config";
import { Post } from "@/types/post";
import { Group } from "@/types/group";
import { Expense } from "@/types/settlement";
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
    posts: Post[];
    expenses: any[];
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
    
    // 2.5 Fetch all expenses in the 'expenses' collection for this groupId
    const expensesRef = collection(db, "expenses");
    const eq = query(expensesRef, where("groupId", "==", groupId));
    const eSnapshot = await getDocs(eq);
    const expenses: any[] = [];
    eSnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });
    
    // 3. Aggregate expenses from both posts and settlement requests
    const paidAmounts: Record<string, number> = {}; // amount each member paid
    const totalShouldPay: Record<string, number> = {}; // amount each member should pay
    
    // Initialize for all members
    members.forEach((uid: string) => {
      paidAmounts[uid] = 0;
      totalShouldPay[uid] = 0;
    });
    
    let totalAmount = 0;

    // Process Posts (Default to splitting among all group members for now)
    posts.forEach(post => {
      const amount = post.totalExpense || 0;
      totalAmount += amount;
      
      const paidBy = post.user.uid;
      if (members.includes(paidBy)) {
        paidAmounts[paidBy] += amount;
      }

      // Split evenly among all current group members
      const splitAmount = amount / (members.length || 1);
      members.forEach(uid => {
        totalShouldPay[uid] += splitAmount;
      });
    });

    // Process Direct Expenses (Supports custom participants)
    expenses.forEach(exp => {
      const amount = exp.amount || 0;
      
      // Do not include 'Settlement Completed' (balancing payments) in the total group expense sum
      if (exp.title !== "정산 완료") {
        totalAmount += amount;
      }
      
      const paidBy = exp.paidBy;
      if (members.includes(paidBy)) {
        paidAmounts[paidBy] += amount;
      }

      // Split among specified participants, or all members if not specified
      const participants = (exp.participants && exp.participants.length > 0) 
        ? exp.participants 
        : members;
      
      const splitAmount = amount / (participants.length || 1);
      participants.forEach((uid: string) => {
        if (totalShouldPay[uid] !== undefined) {
          totalShouldPay[uid] += splitAmount;
        }
      });
    });
    
    // 4. Calculate individual balances (amount paid - amount should pay)
    const balances: Record<string, number> = {};
    members.forEach((uid: string) => {
      balances[uid] = Math.round((paidAmounts[uid] || 0) - (totalShouldPay[uid] || 0));
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
      
      if (toPay >= 1) { // Skip tiny amounts (1 KRW or less)
        splits.push({
          fromUserId: debtor,
          toUserId: creditor,
          amount: Math.round(toPay)
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
      memberCount,
      posts,
      expenses
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
          settlementStatus: group.settlementStatus || "ongoing",
          totalAmount: settlement.totalAmount,
          myBalance: settlement.balances[userId] || 0
        };
      } catch (err) {
        console.error(`Failed to summarize group ${group.id}:`, err);
        return null;
      }
    }));
    
    return summaries.filter(s => s !== null);
  },

  /**
   * Add a new expense (e.g. from chat settlement)
   */
  async addExpense(expense: Omit<Expense, "id">): Promise<string> {
    const expenseRef = await addDoc(collection(db, "expenses"), {
      ...expense,
      createdAt: serverTimestamp(),
    });
    return expenseRef.id;
  },

  /**
   * Mark a specific split as settled by creating a balancing payment
   */
  async markSplitAsSettled(groupId: string, fromUserId: string, toUserId: string, amount: number): Promise<void> {
    await this.addExpense({
      groupId,
      title: `정산 완료`,
      amount: Math.round(amount),
      paidBy: fromUserId,
      participants: [toUserId],
      category: "기타",
      date: new Date().toISOString()
    });
  },

  /**
   * Delete an expense entry
   */
  async deleteExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, "expenses", expenseId));
  }
};
