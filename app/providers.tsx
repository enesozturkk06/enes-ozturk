"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthState, Student, SalonOwner } from "@/lib/types";
import { getSession, logout as doLogout, verifyAndRefreshStudent } from "@/lib/auth";
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
    const session = getSession();
    setState(session);

    // Öğrenci session'ı varsa Supabase'den doğrula (mock/eski ID'leri temizler)
    if (session.role === "student" && session.student) {
      verifyAndRefreshStudent(session.student).then(fresh => {
        if (fresh) {
          setState({ role: "student", student: fresh, isAdmin: false, salonOwner: null });
        } else {
          // Öğrenci Supabase'de yok → logout
          doLogout();
          setState(EMPTY);
        }
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);  // eslint-disable-line

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
