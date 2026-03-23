"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/core/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";

export const useAuth = () => {
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
      
      // Save to recent accounts if logged in
      if (user) {
        import("@/core/auth/accountManager").then(({ accountManager }) => {
          accountManager.saveAccount(user);
        });
      }
    });

    return () => unsubscribe();
  }, [setUser, setIsLoading]);

  return { user, isLoading };
};
