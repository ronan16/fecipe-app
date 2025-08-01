// src/screens/admin/EvaluatorsPerformanceReport.tsx

import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import {
  Text,
  Card,
  Badge,
  Button,
  useTheme,
  Divider,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../../services/firebase";
import { generatePDFReport } from "../../utils/pdfUtils";

interface UserRecord {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface Evaluation {
  id: string;
  trabalhoId: string;
  avaliadorId: string;
  evaluatorEmail?: string;
  notas: Record<string, number>;
  comentarios?: string;
  timestamp?: any;
}

interface Project {
  id: string;
  titulo: string;
}

export default function EvaluatorsPerformanceReport() {
  const theme = useTheme();
  const [evaluators, setEvaluators] = useState<UserRecord[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);
  const [filteredEvaluators, setFilteredEvaluators] = useState<UserRecord[]>(
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Carrega avaliadores
      const usersSnap = await getDocs(collection(firestore, "users"));
      const users: UserRecord[] = usersSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name || d.id,
          role: data.role || "evaluator",
          email: d.id,
        };
      });

      // Carrega avaliações
      const evalSnap = await getDocs(collection(firestore, "avaliacoes"));
      const evals: Evaluation[] = evalSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Carrega projetos para título
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projMap: Record<string, Project> = {};
      projSnap.docs.forEach((d) => {
        const data = d.data() as any;
        projMap[d.id] = { id: d.id, titulo: data.titulo };
      });

      setEvaluators(users);
      setEvaluations(evals);
      setProjectsMap(projMap);
      setFilteredEvaluators(users);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar dados",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const computeEvaluatorStats = (evaluator: UserRecord) => {
    const theirEvals = evaluations.filter(
      (e) => e.avaliadorId === evaluator.id
    );
    const count = theirEvals.length;
    let avgScore = 0;
    if (count > 0) {
      const totals = theirEvals.map((e) =>
        Object.values(e.notas || {}).reduce((a, b) => a + b, 0)
      );
      avgScore = totals.reduce((a, b) => a + b, 0) / totals.length;
    }
    const projectsEvaluated = Array.from(
      new Set(theirEvals.map((e) => e.trabalhoId))
    );
    return {
      count,
      avgScore,
      projectsEvaluated,
    };
  };

  const handleExportPDF = () => {
    const payload = filteredEvaluators.map((ev) => {
      const stats = computeEvaluatorStats(ev);
      return {
        name: ev.name,
        email: ev.email,
        totalEvaluations: stats.count,
        averageScore: stats.avgScore,
        projects: stats.projectsEvaluated.map(
          (pid) => projectsMap[pid]?.titulo || pid
        ),
      };
    });
    generatePDFReport(payload, {
      title: "Desempenho dos Avaliadores",
      subtitle: `Total de avaliadores: ${filteredEvaluators.length}`,
    });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.header}>
        📋 Desempenho dos Avaliadores
      </Text>

      <Text variant="bodyMedium" style={styles.sub}>
        Aqui você vê quantas avaliações cada avaliador fez, média de notas e os
        projetos avaliados.
      </Text>

      <Button
        mode="contained"
        onPress={handleExportPDF}
        style={styles.exportBtn}
      >
        Exportar em PDF
      </Button>

      {filteredEvaluators.map((evaluator) => {
        const { count, avgScore, projectsEvaluated } =
          computeEvaluatorStats(evaluator);
        return (
          <Card key={evaluator.id} style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium">{evaluator.name}</Text>
                  <Text variant="bodySmall" style={styles.small}>
                    {evaluator.email}
                  </Text>
                  <Text variant="bodySmall" style={styles.small}>
                    Total de avaliações: {count}
                  </Text>
                  <Text variant="bodySmall" style={styles.small}>
                    Média de pontuação: {avgScore.toFixed(2)}
                  </Text>
                </View>
                <Badge style={styles.badge}>{count}</Badge>
              </View>

              {projectsEvaluated.length ? (
                <>
                  <Divider style={{ marginVertical: 6 }} />
                  <Text variant="titleSmall" style={{ marginTop: 4 }}>
                    Projetos avaliados:
                  </Text>
                  {projectsEvaluated.map((pid) => (
                    <Text
                      key={pid}
                      variant="bodySmall"
                      style={styles.projectEntry}
                    >
                      • {projectsMap[pid]?.titulo || pid}
                    </Text>
                  ))}
                </>
              ) : (
                <Text variant="bodySmall" style={styles.small}>
                  Nenhuma avaliação realizada ainda.
                </Text>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  header: { marginBottom: 4, fontWeight: "700" },
  sub: { marginBottom: 12, color: "#555" },
  card: { marginBottom: 14, borderRadius: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
  },
  small: { fontSize: 12, color: "#555" },
  projectEntry: { marginLeft: 4, fontSize: 13 },
  exportBtn: { marginBottom: 12, borderRadius: 24 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
