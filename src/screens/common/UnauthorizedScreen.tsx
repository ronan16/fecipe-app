import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function UnauthorizedScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Acesso negado</Text>
      <Button title="Voltar" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, marginBottom: 16 },
});
