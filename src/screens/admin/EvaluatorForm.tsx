// src/screens/admin/EvaluatorForm.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Card,
  TextInput,
  Button,
  Title,
  HelperText,
  useTheme,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { auth, firestore } from "../../services/firebase";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { setDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminParamList, Evaluator } from "../../navigation/AdminStack";

type Props = NativeStackScreenProps<AdminParamList, "EvaluatorForm">;

interface FormState {
  name: string;
  email: string;
  password: string;
}

const initialState: FormState = { name: "", email: "", password: "" };

export default function EvaluatorForm({ route, navigation }: Props) {
  const theme = useTheme();
  const evaluator = route.params?.evaluator as Evaluator | undefined;

  const [data, setData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);

  // Limpa erros quando entra
  useFocusEffect(useCallback(() => setErrors({}), []));

  // Carrega dados no modo edição
  useEffect(() => {
    if (evaluator) {
      (async () => {
        const snap = await getDoc(doc(firestore, "users", evaluator.id));
        if (snap.exists()) {
          const usr = snap.data() as any;
          setData({ name: usr.name || "", email: evaluator.id, password: "" });
        }
      })();
    }
  }, [evaluator]);

  const validate = () => {
    const errs: Partial<FormState> = {};
    if (!data.name.trim()) errs.name = "Nome é obrigatório";
    if (!data.email.trim()) errs.email = "Email é obrigatório";
    if (!evaluator && !data.password.trim())
      errs.password = "Senha é obrigatória";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      if (evaluator) {
        // Atualiza apenas o nome
        await updateDoc(doc(firestore, "users", evaluator.id), {
          name: data.name.trim(),
        });
        // Se senha preenchida, envia link
        if (data.password.trim()) {
          await sendPasswordResetEmail(auth, data.email.trim());
          Toast.show({ type: "success", text1: "Link de senha enviado" });
        } else {
          Toast.show({ type: "success", text1: "Avaliador atualizado" });
        }
      } else {
        // Cria credencial no Auth e no Firestore
        const cred = await createUserWithEmailAndPassword(
          auth,
          data.email.trim(),
          data.password.trim()
        );
        await setDoc(doc(firestore, "users", cred.user.email!), {
          name: data.name.trim(),
          role: "evaluator",
        });
        Toast.show({ type: "success", text1: "Avaliador criado" });
      }
      navigation.goBack();
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.header}>
          {evaluator ? "Editar Avaliador" : "Novo Avaliador"}
        </Title>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Nome"
              value={data.name}
              onChangeText={(v) => setData((d) => ({ ...d, name: v }))}
              mode="outlined"
              error={!!errors.name}
              style={styles.field}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label="Email"
              value={data.email}
              onChangeText={(v) => setData((d) => ({ ...d, email: v }))}
              mode="outlined"
              keyboardType="email-address"
              editable={!evaluator}
              error={!!errors.email}
              style={styles.field}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>

            {!evaluator && (
              <>
                <TextInput
                  label="Senha"
                  value={data.password}
                  onChangeText={(v) => setData((d) => ({ ...d, password: v }))}
                  mode="outlined"
                  secureTextEntry
                  error={!!errors.password}
                  style={styles.field}
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>
              </>
            )}
          </Card.Content>
        </Card>

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 20 }}
            color={theme.colors.primary}
          />
        ) : (
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.saveContent}
          >
            {evaluator ? "Atualizar" : "Criar"}
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { textAlign: "center", marginBottom: 16 },
  card: { borderRadius: 8, marginBottom: 16 },
  field: { marginBottom: 8, backgroundColor: "#fff" },
  saveButton: { borderRadius: 24 },
  saveContent: { paddingVertical: 6 },
});
