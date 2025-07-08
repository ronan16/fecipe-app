// src/screens/WorkListScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Button,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { firestore } from "../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { EvaluatorStackParamList } from "../navigation/EvaluatorStack";

type Props = {
  navigation: NativeStackNavigationProp<EvaluatorStackParamList, "Works">;
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

export default function WorkListScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTitle, setSearchTitle] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Carrega projetos uma vez
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(firestore, "trabalhos"));
        const list = snap.docs.map(
          (d: QueryDocumentSnapshot) =>
            ({
              id: d.id,
              ...(d.data() as any),
            } as Project)
        );
        setProjects(list);
        setFiltered(list);
      } catch (err: any) {
        Alert.alert("Erro", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aplica filtros em memória
  useEffect(() => {
    setFiltered(
      projects.filter((p) => {
        const matchTitle = p.titulo
          .toLowerCase()
          .includes(searchTitle.toLowerCase());
        const matchStudent = searchStudent
          ? p.alunos.some((a) =>
              a.toLowerCase().includes(searchStudent.toLowerCase())
            )
          : true;
        const matchCategory = categoryFilter
          ? p.categoria === categoryFilter
          : true;
        return matchTitle && matchStudent && matchCategory;
      })
    );
  }, [searchTitle, searchStudent, categoryFilter, projects]);

  // Verifica limite de 3 avaliações antes de navegar
  const handleEvaluate = async (project: Project) => {
    const evalSnap = await getDocs(
      query(
        collection(firestore, "avaliacoes"),
        where("trabalhoId", "==", project.id)
      )
    );
    if (evalSnap.size >= 3) {
      Alert.alert("Limite atingido", "Este trabalho já recebeu 3 avaliações.");
      return;
    }
    navigation.navigate("Evaluate", {
      trabalhoId: project.id,
      titulo: project.titulo,
    });
  };

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
      <Picker
        selectedValue={categoryFilter}
        onValueChange={setCategoryFilter}
        style={styles.picker}
      >
        <Picker.Item label="Todas categorias" value="" />
        <Picker.Item label="Ensino" value="Ensino" />
        <Picker.Item label="Pesquisa/Inovação" value="Pesquisa/Inovação" />
        <Picker.Item label="Extensão" value="Extensão" />
        <Picker.Item label="Comunicação Oral" value="Comunicação Oral" />
        <Picker.Item label="IFTECH" value="IFTECH" />
        <Picker.Item label="Robótica" value="Robótica" />
      </Picker>

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text>Nenhum trabalho encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.titulo}</Text>
              <Text style={styles.subtitle}>
                {item.categoria} | {item.alunos.join(", ")}
              </Text>
              <Button title="Avaliar" onPress={() => handleEvaluate(item)} />
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
  picker: { marginBottom: 12 },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
