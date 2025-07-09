import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import Toast from "react-native-toast-message";
import { BarChart } from "react-native-chart-kit";
import { firestore } from "../../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen() {
  const [evalCount, setEvalCount] = useState<number>(0);
  const [projCount, setProjCount] = useState<number>(0);
  const [projectsPerCat, setProjectsPerCat] = useState<Record<string, number>>(
    {}
  );
  const [top3, setTop3] = useState<
    Record<
      string,
      Array<{
        id: string;
        titulo: string;
        evaluations: { email: string; total: number }[];
        finalScore: number;
      }>
    >
  >({});

  useEffect(() => {
    (async () => {
      try {
        // 1) Contar avaliadores
        const usersSnap = await getDocs(collection(firestore, "users"));
        const evaluators = usersSnap.docs.filter(
          (d) => d.data().role === "evaluator"
        );
        setEvalCount(evaluators.length);

        // 1.1) Contar projetos
        const projSnapAll = await getDocs(collection(firestore, "trabalhos"));
        setProjCount(projSnapAll.size);

        // 2) Projetos por categoria
        const projects = projSnapAll.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        const perCat: Record<string, number> = {};
        projects.forEach((p) => {
          perCat[p.categoria] = (perCat[p.categoria] || 0) + 1;
        });
        setProjectsPerCat(perCat);

        // 3) Calcular top3 por categoria
        const mapTop: typeof top3 = {};
        const weights = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
        const z = 2.5;

        for (const categoria of Object.keys(perCat)) {
          const projs = projects.filter((p) => p.categoria === categoria);

          const enriched = await Promise.all(
            projs.map(async (p) => {
              // carrega avaliações do projeto
              const evalSnap = await getDocs(
                query(
                  collection(firestore, "avaliacoes"),
                  where("trabalhoId", "==", p.id)
                )
              );
              // coletar dados das avaliações
              const evalsData: Array<{
                email: string;
                notasArr: number[];
                total: number;
              }> = [];
              evalSnap.docs.forEach((docEval) => {
                const data = docEval.data();
                const arr = Object.values<number>(data.notas || {});
                const total = arr.reduce((a, b) => a + b, 0);
                evalsData.push({
                  email: (data.evaluatorEmail as string) || "Sem avaliador",
                  notasArr: arr,
                  total,
                });
              });
              // padronizar notas e calcular nota final
              const allNotasByCrit: number[][] = [];
              evalsData.forEach((e) => {
                e.notasArr.forEach((val, i) => {
                  allNotasByCrit[i] = allNotasByCrit[i] || [];
                  allNotasByCrit[i].push(val);
                });
              });
              const scoresPerEval = evalsData.map(() => 0);
              allNotasByCrit.forEach((critArr, i) => {
                const mean =
                  critArr.reduce((a, b) => a + b, 0) / critArr.length || 0;
                const sd =
                  Math.sqrt(
                    critArr
                      .map((v) => (v - mean) ** 2)
                      .reduce((a, b) => a + b, 0) / critArr.length
                  ) || 1;
                critArr.forEach((v, idxEval) => {
                  const norm = (v - mean) / sd + z;
                  const w = weights[i] ?? 1;
                  scoresPerEval[idxEval] += norm * w;
                });
              });
              const finalScore =
                scoresPerEval.reduce((a, b) => a + b, 0) /
                (categoria === "IFTECH" || categoria === "Robótica" ? 6 : 9);

              // selecionar top 3 ou preencher com placeholders
              let topEval = evalsData
                .slice(0, 3)
                .map((e) => ({ email: e.email, total: e.total }));
              while (topEval.length < 3) {
                topEval.push({ email: "Sem avaliador", total: 0 });
              }

              return {
                id: p.id,
                titulo: p.titulo,
                finalScore,
                evaluations: topEval,
              };
            })
          );

          mapTop[categoria] = enriched
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, 3);
        }
        setTop3(mapTop);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Erro ao carregar dashboard",
          text2: error.message,
        });
      }
    })();
  }, []);

  const categories = Object.keys(projectsPerCat);
  const counts = categories.map((c) => projectsPerCat[c]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Painel Administrativo</Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Avaliadores cadastrados</Text>
          <Text style={styles.statValue}>{evalCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Projetos cadastrados</Text>
          <Text style={styles.statValue}>{projCount}</Text>
        </View>
      </View>

      <Text style={styles.chartTitle}>Projetos por Categoria</Text>
      <BarChart
        data={{ labels: categories, datasets: [{ data: counts }] }}
        width={screenWidth - 32}
        height={220}
        fromZero
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          color: () => "#007AFF",
        }}
        style={{ marginVertical: 8 }}
      />

      {categories.map((cat) => (
        <View key={cat} style={styles.section}>
          <Text style={styles.sectionTitle}>{cat}</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cellHeader}>Trabalho</Text>
            <Text style={styles.cellHeader}>Avaliador 1</Text>
            <Text style={styles.cellHeader}>Nota 1</Text>
            <Text style={styles.cellHeader}>Avaliador 2</Text>
            <Text style={styles.cellHeader}>Nota 2</Text>
            <Text style={styles.cellHeader}>Avaliador 3</Text>
            <Text style={styles.cellHeader}>Nota 3</Text>
            <Text style={styles.cellHeader}>Nota Final</Text>
          </View>
          {top3[cat]?.map((p) => (
            <View key={p.id} style={styles.tableRow}>
              <Text style={styles.cell}>{p.titulo}</Text>
              {p.evaluations.map((e, i) => (
                <React.Fragment key={i}>
                  <Text style={styles.cell}>{e.email}</Text>
                  <Text style={styles.cell}>{e.total.toFixed(2)}</Text>
                </React.Fragment>
              ))}
              <Text style={styles.cell}>{p.finalScore.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#eef",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statLabel: { fontSize: 16 },
  statValue: { fontSize: 28, fontWeight: "bold", marginTop: 4 },
  chartTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#ddd",
    padding: 4,
  },
  tableRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  cellHeader: { width: 100, fontWeight: "bold" },
  cell: { width: 100 },
});
