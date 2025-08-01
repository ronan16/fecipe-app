// src/screens/admin/ReportsScreen.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  Text,
  Button,
  useTheme,
  Chip,
  Divider,
  Card,
  Badge,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { PieChart } from "react-native-chart-kit";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../../services/firebase";
import ProjectCard from "../../components/ProjectCard";
import { generatePDFReport } from "../../utils/pdfUtils";

const screenWidth = Dimensions.get("window").width;
const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

interface Project {
  id: string;
  titulo: string;
  alunos?: string[];
  orientador?: string;
  turma?: string;
  anoSemestre?: string;
  categoria: string;
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

export default function ReportsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalEvaluators, setTotalEvaluators] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [projectsByCategory, setProjectsByCategory] = useState<
    Record<string, number>
  >({});
  const [topProjects, setTopProjects] = useState<Record<string, TopProject[]>>(
    {}
  );
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [userCache, setUserCache] = useState<Record<string, string>>({});

  const fetchUserName = useCallback(
    async (idOrEmail: string) => {
      if (userCache[idOrEmail]) return userCache[idOrEmail];
      try {
        const snap = await getDoc(doc(firestore, "users", idOrEmail));
        if (snap.exists()) {
          const data = snap.data() as any;
          const name = data.name || idOrEmail;
          setUserCache((c) => ({ ...c, [idOrEmail]: name }));
          return name;
        }
      } catch {
        // fallback silencioso
      }
      return idOrEmail;
    },
    [userCache]
  );

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
      const mean = arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
      const sd =
        Math.sqrt(
          arr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
            (arr.length || 1)
        ) || 1;
      arr.forEach((v, idx) => {
        const normalized = (v - mean) / sd + Z;
        const weight = CRITERIA_WEIGHTS[i] ?? 1;
        scoresPerEval[idx] += normalized * weight;
      });
    }

    return evalCount
      ? scoresPerEval.reduce((a, b) => a + b, 0) / scoresPerEval.length
      : 0;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Carrega projetos
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projects: Project[] = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setTotalProjects(projects.length);
      const catMap: Record<string, number> = {};
      projects.forEach((p) => {
        catMap[p.categoria] = (catMap[p.categoria] || 0) + 1;
      });
      setProjectsByCategory(catMap);
      setCategories(Object.keys(catMap));

      // Carrega avaliadores
      const usersSnap = await getDocs(collection(firestore, "users"));
      const evaluators = usersSnap.docs.filter((d) => {
        const data = d.data() as any;
        return data.role === "evaluator" || data.role === "admin" || !data.role;
      });
      setTotalEvaluators(evaluators.length);

      // Carrega avaliações
      const evalSnap = await getDocs(collection(firestore, "avaliacoes"));
      const allEvals: Evaluation[] = evalSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      let approvedCount = 0;
      let rejectedCount = 0;
      const topByCat: Record<string, TopProject[]> = {};

      for (const category of Object.keys(catMap)) {
        const projsInCat = projects.filter((p) => p.categoria === category);
        const enriched: TopProject[] = [];

        for (const p of projsInCat) {
          const relatedEvals = allEvals.filter((e) => e.trabalhoId === p.id);
          if (!relatedEvals.length) continue;

          const finalScore = computeFinalScore(p, relatedEvals);

          if (finalScore >= 5) approvedCount += 1;
          else rejectedCount += 1;

          const evalsWithTotal = relatedEvals
            .map((e) => ({
              ...e,
              total: Object.values(e.notas || {}).reduce((a, b) => a + b, 0),
            }))
            .sort((a: any, b: any) => (b.total || 0) - (a.total || 0))
            .slice(0, 3);

          const evaluations = await Promise.all(
            evalsWithTotal.map(async (e: any) => {
              const evaluatorEmail = e.evaluatorEmail || e.avaliadorId;
              const evaluatorName = await fetchUserName(evaluatorEmail);
              return {
                evaluatorId: e.avaliadorId,
                evaluatorEmail,
                evaluatorName,
                total: typeof e.total === "number" ? e.total : 0,
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
            titulo: p.titulo || "—",
            categoria: p.categoria,
            finalScore: typeof finalScore === "number" ? finalScore : 0,
            evaluations,
          });
        }

        topByCat[category] = enriched
          .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
          .slice(0, 3);
      }

      setApproved(approvedCount);
      setRejected(rejectedCount);
      setTopProjects(topByCat);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar relatórios",
        text2: err?.message || "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchUserName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCategories = filterCat ? [filterCat] : categories;

  const pieData = Object.keys(projectsByCategory).map((cat, i) => ({
    name: cat,
    population: projectsByCategory[cat],
    color: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"][i % 5],
    legendFontColor: "#333",
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false as const,
  };

  const handleExportPDF = () => {
    // Montagem estruturada, defensiva
    const reportItems: any[] = [
      { section: "Resumo Geral" },
      { label: "Total de Projetos", value: totalProjects ?? 0 },
      { label: "Total de Avaliadores", value: totalEvaluators ?? 0 },
      { label: "Aprovados", value: approved ?? 0 },
      { label: "Reprovados", value: rejected ?? 0 },
    ];

    Object.entries(topProjects || {}).forEach(([categoria, projects]) => {
      reportItems.push({ section: `Top 3 - ${categoria}` });
      projects.forEach((p, idx) => {
        const finalScore = typeof p.finalScore === "number" ? p.finalScore : 0;
        reportItems.push({
          rank: idx + 1,
          titulo: p.titulo || "—",
          notaFinal: finalScore,
        });
        (p.evaluations || []).forEach((e, j) => {
          const evaluatorName = e.evaluatorName || "Sem avaliador";
          const evaluatorEmail = e.evaluatorEmail || "—";
          const total = typeof e.total === "number" ? e.total : 0;
          reportItems.push({
            sub: true,
            avaliador: `Avaliador ${j + 1}`,
            nome: evaluatorName,
            email: evaluatorEmail,
            nota: total,
          });
        });
      });
    });

    console.log("🔍 reportItems para PDF:", reportItems);
    generatePDFReport({
      totalProjects: totalProjects ?? 0,
      totalEvaluators: totalEvaluators ?? 0,
      approved: approved ?? 0,
      rejected: rejected ?? 0,
      topProjects,
    } as any);
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
      <Text variant="titleLarge" style={styles.title}>
        📊 Painel de Relatórios
      </Text>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.statBox}>
              <Text variant="titleSmall">Avaliadores</Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {totalEvaluators}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleSmall">Projetos</Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {totalProjects}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleSmall">Aprovados</Text>
              <Badge style={[styles.badge, { backgroundColor: "#4CAF50" }]}>
                {approved}
              </Badge>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleSmall">Reprovados</Text>
              <Badge style={[styles.badge, { backgroundColor: "#F44336" }]}>
                {rejected}
              </Badge>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Projetos por Categoria
      </Text>
      <View style={{ alignItems: "center" }}>
        {pieData.length > 0 ? (
          <PieChart
            data={pieData}
            width={Math.min(screenWidth - 32, 360)}
            height={180}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            chartConfig={chartConfig}
          />
        ) : (
          <Text variant="bodyMedium">Nenhum dado de categoria disponível.</Text>
        )}
      </View>

      <Divider style={{ marginVertical: 12 }} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
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
        <View key={cat} style={styles.categorySection}>
          <Text variant="titleSmall" style={styles.categoryHeader}>
            {cat}
          </Text>
          {topProjects[cat]?.map((p, i) => (
            <ProjectCard
              key={p.id}
              title={p.titulo}
              category={p.categoria}
              finalScore={typeof p.finalScore === "number" ? p.finalScore : 0}
              evaluationsCount={p.evaluations.length}
              topEvaluators={p.evaluations.map((e) => ({
                name: e.evaluatorName,
                email: e.evaluatorEmail,
                score: typeof e.total === "number" ? e.total : 0,
              }))}
              onPress={() => {
                // navegar para detalhe se desejar
              }}
            />
          ))}
        </View>
      ))}

      <Button
        mode="contained"
        onPress={handleExportPDF}
        style={styles.exportBtn}
      >
        📥 Exportar PDF Completo
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#fff" },
  title: { marginBottom: 8, fontWeight: "700" },
  summaryCard: { marginBottom: 16, borderRadius: 10 },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    minWidth: 90,
    padding: 8,
    alignItems: "center",
  },
  statValue: { marginTop: 4, fontWeight: "700" },
  badge: { paddingHorizontal: 8 },
  sectionTitle: { marginTop: 4, marginBottom: 8, fontWeight: "600" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 6 },
  categorySection: { marginBottom: 16 },
  categoryHeader: { marginBottom: 6, fontWeight: "600" },
  exportBtn: { marginTop: 20, borderRadius: 24 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
