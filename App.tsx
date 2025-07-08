// App.tsx
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthStack from "./src/navigation/AuthStack";
import AdminStack from "./src/navigation/AdminStack";
import EvaluatorStack from "./src/navigation/EvaluatorStack";

function RootNavigator() {
  const { user, role } = useAuth();
  if (!user) return <AuthStack />;
  return role === "admin" ? <AdminStack /> : <EvaluatorStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
