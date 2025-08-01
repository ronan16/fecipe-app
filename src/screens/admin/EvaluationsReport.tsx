// src/screens/admin/EvaluationsReport.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  Title,
  Paragraph,
  Card,
  Badge,
  Button,
  Chip,
  useTheme,
  Divider,
  TextInput,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { generatePDFReport } from "../../utils/pdfUtils";

interface Evaluation {
  id: string;
  trabalhoId: string;
  avaliadorId: string;
  evaluatorEmail?: string;
  notas: Record<string, number>;
  comentarios?: string;
  timestamp?: any;
  projetoTitulo?: string;
  categoria?: string;
  avaliadorName?: string;
}

interface Project {
  id: string;
  titulo: string;
  categoria: string;
}

const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

export default function EvaluationsReport() {
  const theme = useTheme();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filtered, setFiltered] = useState<Evaluation[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, Project>>({});
  const [evaluatorsMap, setEvaluatorsMap] = useState<Record<string, string>>(
    {}
  );
  const [searchProject, setSearchProject] = useState("");
  const [searchEvaluator, setSearchEvaluator] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSupportingData = useCallback(async () => {
    try {
      // Projetos
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projList = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      const projMap: Record<string, Project> = {};
      const catSet = new Set<string>();
      projList.forEach((p: any) => {
        projMap[p.id] = { id: p.id, titulo: p.titulo, categoria: p.categoria };
        if (p.categoria) catSet.add(p.categoria);
      });
      setProjectsMap(projMap);
      setCategories(Array.from(catSet));

      // Avaliadores (nome)
      const userSnap = await getDocs(collection(firestore, "users"));
      const evalMap: Record<string, string> = {};
      userSnap.docs.forEach((d) => {
        const data = d.data() as any;
        evalMap[d.id] = data.name || d.id;
      });
      setEvaluatorsMap(evalMap);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar dados auxiliares",
        text2: err.message,
      });
    }
  }, []);

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const evalSnap = await getDocs(
        query(collection(firestore, "avaliacoes"), orderBy("timestamp", "desc"))
      );
      const list: Evaluation[] = [];
      for (const d of evalSnap.docs) {
        const data = d.data() as any;
        const proj = projectsMap[data.trabalhoId];
        list.push({
          id: d.id,
          trabalhoId: data.trabalhoId,
          avaliadorId: data.avaliadorId,
          evaluatorEmail: data.evaluatorEmail || data.avaliadorId,
          notas: data.notas || {},
          comentarios: data.comentarios,
          timestamp: data.timestamp,
          projetoTitulo: proj?.titulo || "—",
          categoria: proj?.categoria,
          avaliadorName: evaluatorsMap[data.avaliadorId] || data.avaliadorId,
        });
      }
      setEvaluations(list);
      setFiltered(list);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar avaliações",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [projectsMap, evaluatorsMap]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRefreshing(true);
        await loadSupportingData();
        await loadEvaluations();
        setRefreshing(false);
      })();
    }, [loadSupportingData, loadEvaluations])
  );

  // Aplica filtros
  useEffect(() => {
    let temp = [...evaluations];

    if (searchProject.trim()) {
      temp = temp.filter((e) =>
        e.projetoTitulo
          ?.toLowerCase()
          .includes(searchProject.trim().toLowerCase())
      );
    }
    if (searchEvaluator.trim()) {
      temp = temp.filter((e) =>
        e.avaliadorName
          ?.toLowerCase()
          .includes(searchEvaluator.trim().toLowerCase())
      );
    }
    if (filterCategory) {
      temp = temp.filter((e) => e.categoria === filterCategory);
    }
    if (startDate) {
      temp = temp.filter((e) => {
        const d = e.timestamp?.toDate
          ? e.timestamp.toDate()
          : new Date(e.timestamp);
        return d >= startDate;
      });
    }
    if (endDate) {
      temp = temp.filter((e) => {
        const d = e.timestamp?.toDate
          ? e.timestamp.toDate()
          : new Date(e.timestamp);
        return d <= endDate;
      });
    }

    setFiltered(temp);
  }, [
    searchProject,
    searchEvaluator,
    filterCategory,
    startDate,
    endDate,
    evaluations,
  ]);

  const handleExportPDF = () => {
    generatePDFReport(filtered, {
      title: "Relatório de Avaliações",
      subtitle: `Total: ${filtered.length}`,
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const formatDate = (ts: any) => {
    if (!ts) return "-";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString();
    } catch {
      return "-";
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.header}>📝 Relatório de Avaliações</Title>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        <TextInput
          placeholder="Título do projeto"
          value={searchProject}
          onChangeText={setSearchProject}
          style={styles.filterInput}
          mode="outlined"
        />
        <TextInput
          placeholder="Avaliador"
          value={searchEvaluator}
          onChangeText={setSearchEvaluator}
          style={styles.filterInput}
          mode="outlined"
        />
        <Chip
          selected={!filterCategory}
          onPress={() => setFilterCategory(null)}
          style={styles.chip}
        >
          Todas categorias
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c}
            selected={filterCategory === c}
            onPress={() => setFilterCategory(filterCategory === c ? null : c)}
            style={styles.chip}
          >
            {c}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.dateRow}>
        <Button
          mode="outlined"
          onPress={() => setShowStartPicker(true)}
          style={styles.dateBtn}
        >
          {startDate ? `De: ${startDate.toLocaleDateString()}` : "Data início"}
        </Button>
        <Button
          mode="outlined"
          onPress={() => setShowEndPicker(true)}
          style={styles.dateBtn}
        >
          {endDate ? `Até: ${endDate.toLocaleDateString()}` : "Data fim"}
        </Button>
      </View>

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        onConfirm={(date: Date) => {
          setShowStartPicker(false);
          setStartDate(date);
        }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        onConfirm={(date: Date) => {
          setShowEndPicker(false);
          setEndDate(date);
        }}
        onCancel={() => setShowEndPicker(false)}
      />

      <Button
        mode="contained"
        onPress={handleExportPDF}
        style={styles.exportBtn}
      >
        Exportar em PDF
      </Button>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 && styles.empty}
        ListEmptyComponent={
          <Paragraph>Nenhuma avaliação encontrada.</Paragraph>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Title numberOfLines={1}>{item.projetoTitulo}</Title>
                  <Paragraph style={styles.small}>
                    Categoria: {item.categoria} • Avaliador:{" "}
                    {item.avaliadorName} ({item.evaluatorEmail})
                  </Paragraph>
                  <Paragraph style={styles.small}>
                    Data: {formatDate(item.timestamp)}
                  </Paragraph>
                </View>
                <Badge style={styles.badge}>
                  {`Total: ${Object.values(item.notas || {})
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}`}
                </Badge>
              </View>

              <Divider style={{ marginVertical: 8 }} />
              {/* Notas por critério */}
              {Object.entries(item.notas || {}).map(([crit, val]) => (
                <View key={crit} style={styles.critRow}>
                  <Paragraph style={styles.critTitle}>{crit}</Paragraph>
                  <Paragraph>{val.toFixed(2)}</Paragraph>
                </View>
              ))}
              {item.comentarios ? (
                <>
                  <Divider style={{ marginVertical: 6 }} />
                  <Paragraph style={styles.commentLabel}>Comentário:</Paragraph>
                  <Paragraph>{item.comentarios}</Paragraph>
                </>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { marginBottom: 12, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  filterInput: { minWidth: 160, marginRight: 8, flex: 1 },
  chip: { marginRight: 8 },
  dateRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dateBtn: { flex: 1, marginRight: 4 },
  exportBtn: { marginVertical: 8, borderRadius: 24 },
  card: { marginBottom: 12, borderRadius: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  small: { fontSize: 12, color: "#555" },
  badge: { alignSelf: "flex-start", marginLeft: 8, paddingHorizontal: 6 },
  critRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  critTitle: { fontWeight: "600" },
  commentLabel: { fontWeight: "600", marginTop: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
});
