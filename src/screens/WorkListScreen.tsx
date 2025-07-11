// src/screens/WorkListScreen.tsx

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Card, Button, TextInput, SegmentedButtons } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

interface Trabalho {
  id: string;
  titulo: string;
  alunos: string[]; // nomes dos autores
  categoria?: string;
  turma?: string;
}

export default function WorkListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [allProjects, setAllProjects] = useState<Trabalho[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"titulo" | "autor">("titulo");

  // Carrega dados quando a tela fica em foco
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) buscar todos projetos
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projects: Trabalho[] = projSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          titulo: data.titulo,
          alunos: Array.isArray(data.alunos) ? data.alunos : [],
          categoria: data.categoria,
          turma: data.turma,
        };
      });

      // 2) buscar IDs de projetos já avaliados por este avaliador
      const evalSnap = await getDocs(
        query(
          collection(firestore, "avaliacoes"),
          where("avaliadorId", "==", user!.uid)
        )
      );
      const doneIds = new Set(
        evalSnap.docs.map((d) => (d.data() as any).trabalhoId)
      );

      // 3) filtrar apenas projetos não avaliados
      const available = projects.filter((p) => !doneIds.has(p.id));

      // 4) extrair categorias únicas
      const cats = Array.from(
        new Set(projects.map((p) => p.categoria || "Sem categoria"))
      ).sort();
      setCategories(["Todos", ...cats]);

      setAllProjects(available);
    } catch (e: any) {
      console.error("Erro ao carregar projetos:", e);
      Toast?.show?.({
        type: "error",
        text1: "Erro ao carregar projetos",
        text2: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtra em memória conforme categoria, modo e termo de busca
  const filteredProjects = useMemo(() => {
    let list = allProjects;
    if (selectedCategory !== "Todos") {
      list = list.filter(
        (p) => (p.categoria || "Sem categoria") === selectedCategory
      );
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) =>
        filterMode === "titulo"
          ? p.titulo.toLowerCase().includes(term)
          : p.alunos.some((a) => a.toLowerCase().includes(term))
      );
    }
    return list;
  }, [allProjects, selectedCategory, searchTerm, filterMode]);

  const renderItem = ({ item }: { item: Trabalho }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <Text style={styles.title}>{item.titulo}</Text>
        <Text style={styles.subtitle}>
          {item.categoria} • {item.turma}
        </Text>
        <Text style={styles.authors}>Autores: {item.alunos.join(", ")}</Text>
      </Card.Content>
      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => {
            Keyboard.dismiss();
            navigation.navigate("Evaluate", {
              trabalhoId: item.id,
              titulo: item.titulo,
            });
          }}
        >
          Avaliar
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtro de busca por título ou autor */}
      <TextInput
        mode="outlined"
        placeholder={
          filterMode === "titulo"
            ? "Buscar por título..."
            : "Buscar por autor..."
        }
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
        left={<TextInput.Icon icon="magnify" />}
      />

      {/* Segmento para escolher modo de busca */}
      <View style={styles.segmentedContainer}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: "titulo", label: "Título" },
            { value: "autor", label: "Autor" },
          ]}
          style={styles.segmented}
        />
      </View>

      {/* Filtro por categoria */}
      <View style={styles.pickerWrapper}>
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

      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum trabalho disponível</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchInput: {
    margin: 16,
    backgroundColor: "#f5f5f5",
  },
  segmentedContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  segmented: {
    borderRadius: 8,
    overflow: "hidden",
  },
  pickerWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  picker: { height: 48, width: "100%" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 4 },
  authors: { fontSize: 13, color: "#333", marginTop: 6 },
  actions: {
    justifyContent: "flex-end",
    paddingRight: 16,
    paddingBottom: 8,
  },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#666" },
});
