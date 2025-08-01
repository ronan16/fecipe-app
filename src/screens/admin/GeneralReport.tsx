// src/screens/admin/GeneralReport.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  TextInput,
  Chip,
  Card,
  Title,
  Paragraph,
  Button,
  useTheme,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { firestore } from "../../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { generatePDFReport } from "../../utils/pdfUtils";

interface Project {
  id: string;
  titulo: string;
  alunos: string[];
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
}

interface ReportItem extends Project {
  finalScore: number;
  evalCount: number;
}

const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

export default function GeneralReport() {
  const theme = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [data, setData] = useState<ReportItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Carrega projetos e categorias
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "trabalhos"));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setProjects(list);
      setCategories(Array.from(new Set(list.map((p) => p.categoria))));
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar projetos",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Para pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [loadProjects]);

  // Monta o relatório: busca avaliações e calcula nota final
  const buildReport = useCallback(async () => {
    setLoading(true);
    try {
      const items: ReportItem[] = [];
      for (const p of projects) {
        // pega avaliações
        const evalSnap = await getDocs(
          query(
            collection(firestore, "avaliacoes"),
            where("trabalhoId", "==", p.id)
          )
        );
        const evals = evalSnap.docs.map((d) => d.data());
        const evalCount = evals.length;
        let finalScore = 0;
        if (evalCount > 0) {
          // padroniza cada critério i
          const k = ["IFTECH", "Robótica"].includes(p.categoria) ? 6 : 9;
          const perEvalScores = Array(evalCount).fill(0);
          for (let i = 1; i <= k; i++) {
            const key = `C${i}`;
            const arr = evals.map((e: any) => e.notas[key] ?? 0);
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            const sd =
              Math.sqrt(
                arr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
                  arr.length
              ) || 1;
            arr.forEach((v, idx) => {
              perEvalScores[idx] +=
                ((v - mean) / sd + Z) * CRITERIA_WEIGHTS[i - 1];
            });
          }
          finalScore =
            perEvalScores.reduce((a, b) => a + b, 0) / perEvalScores.length;
        }
        items.push({ ...p, evalCount, finalScore });
      }
      setData(items);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao montar relatório",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  // Sempre que projects mudar, refaz o relatório
  useEffect(() => {
    if (projects.length) buildReport();
  }, [projects]);

  const filtered = data
    .filter((d) => (filterCat ? d.categoria === filterCat : true))
    .filter((d) =>
      d.titulo.toLowerCase().includes(search.trim().toLowerCase())
    );

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <TextInput
        placeholder="Buscar por título..."
        value={search}
        onChangeText={setSearch}
        mode="outlined"
        style={styles.search}
        left={<TextInput.Icon icon="magnify" />}
      />
      <View style={styles.chips}>
        <Chip
          selected={!filterCat}
          onPress={() => setFilterCat(null)}
          style={styles.chip}
        >
          Todos
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat}
            selected={filterCat === cat}
            onPress={() => setFilterCat(cat)}
            style={styles.chip}
          >
            {cat}
          </Chip>
        ))}
      </View>

      {/* Lista de resultados */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={filtered.length === 0 && styles.empty}
        ListEmptyComponent={
          <Paragraph style={styles.emptyText}>
            Nenhum projeto encontrado.
          </Paragraph>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Title numberOfLines={1}>{item.titulo}</Title>
              <Paragraph>
                Categoria: {item.categoria} • Avaliações: {item.evalCount}
              </Paragraph>
              <Paragraph>Nota Final: {item.finalScore.toFixed(2)}</Paragraph>
            </Card.Content>
          </Card>
        )}
      />

      {/* Exportar PDF */}
      <Button
        mode="contained"
        onPress={() => generatePDFReport(filtered, {})}
        style={styles.button}
      >
        Exportar em PDF
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  search: { marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
  card: { marginBottom: 12, borderRadius: 8 },
  button: { marginTop: 8, borderRadius: 24 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 20, textAlign: "center", color: "#666" },
});
