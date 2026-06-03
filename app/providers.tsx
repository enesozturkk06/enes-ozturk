"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthState, Student, SalonOwner } from "@/lib/types";
import { getSession, logout as doLogout } from "@/lib/auth";
import { ToastProvider } from "@/app/components/shared/Toast";

interface AuthCtx extends AuthState {
  setStudent:    (s: Student) => void;
  setAdmin:      () => void;
  setSalonOwner: (o: SalonOwner) => void;
  logout:        () => void;
  loaded:        boolean;
}

const EMPTY: AuthState = { role: null, student: null, isAdmin: false, salonOwner: null };

const Ctx = createContext<AuthCtx>({
  ...EMPTY,
  setStudent: () => {}, setAdmin: () => {}, setSalonOwner: () => {}, logout: () => {}, loaded: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(getSession());
    setLoaded(true);
  }, []);

  const setStudent    = (s: Student)    => setState({ role:"student",     student: s, isAdmin: false, salonOwner: null });
  const setAdmin      = ()              => setState({ role:"admin",       student: null, isAdmin: true, salonOwner: null });
  const setSalonOwner = (o: SalonOwner) => setState({ role:"salon_owner", student: null, isAdmin: false, salonOwner: o });
  const logout        = ()              => { doLogout(); setState(EMPTY); };

  return (
    <Ctx.Provider value={{ ...state, setStudent, setAdmin, setSalonOwner, logout, loaded }}>
      <ToastProvider>{children}</ToastProvider>
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
