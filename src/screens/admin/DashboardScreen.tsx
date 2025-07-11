// src/screens/admin/DashboardScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import { Card, Button } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const screenWidth = Dimensions.get("window").width;

// Pesos e constante z conforme edital
const WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

type EvaluationData = {
  email: string;
  notas: Record<string, number>;
  total: number;
};

type ProjectDetail = {
  id: string;
  titulo: string;
  categoria: string;
  turma?: string;
  orientador?: string;
  evaluations: EvaluationData[];
  finalScore: number;
};

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    evaluators: 0,
    projects: 0,
    projectsPerCategory: {} as Record<string, number>,
    top3ByCategory: {} as Record<string, ProjectDetail[]>,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(
    null
  );

  // Recarrega sempre que voltar à tela
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  // Carrega contadores, distribuições e Top3
  const loadDashboard = async () => {
    setLoading(true);
    try {
      // 1) Count evaluators
      const usersSnap = await getDocs(collection(firestore, "users"));
      const evalCount = usersSnap.docs.filter(
        (d) => d.data().role === "evaluator"
      ).length;

      // 2) Load all projects
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projects = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // 3) Count per category
      const perCat: Record<string, number> = {};
      projects.forEach((p) => {
        const cat = p.categoria || "Sem categoria";
        perCat[cat] = (perCat[cat] || 0) + 1;
      });

      // 4) Load all evaluations once
      const evalSnap = await getDocs(collection(firestore, "avaliacoes"));
      const allEvals = evalSnap.docs.map((d) => d.data());

      // 5) Build Top3 per category with formula
      const top3: Record<string, ProjectDetail[]> = {};
      for (const cat of Object.keys(perCat)) {
        // Filter projects of this category
        const projs = projects.filter(
          (p) => (p.categoria || "Sem categoria") === cat
        );

        // Compute detail for each project
        const details: ProjectDetail[] = projs.map((p) => {
          // Filter evaluations for this project
          const eForProj = allEvals.filter((e) => e.trabalhoId === p.id);

          // Map to EvaluationData (email + notas + total)
          const evalsData: EvaluationData[] = eForProj.map((e: any) => {
            const notasObj: Record<string, number> = {};
            let total = 0;
            Object.entries<number>(e.notas || {}).forEach(([k, v]) => {
              notasObj[k] = v;
              total += v;
            });
            return {
              email: e.evaluatorEmail || e.avaliadorId || "Sem avaliador",
              notas: notasObj,
              total,
            };
          });

          // Compute finalScore via normalização
          const k = cat === "IFTECH" || cat === "Robótica" ? 6 : 9;
          // Collect arrays per criterion
          const arrByCrit: number[][] = [];
          evalsData.forEach((ed) =>
            Object.values(ed.notas).forEach((v, i) => {
              arrByCrit[i] = arrByCrit[i] || [];
              arrByCrit[i].push(v);
            })
          );
          // Normalize & weight
          const scorePerEval = new Array(evalsData.length).fill(0);
          arrByCrit.forEach((critArr, i) => {
            const mean =
              critArr.reduce((a, b) => a + b, 0) / critArr.length || 0;
            const sd =
              Math.sqrt(
                critArr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
                  critArr.length
              ) || 1;
            critArr.forEach((v, idxEval) => {
              const norm = (v - mean) / sd + Z;
              const w = WEIGHTS[i] ?? 1;
              scorePerEval[idxEval] += norm * w;
            });
          });
          const finalScore =
            scorePerEval.reduce((a, b) => a + b, 0) /
            (cat === "IFTECH" || cat === "Robótica" ? 6 : 9);

          return {
            id: p.id,
            titulo: p.titulo,
            categoria: cat,
            turma: p.turma,
            orientador: p.orientador,
            evaluations: evalsData,
            finalScore,
          };
        });

        // Sort and take top 3, pad if needed
        details.sort((a, b) => b.finalScore - a.finalScore);
        top3[cat] = details.slice(0, 3).map((pd) => {
          // pad missing slots
          const evs = [...pd.evaluations];
          while (evs.length < 3) {
            evs.push({ email: "Sem avaliador", notas: {}, total: 0 });
          }
          return { ...pd, evaluations: evs };
        });
      }

      setStats({
        evaluators: evalCount,
        projects: projSnap.size,
        projectsPerCategory: perCat,
        top3ByCategory: top3,
      });
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "error",
        text1: "Erro ao carregar",
        text2: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />
    );
  }

  const categories = ["Todos", ...Object.keys(stats.projectsPerCategory)];
  const pieData = Object.entries(stats.projectsPerCategory).map(
    ([name, population], i) => ({
      name,
      population,
      color: ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5AC8FA"][
        i % 6
      ],
      legendFontColor: "#333",
      legendFontSize: 12,
    })
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📊 Painel do Administrador</Text>

      {/* resumo */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          👥 Avaliadores: {stats.evaluators}
        </Text>
        <Text style={styles.summaryText}>📁 Projetos: {stats.projects}</Text>
      </View>

      {/* gráfico pizza */}
      <Text style={styles.sectionTitle}>Distribuição por Categoria</Text>
      {pieData.length > 0 ? (
        <PieChart
          data={pieData}
          width={screenWidth - 32}
          height={220}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          chartConfig={{
            color: () => "#000",
            labelColor: () => "#000",
          }}
          style={{ borderRadius: 12 }}
        />
      ) : (
        <Text style={styles.noData}>Sem dados de categorias</Text>
      )}

      {/* filtro */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={setSelectedCategory}
          style={styles.picker}
        >
          {categories.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </View>

      {/* top3 cards */}
      <Text style={styles.sectionTitle}>Top 3 Projetos</Text>
      {(selectedCategory === "Todos"
        ? Object.keys(stats.top3ByCategory)
        : [selectedCategory]
      ).map((cat) => (
        <View key={cat} style={styles.categoryBlock}>
          <Text style={styles.categoryHeader}>{cat}</Text>
          {stats.top3ByCategory[cat]?.map((pd) => (
            <TouchableOpacity
              key={pd.id}
              onPress={() => {
                setSelectedProject(pd);
                setModalVisible(true);
              }}
            >
              <Card style={styles.projectCard}>
                <View>
                  <Text style={styles.projectTitle}>{pd.titulo}</Text>
                  <Text style={styles.projectSub}>
                    Turma: {pd.turma || "-"}
                  </Text>
                  <Text style={styles.projectScore}>
                    Nota Final: {pd.finalScore.toFixed(2)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* modal de detalhes */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProject && (
              <>
                <Text style={styles.modalTitle}>{selectedProject.titulo}</Text>
                <Text style={styles.modalLabel}>
                  Categoria: {selectedProject.categoria}
                </Text>
                {selectedProject.evaluations.map((ev, i) => (
                  <Text key={i} style={styles.modalLabel}>
                    Avaliador {i + 1}: {ev.email} — Nota: {ev.total.toFixed(2)}
                  </Text>
                ))}
                <Text style={styles.modalFinal}>
                  Nota Final: {selectedProject.finalScore.toFixed(2)}
                </Text>
              </>
            )}
            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Fechar
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  noData: {
    textAlign: "center",
    color: "#666",
  },
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  picker: { height: 48, width: "100%" },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  projectSub: {
    fontSize: 14,
    color: "#666",
  },
  projectScore: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 24,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 14,
    marginVertical: 2,
  },
  modalFinal: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButton: {
    marginTop: 16,
  },
});
