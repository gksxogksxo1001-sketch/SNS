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
    });

    return () => unsubscribe();
  }, [setUser, setIsLoading]);

  return { user, isLoading };
};
