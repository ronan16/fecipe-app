// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, firestore } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// 1) Defina a forma dos dados do contexto
interface AuthContextData {
  user: FirebaseUser | null;
  role: "admin" | "evaluator" | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

// 2) Crie o contexto
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// 3) Explícite que AuthProvider recebe children
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<"admin" | "evaluator" | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setUser(usr);

        // ajustar aqui:
        const snap = await getDoc(doc(firestore, "users", usr.email!));
        // Verifica se o documento existe e obtém o campo 'role'
        // Se não existir, assume que o usuário não tem papel definido
        setRole(snap.exists() ? (snap.data()!.role as any) : null);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    // aguardamos a promise do Firebase, mas não retornamos o resultado
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOutUser = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4) Hook para usar o contexto
export function useAuth(): AuthContextData {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
