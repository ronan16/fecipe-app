// src/screens/admin/ProjectsScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  FAB,
  Chip,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { firestore } from "../../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProjectsStackParamList } from "../../navigation/AdminDrawer";

type Props = {
  navigation: NativeStackNavigationProp<ProjectsStackParamList, "ProjectsList">;
};

interface Project {
  id: string;
  titulo: string;
  alunos: string[];
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
}

export default function ProjectsScreen({ navigation }: Props) {
  const theme = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "trabalhos"));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setProjects(list);

      const cats = Array.from(new Set(list.map((p) => p.categoria)));
      setCategories(cats);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar projetos",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [loadProjects]);

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(firestore, "trabalhos", id));
      await loadProjects();
      Toast.show({ type: "success", text1: "Projeto excluído com sucesso" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao excluir projeto",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects
    .filter((p) => p.titulo.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((p) => (filterCat ? p.categoria === filterCat : true));

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Buscar por título..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        mode="outlined"
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Title numberOfLines={1}>{item.titulo}</Title>
              <Paragraph numberOfLines={1}>
                {item.categoria} • {item.turma}
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() =>
                  navigation.navigate("ProjectForm", { project: item })
                }
              >
                Editar
              </Button>
              <Button
                onPress={() => handleDelete(item.id)}
                textColor={theme.colors.error}
              >
                Excluir
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate("ProjectForm", {})}
      />
      <FAB
        style={[styles.fab, { bottom: 90 }]}
        small
        icon="download"
        onPress={() => navigation.navigate("BulkUpload")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  search: { margin: 16 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chip: { marginRight: 8, marginBottom: 8 },
  card: { marginHorizontal: 16, marginVertical: 8, borderRadius: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
