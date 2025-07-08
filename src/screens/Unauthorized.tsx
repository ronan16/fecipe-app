import React from "react";
import { View, Text, Button } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function Unauthorized() {
  const { signOutUser } = useAuth();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        Acesso não autorizado
      </Text>
      <Button title="Sair" onPress={signOutUser} />
    </View>
  );
}
