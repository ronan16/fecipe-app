// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Text,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: "error", text1: "Preencha email e senha" });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // salva a preferência
      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      // não precisa navegar: o onAuthStateChanged cuidará disso
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao entrar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" style={styles.loader} />}
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      {/* Switch "Mantenha-me conectado" */}
      <View style={styles.rememberRow}>
        <Switch value={rememberMe} onValueChange={setRememberMe} />
        <Text style={styles.rememberText}>Mantenha-me conectado</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleLogin}
        disabled={loading}
        contentStyle={{ paddingVertical: 8 }}
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16 },
  loader: { marginBottom: 20 },
  input: { marginBottom: 12 },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
