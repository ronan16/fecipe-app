// src/screens/EvaluationScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { EvaluatorStackParamList } from "../navigation/EvaluatorStack";
import { useAuth } from "../contexts/AuthContext";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../services/firebase";

type Props = {
  route: RouteProp<EvaluatorStackParamList, "Evaluate">;
  navigation: any;
};

export default function EvaluationScreen({ route, navigation }: Props) {
  const { trabalhoId, titulo } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [numCriteria, setNumCriteria] = useState(9);
  const [notas, setNotas] = useState<number[]>([]);
  const [comentarios, setComentarios] = useState<string>("");

  // 1) Fetch project to decide # de critérios
  useEffect(() => {
    (async () => {
      try {
        const docSnap = await getDoc(doc(firestore, "trabalhos", trabalhoId));
        if (!docSnap.exists()) {
          Alert.alert("Erro", "Projeto não encontrado");
          navigation.goBack();
          return;
        }
        const { categoria } = docSnap.data() as any;
        // IFTECH e Robótica têm 6 critérios, outras modalidades 9
        setNumCriteria(
          categoria === "IFTECH" || categoria === "Robótica" ? 6 : 9
        );
        // inicializa notas com zeros
        setNotas(
          Array(
            categoria === "IFTECH" || categoria === "Robótica" ? 6 : 9
          ).fill(0)
        );
      } catch (err: any) {
        Alert.alert("Erro ao carregar projeto", err.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [trabalhoId, navigation]);

  // 2) Atualiza uma nota específica
  const handleNotaChange = (idx: number, value: string) => {
    const num = parseFloat(value.replace(",", "."));
    const novo = [...notas];
    novo[idx] = isNaN(num) ? 0 : num;
    setNotas(novo);
  };

  // 3) Valida e salva
  const handleSubmit = async () => {
    // validação: todas as notas > 0?
    for (let i = 0; i < numCriteria; i++) {
      if (notas[i] === null || notas[i] === undefined) {
        Alert.alert("Erro", `Preencha a nota do Critério ${i + 1}`);
        return;
      }
    }
    setLoading(true);
    try {
      // formata objeto notas { C1: x, C2: y, ... }
      const notasObj: Record<string, number> = {};
      notas.forEach((n, i) => (notasObj[`C${i + 1}`] = n));

      await addDoc(collection(firestore, "avaliacoes"), {
        trabalhoId,
        avaliadorId: user!.uid,
        notas: notasObj,
        comentarios,
        timestamp: serverTimestamp(),
      });
      Alert.alert("Sucesso", "Avaliação registrada!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Erro ao salvar", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{titulo}</Text>

      {notas.map((nota, idx) => (
        <View key={idx} style={styles.field}>
          <Text style={styles.label}>Critério {idx + 1}</Text>
          <TextInput
            value={nota.toString()}
            onChangeText={(v) => handleNotaChange(idx, v)}
            keyboardType="numeric"
            style={styles.input}
            placeholder="0"
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Comentários (opcional)</Text>
        <TextInput
          value={comentarios}
          onChangeText={setComentarios}
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 100 }]}
          placeholder="Digite aqui seus comentários..."
        />
      </View>

      <Button title="Salvar Avaliação" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
  },
});
