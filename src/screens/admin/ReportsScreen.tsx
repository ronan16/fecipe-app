// src/screens/admin/ReportsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, FlatList, Text, ActivityIndicator } from "react-native";
import { firestore } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Pesos conforme regulamento
const weights = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const z = 2.5;

function computeFinalScore(evals: any[]) {
  // agrupa por critério i: calcula N_aCi para cada trabalho
  const Na = evals.map((r) => r.notas); // [{C1:3,...}, ...]
  // para cada critério i:
  const scores = weights.map((p, idx) => {
    const key = `C${idx + 1}`;
    const vals = Na.map((n) => n[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(
      vals.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) /
        vals.length
    );
    const norm = vals.map((v) => (v - mean) / sd + z);
    return norm.map((n) => n * p);
  });
  // soma ponderada para cada avaliacao
  return scores[0].map((_, i) => scores.reduce((sum, arr) => sum + arr[i], 0));
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // busca todos os trabalhos
      const worksSnap = await getDocs(collection(firestore, "trabalhos"));
      const list = [];

      for (const w of worksSnap.docs) {
        const work = { id: w.id, titulo: w.data().titulo };
        // busca avaliações
        const evalSnap = await getDocs(
          query(
            collection(firestore, "avaliacoes"),
            where("trabalhoId", "==", w.id)
          )
        );
        const evs = evalSnap.docs.map((d) => d.data());
        const finalScores = computeFinalScore(evs);
        list.push({ ...work, finalScores });
      }
      setReports(list);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={reports}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {item.titulo}
            </Text>
            {item.finalScores.map((s: number, idx: number) => (
              <Text key={idx}>
                Rodada {idx + 1}: {s.toFixed(2)}
              </Text>
            ))}
          </View>
        )}
      />
    </View>
  );
}
