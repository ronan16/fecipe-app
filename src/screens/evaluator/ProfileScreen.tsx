// src/screens/evaluator/ProfileScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Card, TextInput, Button, Title, Paragraph } from "react-native-paper";
import Toast from "react-native-toast-message";
import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../navigation/EvaluatorDrawer";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export default function ProfileScreen() {
  const { user, signOutUser } = useAuth();
  const navigation = useNavigation<Props["navigation"]>();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  // Carrega nome e email ao focar a tela
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user?.email) return;
        try {
          const snap = await getDoc(doc(firestore, "users", user.email));
          if (active && snap.exists()) {
            setName(snap.data().name);
          }
        } catch (err: any) {
          Toast.show({
            type: "error",
            text1: "Erro ao carregar perfil",
            text2: err.message,
          });
        } finally {
          active && setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [user])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Nome não pode ficar em branco" });
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(firestore, "users", user!.email!), {
        name: name.trim(),
      });
      Toast.show({
        type: "success",
        text1: "Dados atualizados",
        text2: "Seu nome foi alterado com sucesso.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao salvar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    navigation.navigate("ResetPassword");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title>Meu Perfil</Title>
          <Paragraph>Email (não editável)</Paragraph>
          <TextInput
            mode="outlined"
            value={user?.email || ""}
            disabled
            style={styles.input}
          />
          <Paragraph>Nome</Paragraph>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSave} style={styles.button}>
            Salvar Nome
          </Button>

          <Button
            mode="outlined"
            onPress={handleResetPassword}
            style={styles.button}
          >
            Redefinir Senha
          </Button>

          <Button
            mode="text"
            onPress={signOutUser}
            textColor="#d32f2f"
            style={styles.button}
          >
            Sair
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
  button: { marginTop: 8 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
