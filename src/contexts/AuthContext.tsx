// src/contexts/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { getDoc, doc } from "firebase/firestore";
import { firestore } from "../services/firebase";

// --- 1) Tipagem do contexto
interface AuthContextData {
  user: User | null;
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

// --- 2) Props do provider incluindo children
interface AuthProviderProps {
  children: ReactNode;
}

// --- 3) Cria o contexto
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// --- 4) Implementa o provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Observa mudanças de autenticação
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      if (usr) {
        // carrega role do Firestore (/users/{email})
        try {
          const udoc = await getDoc(doc(firestore, "users", usr.email!));
          setRole(udoc.exists() ? (udoc.data().role as string) : null);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  // Funcionalidade de login (delegada ao LoginScreen)
  const signIn = async (email: string, password: string) => {
    // Aqui você pode usar signInWithEmailAndPassword, mas
    // como fazemos direto no LoginScreen, deixamos vago
    // ou importamos e chamar aqui.
    throw new Error("Use o LoginScreen para autenticar");
  };

  // Sair
  const signOutUser = async () => {
    await firebaseSignOut(auth);
    // opcional: limpar quaisquer estados extras aqui
  };

  return (
    <AuthContext.Provider value={{ user, role, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- 5) Hook de consumo
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}
