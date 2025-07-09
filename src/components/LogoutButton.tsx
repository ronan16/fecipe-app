// src/components/LogoutButton.tsx

import React from "react";
import { Button, Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import Toast from "react-native-toast-message";

export default function LogoutButton() {
  const { signOutUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: err.message,
      });
    }
  };

  return <Button title="Sair" onPress={handleLogout} />;
}
