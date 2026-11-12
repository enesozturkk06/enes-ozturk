"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Mevcut öğrenci oturumunu sessizce yeniden doğrular — "network-error"
  // durumunda hiçbir şey yapmaz (mevcut oturum korunur, kullanıcı rahatsız
  // edilmez). `online`/`pageshow` olaylarından çağrılır (bkz. aşağıdaki effect).
  const revalidateStudent = useCallback(() => {
    const current = stateRef.current;
    if (current.role !== "student" || !current.student) return;
    verifyAndRefreshStudent(current.student).then(result => {
      if (result.status === "ok") {
        setState({ role: "student", student: result.student, isAdmin: false, salonOwner: null });
      } else if (result.status === "not-found") {
        doLogout();
        setState(EMPTY);
      }
    });
  }, []);

  useEffect(() => {
    const session = getSession();
    setState(session);

    // Öğrenci session'ı varsa Supabase'den doğrula (mock/eski ID'leri temizler)
    if (session.role === "student" && session.student) {
      verifyAndRefreshStudent(session.student).then(result => {
        if (result.status === "ok") {
          setState({ role: "student", student: result.student, isAdmin: false, salonOwner: null });
        } else if (result.status === "not-found") {
          // Öğrenci Supabase'de gerçekten yok (silinmiş/pasif) → logout
          doLogout();
          setState(EMPTY);
        }
        // "network-error": doğrulama isteği başarısız oldu (ağ/timeout/sunucu) —
        // öğrencinin var olup olmadığını BİLEMİYORUZ, bu yüzden oturumdan ATMIYORUZ.
        // `state` zaten yukarıda session (önbellekteki öğrenci) ile set edildi,
        // kullanıcı mevcut verisiyle uygulamayı kullanmaya devam edebilir.
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);  // eslint-disable-line

  // İnternet geri geldiğinde (`online`) VEYA sayfa iOS Safari'nin bfcache'inden
  // dondurulmuş haliyle geri geldiğinde (`pageshow` + `persisted`) öğrenci
  // oturumunu sessizce yeniden doğrula — deaktive edilmiş bir öğrenci, hiç
  // gelmeyebilecek bir sonraki tam sayfa yenilemesini beklemeden yakalanır.
  useEffect(() => {
    const onOnline = () => revalidateStudent();
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) revalidateStudent(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [revalidateStudent]);

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
