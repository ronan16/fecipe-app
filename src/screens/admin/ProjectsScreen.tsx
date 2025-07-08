// src/screens/admin/ProjectsScreen.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { firestore } from "../../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
// importe o tipo Project
import type { AdminParamList, Project } from "../../navigation/AdminStack";

type Props = {
  navigation: NativeStackNavigationProp<AdminParamList, "Projects">;
};

export default function ProjectsScreen({ navigation }: Props) {
  // use o tipo Project
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "trabalhos"));
      // agora mapeamos *todos* os campos, e damos cast para Project
      const list: Project[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      setProjects(list);
    } catch (err: any) {
      console.error("Erro ao carregar projetos:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        title="Novo Projeto"
        onPress={() => navigation.navigate("ProjectForm", {})}
      />

      {projects.length === 0 ? (
        <View style={styles.centered}>
          <Text>Nenhum projeto encontrado.</Text>
        </View>
      ) : (
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
                    // agora `item` é um Project completo
                    navigation.navigate("ProjectForm", { project: item })
                  }
                />
                <View style={styles.actionSpacing} />
                <Button
                  title="Excluir"
                  color="red"
                  onPress={async () => {
                    await deleteDoc(doc(firestore, "trabalhos", item.id));
                    loadProjects();
                  }}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
