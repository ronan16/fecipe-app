// src/screens/admin/WinnersReport.tsx

import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import {
  Text,
  Card,
  Badge,
  Button,
  Chip,
  useTheme,
  Divider,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../../services/firebase";
import { generatePDFReport } from "../../utils/pdfUtils";

const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

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
  alunos?: string[];
  orientador?: string;
  turma?: string;
  anoSemestre?: string;
  categoria: string;
}

interface TopProject {
  id: string;
  titulo: string;
  categoria: string;
  finalScore: number;
  evaluations: Array<{
    evaluatorId: string;
    evaluatorEmail: string;
    evaluatorName: string;
    total: number;
  }>;
}

export default function WinnersReport() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [topByCategory, setTopByCategory] = useState<
    Record<string, TopProject[]>
  >({});
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const fetchUserName = useCallback(async (emailOrId: string) => {
    try {
      const snap = await getDoc(doc(firestore, "users", emailOrId));
      if (snap.exists()) {
        const data = snap.data() as any;
        return data.name || emailOrId;
      }
    } catch {}
    return emailOrId;
  }, []);

  const computeFinalScore = (project: Project, evals: Evaluation[]) => {
    if (!evals.length) return 0;
    const k = ["IFTECH", "Robótica"].includes(project.categoria) ? 6 : 9;
    const evalCount = evals.length;

    const perCriterion: number[][] = [];
    for (let i = 1; i <= k; i++) {
      const key = `C${i}`;
      perCriterion[i - 1] = evals.map((e) => e.notas[key] ?? 0);
    }

    const scoresPerEval = Array(evalCount).fill(0);
    for (let i = 0; i < k; i++) {
      const arr = perCriterion[i];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd =
        Math.sqrt(
          arr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
            arr.length
        ) || 1;
      arr.forEach((v, idx) => {
        const normalized = (v - mean) / sd + Z;
        const weight = CRITERIA_WEIGHTS[i] ?? 1;
        scoresPerEval[idx] += normalized * weight;
      });
    }

    const finalScore =
      scoresPerEval.reduce((a, b) => a + b, 0) / scoresPerEval.length;
    return finalScore;
  };

  const loadTop = useCallback(async () => {
    setLoading(true);
    try {
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projects: Project[] = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const cats = Array.from(new Set(projects.map((p) => p.categoria)));
      setCategories(cats);

      const result: Record<string, TopProject[]> = {};
      const userCache: Record<string, string> = {};

      for (const category of cats) {
        const projs = projects.filter((p) => p.categoria === category);
        const enriched: TopProject[] = [];

        for (const p of projs) {
          const evalSnap = await getDocs(
            query(
              collection(firestore, "avaliacoes"),
              where("trabalhoId", "==", p.id)
            )
          );
          const evalDocs = evalSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as Evaluation[];
          if (evalDocs.length === 0) continue;

          const finalScore = computeFinalScore(p, evalDocs);

          const evaluations = await Promise.all(
            evalDocs.slice(0, 3).map(async (e) => {
              const total = Object.values<number>(e.notas || {}).reduce(
                (a, b) => a + b,
                0
              );
              const evaluatorEmail = e.evaluatorEmail || e.avaliadorId;
              let evaluatorName = userCache[evaluatorEmail];
              if (!evaluatorName) {
                evaluatorName = await fetchUserName(evaluatorEmail);
                userCache[evaluatorEmail] = evaluatorName;
              }
              return {
                evaluatorId: e.avaliadorId,
                evaluatorEmail,
                evaluatorName,
                total,
              };
            })
          );

          while (evaluations.length < 3) {
            evaluations.push({
              evaluatorId: "none",
              evaluatorEmail: "Sem avaliador",
              evaluatorName: "Sem avaliador",
              total: 0,
            });
          }

          enriched.push({
            id: p.id,
            titulo: p.titulo,
            categoria: p.categoria,
            finalScore,
            evaluations,
          });
        }

        result[category] = enriched
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 3);
      }

      setTopByCategory(result);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar vencedores",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchUserName]);

  useEffect(() => {
    loadTop();
  }, [loadTop]);

  const filteredCategories = filterCat ? [filterCat] : categories;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleExportPDF = () => {
    const flatList: any[] = [];
    Object.entries(topByCategory).forEach(([cat, list]) => {
      list.forEach((p) => {
        flatList.push({
          categoria: cat,
          titulo: p.titulo,
          finalScore: p.finalScore,
          evaluations: p.evaluations,
        });
      });
    });
    generatePDFReport(flatList, { title: "Top 3 Vencedores por Categoria" });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.header}>
        🏆 Top 3 por Categoria
      </Text>

      <View style={styles.filterRow}>
        <Chip
          selected={!filterCat}
          onPress={() => setFilterCat(null)}
          style={styles.chip}
        >
          Todas
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c}
            selected={filterCat === c}
            onPress={() => setFilterCat(filterCat === c ? null : c)}
            style={styles.chip}
          >
            {c}
          </Chip>
        ))}
      </View>

      {filteredCategories.map((cat) => (
        <View key={cat} style={styles.section}>
          <Text variant="titleMedium" style={styles.categoryTitle}>
            {cat}
          </Text>
          {topByCategory[cat]?.map((p, idx) => (
            <Card key={p.id} style={styles.card} mode="elevated">
              <Card.Content>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={styles.projectTitle}>
                      {idx + 1}. {p.titulo}
                    </Text>
                    <View style={styles.scoreRow}>
                      <Badge style={styles.badge}>
                        {`Final: ${p.finalScore.toFixed(2)}`}
                      </Badge>
                    </View>
                  </View>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {p.evaluations.map((e, i) => (
                  <View key={i} style={styles.evalRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={styles.evalLabel}>
                        Avaliador {i + 1}: {e.evaluatorName}
                      </Text>
                      <Text variant="bodySmall" style={styles.evalSub}>
                        Email: {e.evaluatorEmail}
                      </Text>
                    </View>
                    <Badge
                      style={[
                        styles.evalBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      {e.total.toFixed(2)}
                    </Badge>
                  </View>
                ))}
              </Card.Content>
            </Card>
          ))}
        </View>
      ))}

      <Button
        mode="contained"
        onPress={handleExportPDF}
        style={styles.exportBtn}
      >
        Exportar vencedores em PDF
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 12, fontWeight: "700" },
  section: { marginBottom: 24 },
  categoryTitle: { marginTop: 4, marginBottom: 8, fontWeight: "600" },
  card: { marginBottom: 12, borderRadius: 8 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between" },
  projectTitle: { fontWeight: "600" },
  scoreRow: { flexDirection: "row", marginTop: 4 },
  badge: { marginRight: 8, paddingHorizontal: 8 },
  evalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    justifyContent: "space-between",
  },
  evalLabel: { fontWeight: "600" },
  evalSub: { fontSize: 12, color: "#555" },
  evalBadge: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
  exportBtn: { marginTop: 16, borderRadius: 24 },
});
