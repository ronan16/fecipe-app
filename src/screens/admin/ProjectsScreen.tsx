import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { firestore } from "../../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "trabalhos"));
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
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
      // chama sua função async, mas o callback em si é síncrono
      loadProjects();
      // não retorna Promise nem cleanup
    }, [loadProjects])
  );

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Linha com botões de ação */}
      <View style={styles.buttonRow}>
        <Button
          title="Novo Projeto"
          onPress={() => navigation.navigate("ProjectForm", {})}
        />
        <Button
          title="Importar em Lote"
          onPress={() => navigation.navigate("BulkUpload", undefined)}
        />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.titulo}</Text>
            <View style={styles.actions}>
              <Button
                title="Editar"
                onPress={() =>
                  navigation.navigate("ProjectForm", { project: item })
                }
              />
              <View style={styles.actionSpacing} />
              <Button
                title="Excluir"
                color="red"
                onPress={() => handleDelete(item.id)}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  list: { paddingBottom: 16 },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  title: { fontSize: 16, marginBottom: 8 },
  actions: { flexDirection: "row" },
  actionSpacing: { width: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
