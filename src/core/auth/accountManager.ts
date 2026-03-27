import { User } from "firebase/auth";

export interface StoredAccount {
  uid: string;
  loginId: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLogin: number;
}

const STORAGE_KEY = "hans-recent-accounts";

export const accountManager = {
  /**
   * Save current user to the recent accounts list
   */
  async saveAccount(user: any, loginId: string | null = null): Promise<void> {
    if (!user) return;

    try {
      const accounts = this.getAccounts();
      const existingIdx = accounts.findIndex(a => a.uid === user.uid);

      const accountData: StoredAccount = {
        uid: user.uid,
        loginId: loginId || (accounts[existingIdx]?.loginId ?? null),
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Date.now()
      };

      if (existingIdx > -1) {
        accounts[existingIdx] = accountData;
      } else {
        accounts.unshift(accountData);
      }

      // Limit to 5 accounts
      const limitedAccounts = accounts.slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedAccounts));
    } catch (error) {
      console.error("[accountManager] Failed to save account:", error);
    }
  },

  /**
   * Get list of recently logged in accounts
   */
  getAccounts(): StoredAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[accountManager] Failed to get accounts:", error);
      return [];
    }
  },

  /**
   * Remove an account from the list
   */
  removeAccount(uid: string): void {
    try {
      const accounts = this.getAccounts();
      const filtered = accounts.filter(a => a.uid !== uid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("[accountManager] Failed to remove account:", error);
    }
  },

  /**
   * Clear all stored accounts
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
