// src/screens/admin/DashboardScreen.tsx

import React, { useEffect, useState } from "react";
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
import { Card, Button } from "react-native-paper";
import { PieChart } from "react-native-chart-kit";
import { Picker } from "@react-native-picker/picker";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Toast from "react-native-toast-message";

const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    evaluators: 0,
    projects: 0,
    evaluatedCount: 0,
    pendingCount: 0,
    projectsPerCategory: {} as Record<string, number>,
    top3ByCategory: {} as Record<string, any[]>,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const usersSnap = await getDocs(collection(firestore, "users"));
        const evaluators = usersSnap.docs.filter(
          (d) => d.data().role === "evaluator"
        );

        const projectsSnap = await getDocs(collection(firestore, "trabalhos"));
        const projects = projectsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        const projectsPerCategory: Record<string, number> = {};
        projects.forEach((p) => {
          projectsPerCategory[p.categoria] =
            (projectsPerCategory[p.categoria] || 0) + 1;
        });

        const evaluationsSnap = await getDocs(
          collection(firestore, "avaliacoes")
        );
        const evaluatedProjectsSet = new Set(
          evaluationsSnap.docs.map((d) => d.data().trabalhoId)
        );

        const evaluatedCount = evaluatedProjectsSet.size;
        const pendingCount = projects.length - evaluatedCount;

        const top3ByCategory: Record<string, any[]> = {};
        Object.keys(projectsPerCategory).forEach((cat) => {
          const projs = projects.filter((p) => p.categoria === cat);
          top3ByCategory[cat] = projs.slice(0, 3); // substitua com lógica de nota final se necessário
        });

        setStats({
          evaluators: evaluators.length,
          projects: projects.length,
          evaluatedCount,
          pendingCount,
          projectsPerCategory,
          top3ByCategory,
        });
      } catch (error: any) {
        console.error(error);
        Toast.show({
          type: "error",
          text1: "Erro ao carregar",
          text2: error.message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />
    );
  }

  const categories = Object.keys(stats.projectsPerCategory);
  const pieData = categories.map((cat, idx) => ({
    name: cat,
    population: stats.projectsPerCategory[cat],
    color: ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5AC8FA"][
      idx % 6
    ],
    legendFontColor: "#333",
    legendFontSize: 12,
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel do Administrador</Text>

      {/* Contadores */}
      <View style={styles.cardRow}>
        <Card style={styles.card}>
          <Text style={styles.cardNumber}>{stats.evaluators}</Text>
          <Text style={styles.cardLabel}>Avaliadores</Text>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.cardNumber}>{stats.projects}</Text>
          <Text style={styles.cardLabel}>Projetos</Text>
        </Card>
      </View>
      <View style={styles.cardRow}>
        <Card style={styles.card}>
          <Text style={styles.cardNumber}>{stats.evaluatedCount}</Text>
          <Text style={styles.cardLabel}>Avaliados</Text>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.cardNumber}>{stats.pendingCount}</Text>
          <Text style={styles.cardLabel}>Pendentes</Text>
        </Card>
      </View>

      {/* Gráfico */}
      <Text style={styles.sectionTitle}>Projetos por Categoria</Text>
      <PieChart
        data={pieData}
        width={screenWidth - 32}
        height={220}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        absolute
        chartConfig={{
          color: () => "#007AFF",
          labelColor: () => "#333",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
        }}
      />

      {/* Filtro */}
      <Text style={styles.sectionTitle}>Filtrar por Categoria</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={setSelectedCategory}
          style={{ height: 50, flex: 1 }}
        >
          <Picker.Item label="Todos" value="Todos" />
          {categories.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </View>

      {/* Top 3 */}
      <Text style={styles.sectionTitle}>Top 3 Projetos</Text>
      {(selectedCategory === "Todos" ? categories : [selectedCategory]).map(
        (cat) => (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{cat}</Text>
            {stats.top3ByCategory[cat]?.map((proj) => (
              <TouchableOpacity
                key={proj.id}
                onPress={() => {
                  setSelectedProject(proj);
                  setModalVisible(true);
                }}
              >
                <Card style={styles.projectCard}>
                  <Text style={styles.projectTitle}>{proj.titulo}</Text>
                  <Text style={styles.projectSubtitle}>
                    Turma: {proj.turma || "N/A"}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProject && (
              <>
                <Text style={styles.modalTitle}>{selectedProject.titulo}</Text>
                <Text>Categoria: {selectedProject.categoria}</Text>
                <Text>Turma: {selectedProject.turma || "N/A"}</Text>
                <Text>Orientador: {selectedProject.orientador || "N/A"}</Text>
              </>
            )}
            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 16 }}
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
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cardNumber: { fontSize: 28, fontWeight: "bold", color: "#007AFF" },
  cardLabel: { fontSize: 14, color: "#333", marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  categorySection: { marginTop: 12 },
  categoryTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  projectTitle: { fontSize: 16, fontWeight: "500", color: "#333" },
  projectSubtitle: { fontSize: 14, color: "#666" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000aa",
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
});
