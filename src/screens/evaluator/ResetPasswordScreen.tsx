import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

// Tipagem do stack de perfil
export type ProfileStackParamList = {
  Profile: undefined;
  ResetPassword: undefined;
};

type Props = NativeStackScreenProps<ProfileStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation }: Props) {
  const auth = getAuth();
  const user = auth.currentUser!;

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Toast.show({
        type: "error",
        text1: "Preencha todos os campos",
      });
      return;
    }
    if (newPw !== confirmPw) {
      Toast.show({
        type: "error",
        text1: "Erro: A nova senha e a confirmação não coincidem",
        text2: "Por favor, verifique e tente novamente.",
      });
      return;
    }
    setLoading(true);
    try {
      // 1) Reautentica com a senha atual
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);

      // 2) Atualiza a senha
      await updatePassword(user, newPw);

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Senha alterada com sucesso!",
      });
      // volta à tela anterior
      navigation.goBack();
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
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" />}
      <Text style={styles.label}>Senha Atual</Text>
      <TextInput
        value={currentPw}
        onChangeText={setCurrentPw}
        secureTextEntry
        style={styles.input}
      />
      <Text style={styles.label}>Nova Senha</Text>
      <TextInput
        value={newPw}
        onChangeText={setNewPw}
        secureTextEntry
        style={styles.input}
      />
      <Text style={styles.label}>Confirmar Nova Senha</Text>
      <TextInput
        value={confirmPw}
        onChangeText={setConfirmPw}
        secureTextEntry
        style={styles.input}
      />
      <Button
        title={loading ? "Aguardando..." : "Salvar Nova Senha"}
        onPress={handleReset}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  label: { marginTop: 12, marginBottom: 4, fontWeight: "bold" },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 8,
  },
});
