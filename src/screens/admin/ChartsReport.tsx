// src/screens/admin/ChartsReport.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {
  Title,
  Paragraph,
  Card,
  Chip,
  Button,
  useTheme,
  Divider,
  Badge,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { PieChart, BarChart } from "react-native-chart-kit";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { generatePDFReport } from "../../utils/pdfUtils";

const screenWidth = Dimensions.get("window").width - 32;
const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

interface Project {
  id: string;
  titulo: string;
  categoria: string;
  alunos?: string[];
}

interface Evaluation {
  id: string;
  trabalhoId: string;
  avaliadorId: string;
  evaluatorEmail?: string;
  notas: Record<string, number>;
  timestamp?: any;
}

export default function ChartsReport() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [projectsPerCategory, setProjectsPerCategory] = useState<
    Record<string, number>
  >({});
  const [evaluatedProjectsSet, setEvaluatedProjectsSet] = useState<Set<string>>(
    new Set()
  );
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [projectsByApproval, setProjectsByApproval] = useState<{
    approved: number;
    rejected: number;
  }>({
    approved: 0,
    rejected: 0,
  });

  const calculateFinalScore = (project: Project, evals: Evaluation[]) => {
    if (evals.length === 0) return 0;
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Projetos
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projList: Project[] = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setProjects(projList);
      setTotalProjects(projList.length);

      // distribuir por categoria
      const perCat: Record<string, number> = {};
      projList.forEach((p) => {
        perCat[p.categoria] = (perCat[p.categoria] || 0) + 1;
      });
      setProjectsPerCategory(perCat);

      // Avaliações
      const evalSnap = await getDocs(collection(firestore, "avaliacoes"));
      const evalList: Evaluation[] = evalSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setEvaluations(evalList);

      // projetos avaliados
      const evaluatedSet = new Set<string>(evalList.map((e) => e.trabalhoId));
      setEvaluatedProjectsSet(evaluatedSet);

      // Aprovação / reprovação: precisa calcular nota final por projeto
      let approved = 0;
      let rejected = 0;

      for (const project of projList) {
        const projEvals = evalList.filter((e) => e.trabalhoId === project.id);
        const finalScore = calculateFinalScore(project, projEvals);
        if (finalScore >= 5) approved++;
        else if (projEvals.length > 0) rejected++;
      }
      setApprovedCount(approved);
      setRejectedCount(rejected);
      setProjectsByApproval({ approved, rejected });
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

  const handleExportPDF = () => {
    const summary = {
      totalProjects,
      evaluatedProjects: evaluatedProjectsSet.size,
      notEvaluated: totalProjects - evaluatedProjectsSet.size,
      approved: approvedCount,
      rejected: rejectedCount,
      breakdownCategory: projectsPerCategory,
    };
    generatePDFReport([], { title: "Gráficos e Estatísticas", summary });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const pieData = Object.entries(projectsPerCategory).map(
    ([cat, count], i) => ({
      name: cat,
      population: count,
      color: ["#4BC0C0", "#FF6384", "#FFCE56", "#36A2EB", "#9E76FF", "#F78DA7"][
        i % 6
      ],
      legendFontColor: "#333",
      legendFontSize: 12,
    })
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.header}>📊 Gráficos e Estatísticas</Title>

      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.sectionTitle}>
            Distribuição de Projetos por Categoria
          </Paragraph>
          {pieData.length ? (
            <PieChart
              data={pieData}
              width={screenWidth}
              height={180}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Paragraph>Nenhum projeto cadastrado.</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.sectionTitle}>
            Projetos Avaliados vs Não Avaliados
          </Paragraph>
          <BarChart
            data={{
              labels: ["Avaliados", "Não avaliados"],
              datasets: [
                {
                  data: [
                    evaluatedProjectsSet.size,
                    totalProjects - evaluatedProjectsSet.size,
                  ],
                },
              ],
            }}
            width={screenWidth}
            height={150}
            fromZero
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              color: () => theme.colors.primary,
            }}
            style={{ marginVertical: 8 }}
            yAxisLabel={""}
            yAxisSuffix={""}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.sectionTitle}>
            Projetos Aprovados / Reprovados
          </Paragraph>
          <View style={styles.badgesRow}>
            <Badge style={[styles.badge, { backgroundColor: "#4CAF50" }]}>
              {`Aprovados: ${approvedCount}`}
            </Badge>
            <Badge style={[styles.badge, { backgroundColor: "#F44336" }]}>
              {`Reprovados: ${rejectedCount}`}
            </Badge>
          </View>
          <BarChart
            data={{
              labels: ["Aprovados", "Reprovados"],
              datasets: [{ data: [approvedCount, rejectedCount] }],
            }}
            width={screenWidth}
            height={150}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              color: () => "#007AFF",
            }}
            style={{ marginVertical: 8 }}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleExportPDF}
        style={styles.exportBtn}
      >
        Exportar relatório em PDF
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: { marginBottom: 16, borderRadius: 8 },
  sectionTitle: { fontWeight: "600", marginBottom: 4 },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  badge: { paddingHorizontal: 12, marginRight: 8 },
  exportBtn: { borderRadius: 24, marginTop: 8 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
