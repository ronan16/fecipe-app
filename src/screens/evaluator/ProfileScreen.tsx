import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { auth, firestore } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "./ResetPasswordScreen";
import type { EvaluatorStackParamList } from "../../navigation/EvaluatorStack";
import Toast from "react-native-toast-message";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  // Carrega nome do Firestore
  useEffect(() => {
    (async () => {
      if (user?.email) {
        const snap = await getDoc(doc(firestore, "users", user.email));
        setName(snap.data()?.name ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: "Nome não pode ficar em branco",
      });
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(firestore, "users", user!.email!), {
        name: name.trim(),
      });
      Toast.show({
        type: "success",
        text1: "Atualizado",
        text2: "Nome alterado com sucesso",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Email (não editável)</Text>
      <Text style={styles.text}>{user?.email}</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Button title="Salvar Nome" onPress={handleUpdate} />

      <View style={styles.spacer} />
      <Button
        title="Redefinir Senha"
        onPress={() => navigation.navigate("ResetPassword")}
      />
      <View style={styles.spacer} />
      <Button title="Sair" onPress={handleSignOut} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontWeight: "bold", marginTop: 12 },
  text: { marginBottom: 12 },
  input: {
    marginBottom: 12,
    borderBottomWidth: 1,
    padding: 8,
  },
  spacer: { height: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
