// App.tsx
import React from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthStack from "./src/navigation/AuthStack";
import EvaluatorDrawer from "./src/navigation/EvaluatorDrawer";
import AdminDrawer from "./src/navigation/AdminDrawer";

function RootNavigator() {
  const { user, role } = useAuth();
  if (!user) return <AuthStack />;
  return role === "admin" ? <AdminDrawer /> : <EvaluatorDrawer />;
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
