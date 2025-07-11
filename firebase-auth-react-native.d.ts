// firebase-auth-react-native.d.ts

declare module "@firebase/auth/react-native" {
  import { Persistence } from "firebase/auth";
  /**
   * Retorna o adaptador de persistência baseado em AsyncStorage para React Native.
   */
  export function getReactNativePersistence(storage: AsyncStorage): Persistence;
}
