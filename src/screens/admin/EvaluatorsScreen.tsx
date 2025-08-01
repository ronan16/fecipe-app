// src/screens/admin/EvaluatorsScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Avatar,
  useTheme,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { firestore } from "../../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import type { AdminParamList } from "../../navigation/AdminStack";

type Props = {
  navigation: NativeStackNavigationProp<AdminParamList, "Evaluators">;
};

interface Evaluator {
  id: string;
  name: string;
  role: string;
}

export default function EvaluatorsScreen({ navigation }: Props) {
  const theme = useTheme();
  const [evals, setEvals] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvals = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "users"));
      const list: Evaluator[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name || "(sem nome)",
          role: data.role || "evaluator",
        };
      });
      setEvals(list);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar avaliadores",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvals();
    }, [loadEvals])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvals();
    setRefreshing(false);
  }, [loadEvals]);

  const handleDelete = (id: string) => {
    Toast.show({
      type: "info",
      text1: "Excluindo avaliador...",
      text2: "Por favor, aguarde.",
    });
    setLoading(true);
    deleteDoc(doc(firestore, "users", id))
      .then(() => {
        Toast.show({ type: "success", text1: "Avaliador excluído" });
        return loadEvals();
      })
      .catch((err) => {
        Toast.show({
          type: "error",
          text1: "Falha ao excluir",
          text2: err.message,
        });
      })
      .finally(() => setLoading(false));
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={evals}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={evals.length === 0 && styles.centered}
        ListEmptyComponent={
          <Paragraph style={styles.emptyText}>
            Nenhum avaliador encontrado.
          </Paragraph>
        }
        renderItem={({ item }) => (
          <Card style={styles.card} mode="outlined">
            <Card.Title
              title={item.name}
              subtitle={item.role === "admin" ? "Administrador" : "Avaliador"}
              left={(props) => (
                <Avatar.Text {...props} label={item.name.charAt(0)} />
              )}
            />
            <Card.Actions>
              <Button
                onPress={() =>
                  navigation.navigate("EvaluatorForm", { evaluator: item })
                }
              >
                Editar
              </Button>
              <Button
                textColor={theme.colors.error}
                onPress={() => handleDelete(item.id)}
              >
                Excluir
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <FAB
        icon="plus"
        label="Novo"
        style={styles.fab}
        onPress={() => navigation.navigate("EvaluatorForm", {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 20, textAlign: "center" },
  card: { margin: 8, borderRadius: 8 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
