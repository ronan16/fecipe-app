// src/screens/evaluator/EvaluationsListScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { EvaluatorStackParamList } from "../../navigation/EvaluatorDrawer";

interface EvalItem {
  evaluationId: string;
  trabalhoId: string;
  titulo: string;
  total: number;
}

type Props = {
  navigation: NativeStackNavigationProp<
    EvaluatorStackParamList,
    "EvaluatedList"
  >;
};

export default function EvaluationsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<EvalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) get all avaliações deste avaliador
        const snap = await getDocs(
          query(
            collection(firestore, "avaliacoes"),
            where("avaliadorId", "==", user!.uid)
          )
        );

        const list: EvalItem[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          // compute total = sum of data.notas
          const total = Object.values<number>(data.notas || {}).reduce(
            (a, b) => a + b,
            0
          );
          // fetch project title
          const projSnap = await getDoc(
            doc(firestore, "trabalhos", data.trabalhoId)
          );
          const titulo = projSnap.exists()
            ? (projSnap.data() as any).titulo
            : "";

          list.push({
            evaluationId: d.id,
            trabalhoId: data.trabalhoId,
            titulo,
            total,
          });
        }
        setItems(list);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Erro ao carregar avaliações",
          text2: error.message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }
  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Você ainda não avaliou nenhum trabalho.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.evaluationId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.titulo}</Text>
            <Text>Total Atribuído: {item.total.toFixed(2)}</Text>
            <Button
              title="Editar Avaliação"
              onPress={() =>
                navigation.navigate("Evaluate", {
                  trabalhoId: item.trabalhoId,
                  titulo: item.titulo,
                  evaluationId: item.evaluationId,
                })
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
