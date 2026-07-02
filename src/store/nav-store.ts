"use client";

import { create } from "zustand";
import type { NavKey } from "@/lib/constants";

interface NavState {
  active: NavKey;
  searchOpen: boolean;
  supportOpen: boolean;
  loginOpen: boolean;
  syncOpen: boolean;
  set: (key: NavKey) => void;
  setSearchOpen: (open: boolean) => void;
  setSupportOpen: (open: boolean) => void;
  setLoginOpen: (open: boolean) => void;
  setSyncOpen: (open: boolean) => void;
}

export const useNavStore = create<NavState>((set) => ({
  active: "dashboard",
  searchOpen: false,
  supportOpen: false,
  loginOpen: false,
  syncOpen: false,
  set: (active) => set({ active }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSupportOpen: (supportOpen) => set({ supportOpen }),
  setLoginOpen: (loginOpen) => set({ loginOpen }),
  setSyncOpen: (syncOpen) => set({ syncOpen }),
}));
