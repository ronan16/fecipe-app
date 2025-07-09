import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Toast from "react-native-toast-message";
import { firestore } from "../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { EvaluatorStackParamList } from "../navigation/EvaluatorDrawer";

interface Project {
  id: string;
  titulo: string;
  alunos: string[];
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
}

type Props = {
  navigation: NativeStackNavigationProp<EvaluatorStackParamList, "Works">;
};

export default function WorkListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTitle, setSearchTitle] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // 1) função de carga que filtra projetos já avaliados
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      // carrega todos os trabalhos
      const projSnap = await getDocs(collection(firestore, "trabalhos"));
      const projects = projSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Project[];

      // carrega avaliações já feitas por este usuário
      const evalSnap = await getDocs(
        query(
          collection(firestore, "avaliacoes"),
          where("avaliadorId", "==", user!.uid)
        )
      );
      const done = new Set(evalSnap.docs.map((d) => d.data().trabalhoId));

      // só deixa os que ainda não foram avaliados
      const remaining = projects.filter((p) => !done.has(p.id));

      setAllProjects(remaining);
      setFiltered(remaining);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar projetos",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 2) dispara loadProjects sempre que a tela ficar em foco
  useFocusEffect(
    useCallback(() => {
      // chama sua função async, mas o callback em si é síncrono
      loadProjects();
      // não retorna Promise nem cleanup
    }, [loadProjects])
  );

  // 3) aplica filtros em memória
  React.useEffect(() => {
    setFiltered(
      allProjects.filter((p) => {
        const byTitle = p.titulo
          .toLowerCase()
          .includes(searchTitle.toLowerCase());
        const byStudent = searchStudent
          ? p.alunos.some((a) =>
              a.toLowerCase().includes(searchStudent.toLowerCase())
            )
          : true;
        const byCat = categoryFilter ? p.categoria === categoryFilter : true;
        return byTitle && byStudent && byCat;
      })
    );
  }, [searchTitle, searchStudent, categoryFilter, allProjects]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Buscar por título"
        value={searchTitle}
        onChangeText={setSearchTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Buscar por aluno"
        value={searchStudent}
        onChangeText={setSearchStudent}
        style={styles.input}
      />
      <TextInput
        placeholder="Buscar por categoria"
        value={categoryFilter}
        onChangeText={setCategoryFilter}
        style={styles.input}
      />

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text>Nenhum trabalho disponível.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.titulo}</Text>
              <Text style={styles.subtitle}>
                {item.categoria} | {item.alunos.join(", ")}
              </Text>
              <Button
                title="Avaliar"
                onPress={() =>
                  navigation.navigate("Evaluate", {
                    trabalhoId: item.id,
                    titulo: item.titulo,
                  })
                }
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12,
    padding: 8,
  },
  list: { paddingBottom: 16 },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
