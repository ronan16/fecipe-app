// src/screens/admin/EvaluatorsScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  Button,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { firestore } from "../../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import type { AdminParamList } from "../../navigation/AdminStack";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<AdminParamList, "Evaluators">;
};

interface Evaluator {
  id: string;
  name?: string;
  role: string;
}

export default function EvaluatorsScreen({ navigation }: Props) {
  const [evals, setEvals] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadEvals = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, "users"));
      const list: Evaluator[] = snap.docs.map((d) => {
        const data = d.data() as { name?: string; role?: string };
        return {
          id: d.id,
          name: data.name,
          // assume role always present in Firestore; use non-null assertion
          role: data.role!,
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

  const handleDelete = (id: string) => {
    Alert.alert(
      "Excluir avaliador?",
      "Tem certeza que deseja remover este avaliador?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(firestore, "users", id));
              await loadEvals();
              Toast.show({
                type: "success",
                text1: "Sucesso",
                text2: "Avaliador excluído com sucesso",
              });
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Erro ao excluir avaliador",
                text2: error.message,
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
      <View style={styles.buttonRow}>
        <Button
          title="Novo Avaliador"
          onPress={() => navigation.navigate("EvaluatorForm", {})}
          disabled={loading}
        />
      </View>

      {evals.length === 0 ? (
        <View style={styles.centered}>
          <Text>Nenhum avaliador encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={evals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>
                {item.name ?? item.id} ({item.role})
              </Text>
              <View style={styles.actions}>
                <Button
                  title="Editar"
                  onPress={() =>
                    navigation.navigate("EvaluatorForm", { evaluator: item })
                  }
                  disabled={loading}
                />
                <View style={styles.actionSpacing} />
                <Button
                  title="Excluir"
                  color="red"
                  onPress={() => handleDelete(item.id)}
                  disabled={loading}
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
  container: {
    flex: 1,
    padding: 16,
  },
  buttonRow: {
    marginBottom: 12,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
  },
  actionSpacing: {
    width: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
