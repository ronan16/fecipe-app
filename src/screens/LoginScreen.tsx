// src/screens/LoginScreen.tsx

import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
// 1) Importe o AuthStackParamList, que define apenas Login
import { AuthStackParamList } from "../navigation/AuthStack";
import Toast from "react-native-toast-message";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Preencha email e senha",
      });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // não precisa chamar navigation.replace(), o RootNavigator
      // vai detectar o auth state e trocar para Admin/Evaluator
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
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button
        title={loading ? "Entrando…" : "Entrar"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  loader: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    borderBottomWidth: 1,
    padding: 8,
  },
});
