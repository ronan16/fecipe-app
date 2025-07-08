// src/screens/admin/AdminHome.tsx

import React from "react";
import { View, Button, StyleSheet } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminParamList } from "../../navigation/AdminStack";

type Props = {
  navigation: NativeStackNavigationProp<AdminParamList, "Home">;
};

export default function AdminHome({ navigation }: Props) {
  const { signOutUser } = useAuth();

  return (
    <View style={styles.container}>
      <Button
        title="Projetos"
        onPress={() => navigation.navigate("Projects")}
      />
      <Button
        title="Avaliadores"
        onPress={() => navigation.navigate("Evaluators")}
      />
      <Button
        title="Relatórios"
        onPress={() => navigation.navigate("Reports")}
      />
      <View style={styles.spacer} />
      <Button title="Sair" onPress={signOutUser} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  spacer: {
    height: 20,
  },
});
