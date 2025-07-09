// src/screens/admin/ProjectReportDetail.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminParamList, Project } from "../../navigation/AdminStack";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Toast from "react-native-toast-message";

type Props = NativeStackScreenProps<AdminParamList, "ProjectReportDetail">;

const weights = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const z = 2.5;

export default function ProjectReportDetail({ route }: Props) {
  const { project } = route.params;
  const [evals, setEvals] = useState<
    {
      avaliadorId: string;
      notas: Record<string, number>;
      comentarios?: string;
    }[]
  >([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvals = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(firestore, "avaliacoes"),
            where("trabalhoId", "==", project.id)
          )
        );
        const list = snap.docs.map(
          (d) =>
            d.data() as {
              avaliadorId: string;
              notas: Record<string, number>;
              comentarios?: string;
            }
        );
        setEvals(list);

        if (list.length > 0) {
          // Determine number of criteria
          const k =
            project.categoria === "IFTECH" || project.categoria === "Robótica"
              ? 6
              : 9;

          // Compute standardized & weighted scores
          const perEvaluatorTotals: number[] = list.map(() => 0);
          for (let i = 1; i <= k; i++) {
            const key = `C${i}`;
            const values = list.map((e) => e.notas[key] || 0);
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const sd =
              Math.sqrt(
                values
                  .map((v) => (v - mean) ** 2)
                  .reduce((sum, v) => sum + v, 0) / values.length
              ) || 1;
            const weight = weights[i - 1];
            values.forEach((v, idx) => {
              const standardized = (v - mean) / sd + z;
              perEvaluatorTotals[idx] += standardized * weight;
            });
          }

          // Sum all evaluators' totals and average
          const totalSum = perEvaluatorTotals.reduce((a, b) => a + b, 0);
          setFinalScore(totalSum / perEvaluatorTotals.length);
        } else {
          setFinalScore(0);
        }
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: "Erro ao carregar relatório",
          text2: err.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvals();
  }, [project.id, project.categoria]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{project.titulo}</Text>
      <Text style={styles.subHeader}>Nota Final: {finalScore?.toFixed(2)}</Text>

      <FlatList
        data={evals}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={evals.length === 0 ? styles.centered : undefined}
        ListEmptyComponent={
          <Text>Nenhuma avaliação encontrada para este projeto.</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Avaliação {index + 1} – {item.avaliadorId}
            </Text>
            {Object.entries(item.notas).map(([crit, val]) => (
              <Text key={crit}>
                {crit}: {val}
              </Text>
            ))}
            {item.comentarios ? (
              <Text style={styles.comment}>Comentário: {item.comentarios}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  comment: {
    marginTop: 8,
    fontStyle: "italic",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
