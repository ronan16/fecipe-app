import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import Input from "../../components/Input";
import SubmitButton from "../../components/SubmitButton";
import { auth, firestore } from "../../services/firebase";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  setDoc,
  updateDoc,
  doc,
  DocumentData,
  getDoc,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminParamList, Evaluator } from "../../navigation/AdminStack";

type Props = NativeStackScreenProps<AdminParamList, "EvaluatorForm">;

interface FormState {
  name: string;
  email: string;
  password: string;
}

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
};

export default function EvaluatorForm({ route, navigation }: Props) {
  const evaluator = route.params?.evaluator as Evaluator | undefined;
  const [data, setData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);

  // Limpa erros ao focar
  useFocusEffect(
    useCallback(() => {
      setErrors({});
    }, [])
  );

  // Se estiver editando, carrega dados do Firestore
  useEffect(() => {
    if (evaluator) {
      (async () => {
        const snap = await getDoc(doc(firestore, "users", evaluator.id));
        const userData = snap.data() as DocumentData;
        setData({
          name: userData.name || "",
          email: evaluator.id,
          password: "",
        });
      })();
    }
  }, [evaluator]);

  const validate = () => {
    const errs: Partial<FormState> = {};
    if (!data.name.trim()) errs.name = "Nome obrigatório";
    if (!data.email.trim()) errs.email = "Email obrigatório";
    if (!evaluator && !data.password.trim())
      errs.password = "Senha obrigatória";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      if (evaluator) {
        // Atualização de nome
        await updateDoc(doc(firestore, "users", evaluator.id), {
          name: data.name.trim(),
        });
        // Se quiser enviar link de reset de senha
        if (data.password.trim()) {
          await sendPasswordResetEmail(auth, data.email);
          Alert.alert(
            "Senha",
            "Link de redefinição de senha enviado ao email do avaliador."
          );
        }
      } else {
        // Criação de usuário e doc no Firestore
        const cred = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        await setDoc(doc(firestore, "users", cred.user.email!), {
          name: data.name.trim(),
          role: "evaluator",
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Input
        label="Nome"
        value={data.name}
        onChangeText={(v) => setData((d) => ({ ...d, name: v }))}
        error={errors.name}
      />
      <Input
        label="Email"
        value={data.email}
        editable={!evaluator}
        onChangeText={(v) => setData((d) => ({ ...d, email: v }))}
        error={errors.email}
      />
      {!evaluator && (
        <Input
          label="Senha"
          value={data.password}
          secureTextEntry
          onChangeText={(v) => setData((d) => ({ ...d, password: v }))}
          error={errors.password}
        />
      )}
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <SubmitButton
          title={evaluator ? "Atualizar Avaliador" : "Criar Avaliador"}
          onPress={handleSave}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  loader: { marginTop: 24 },
});
