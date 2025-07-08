// src/components/LogoutButton.tsx

import React from "react";
import { Button, Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function LogoutButton() {
  const { signOutUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      Alert.alert("Erro ao sair", err.message);
    }
  };

  return <Button title="Sair" onPress={handleLogout} />;
}
