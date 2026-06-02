"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthState, Student } from "@/lib/types";
import { getSession, logout as doLogout } from "@/lib/auth";

interface AuthCtx extends AuthState {
  setStudent: (s: Student) => void;
  setAdmin: () => void;
  logout: () => void;
  loaded: boolean;
}

const Ctx = createContext<AuthCtx>({
  role: null, student: null, isAdmin: false,
  setStudent: () => {}, setAdmin: () => {}, logout: () => {}, loaded: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ role: null, student: null, isAdmin: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = getSession();
    setState(s);
    setLoaded(true);
  }, []);

  const setStudent = (s: Student) =>
    setState({ role: "student", student: s, isAdmin: false });

  const setAdmin = () =>
    setState({ role: "admin", student: null, isAdmin: true });

  const logout = () => {
    doLogout();
    setState({ role: null, student: null, isAdmin: false });
  };

  return (
    <Ctx.Provider value={{ ...state, setStudent, setAdmin, logout, loaded }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
