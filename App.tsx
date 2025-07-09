// App.tsx
import React from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthStack from "./src/navigation/AuthStack";
import AdminStack from "./src/navigation/AdminStack";
import EvaluatorDrawer from "./src/navigation/EvaluatorDrawer";

function RootNavigator() {
  const { user, role } = useAuth();
  if (!user) return <AuthStack />;
  return role === "admin" ? <AdminStack /> : <EvaluatorDrawer />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <Toast />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
