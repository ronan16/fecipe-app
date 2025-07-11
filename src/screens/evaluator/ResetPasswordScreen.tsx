// src/screens/evaluator/ResetPasswordScreen.tsx

import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import {
  Card,
  TextInput,
  Button,
  Title,
  Paragraph,
  ActivityIndicator,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

export default function ResetPasswordScreen() {
  const auth = getAuth();
  const user = auth.currentUser!;
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Toast.show({ type: "error", text1: "Preencha todos os campos" });
      return;
    }
    if (newPw !== confirmPw) {
      Toast.show({
        type: "error",
        text1: "Nova senha e confirmação não coincidem",
      });
      return;
    }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      Toast.show({
        type: "success",
        text1: "Senha alterada com sucesso!",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao redefinir senha",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title>Redefinir Senha</Title>
          <Paragraph>Digite sua senha atual</Paragraph>
          <TextInput
            mode="outlined"
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
            style={styles.input}
          />
          <Paragraph>Nova senha</Paragraph>
          <TextInput
            mode="outlined"
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            style={styles.input}
          />
          <Paragraph>Confirme a nova senha</Paragraph>
          <TextInput
            mode="outlined"
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleReset}
            disabled={loading}
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#fff" /> : "Salvar"}
          </Button>
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  card: { padding: 16, borderRadius: 8 },
  input: { marginBottom: 12, backgroundColor: "#f5f5f5" },
  button: { marginTop: 16 },
});
