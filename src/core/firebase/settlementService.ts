import { db } from "./config";
import { 
  collection, 
  doc, 
  addDoc,
  getDocs,
  query, 
  where,
  orderBy, 
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { Expense, SettlementGroup, SettlementSplit } from "@/types/settlement";

export const settlementService = {
  // Add a new expense
  async addExpense(expenseData: Omit<Expense, "id" | "date">): Promise<string> {
    const expensesRef = collection(db, "expenses");
    
    const newDoc = await addDoc(expensesRef, {
      ...expenseData,
      date: serverTimestamp(),
    });
    
    return newDoc.id;
  },

  // Listen to expenses for a specific group/trip
  subscribeToGroupExpenses(groupId: string, callback: (expenses: Expense[]) => void) {
    const expensesRef = collection(db, "expenses");
    const q = query(
      expensesRef,
      where("groupId", "==", groupId),
      orderBy("date", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      callback(expenses);
    });
  },

  // Calculate Dutch Pay splits based on a list of expenses
  calculateSplits(expenses: Expense[]): SettlementSplit[] {
    const balances: { [userId: string]: number } = {};

    // Calculate net balance for each user
    expenses.forEach(exp => {
      const splitAmount = exp.amount / exp.participants.length;

      // The person who paid getting money BACK (+)
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;

      // Everyone who participated owes money (-)
      exp.participants.forEach(participant => {
        balances[participant] = (balances[participant] || 0) - splitAmount;
      });
    });

    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    // Separate into who owes (debtors) and who is owed (creditors)
    Object.keys(balances).forEach(userId => {
      const balance = Math.round(balances[userId]); // Deal with floating point issues
      if (balance < 0) {
        debtors.push({ userId, amount: Math.abs(balance) });
      } else if (balance > 0) {
        creditors.push({ userId, amount: balance });
      }
    });

    const splits: SettlementSplit[] = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    // Greedy algorithm to settle debts
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0) {
        splits.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: settleAmount
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return splits;
  }
};
