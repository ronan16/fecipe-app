// src/screens/evaluator/EvaluationsListScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Card, Paragraph, Title, Button, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { EvaluatorStackParamList } from "../../navigation/EvaluatorDrawer";

type EvalItem = {
  evaluationId: string;
  trabalhoId: string;
  titulo: string;
  total: number;
};

type NavProp = NativeStackNavigationProp<
  EvaluatorStackParamList,
  "EvaluatedList"
>;

export default function EvaluationsListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<EvalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvaluations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(firestore, "avaliacoes"),
          where("avaliadorId", "==", user.uid)
        )
      );
      const list: EvalItem[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const total = Object.values<number>(data.notas || {}).reduce(
          (a, b) => a + b,
          0
        );
        const projSnap = await getDoc(
          doc(firestore, "trabalhos", data.trabalhoId)
        );
        const titulo = projSnap.exists()
          ? (projSnap.data() as any).titulo
          : "—";
        list.push({
          evaluationId: d.id,
          trabalhoId: data.trabalhoId,
          titulo,
          total,
        });
      }
      setItems(list);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar avaliações",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // reload on focus
  useFocusEffect(
    useCallback(() => {
      loadEvaluations();
    }, [loadEvaluations])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvaluations();
    setRefreshing(false);
  }, [loadEvaluations]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Nenhuma avaliação realizada ainda.</Text>
        <Button onPress={loadEvaluations} style={styles.retryButton}>
          Recarregar
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.evaluationId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Title numberOfLines={1}>{item.titulo}</Title>
            <Paragraph>Nota Total: {item.total.toFixed(2)}</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() =>
                navigation.navigate("Evaluate", {
                  trabalhoId: item.trabalhoId,
                  titulo: item.titulo,
                  evaluationId: item.evaluationId,
                })
              }
            >
              Editar
            </Button>
          </Card.Actions>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  retryButton: {
    marginTop: 12,
  },
});
