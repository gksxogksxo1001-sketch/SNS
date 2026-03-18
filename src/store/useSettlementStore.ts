import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense } from '@/types/settlement';

interface SetGroup {
  id: string;
  name: string;
  status: 'ongoing' | 'completed';
  date: string;
  participants: string[];
}

interface SettlementStore {
  expenses: (Expense & { date: string })[];
  groups: SetGroup[];
  addExpense: (expense: Omit<Expense, 'id' | 'date'> & { date: string }) => void;
  addGroup: (group: Omit<SetGroup, 'id'>) => void;
}

const INITIAL_EXPENSES = [
  { id: "e1", groupId: "g1", title: "해운대 오션뷰 숙소", amount: 150000, paidBy: "me", participants: ["me", "u2"], category: "숙박" as const, date: "2026-03-16T15:00:00" },
  { id: "e2", groupId: "g1", title: "광안리 회센터", amount: 90000, paidBy: "u2", participants: ["me", "u2"], category: "식비" as const, date: "2026-03-16T19:30:00" },
  { id: "e3", groupId: "g1", title: "택시비", amount: 12000, paidBy: "me", participants: ["me", "u2"], category: "교통" as const, date: "2026-03-17T10:15:00" },
];

const INITIAL_GROUPS: SetGroup[] = [
  { id: "g1", name: "부산 우정여행", status: "ongoing", date: "2026.03.16 - 03.17", participants: ["me", "u2", "u3"] },
  { id: "g2", name: "제주도 가족여행", status: "completed", date: "2026.02.10 - 02.13", participants: ["me", "u4", "u5", "u6"] }
];

export const useSettlementStore = create<SettlementStore>()(
  persist(
    (set) => ({
      expenses: INITIAL_EXPENSES.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      groups: INITIAL_GROUPS,
      
      addExpense: (expense) => set((state) => {
        const newExpense = { ...expense, id: `e${Date.now()}` };
        const newExpenses = [newExpense, ...state.expenses];
        
        // 가장 최근의 결제내역이 위로 올라오도록 (내림차순 정렬)
        newExpenses.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        
        return { expenses: newExpenses };
      }),

      addGroup: (group) => set((state) => {
        const newGroup = { ...group, id: `g${Date.now()}` };
        return { groups: [newGroup, ...state.groups] };
      }),
    }),
    {
      name: 'settlement-storage',
      partialize: (state) => ({ expenses: state.expenses, groups: state.groups }),
    }
  )
);
