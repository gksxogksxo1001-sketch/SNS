import { Timestamp } from "firebase/firestore";

export type ExpenseCategory = "숙박" | "교통" | "식비" | "액티비티" | "기타";

export interface Expense {
  id: string;
  groupId: string; // ID of the travel group or trip
  title: string; // What was it for? (e.g., "해운대 횟집")
  amount: number;
  paidBy: string; // User ID who paid
  participants: string[]; // User IDs who should split this expense
  category: ExpenseCategory;
  date: Timestamp | Date | string;
}

export interface SettlementSplit {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface SettlementGroup {
  id: string;
  name: string;
  members: string[]; // User IDs
  totalExpenses: number;
  updatedAt: Timestamp | Date;
}
