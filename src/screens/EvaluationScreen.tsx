import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EvaluatorStackParamList } from "../navigation/EvaluatorDrawer";

type Props = NativeStackScreenProps<EvaluatorStackParamList, "Evaluate">;

// Definições de critérios por categoria
const CRITERIA_DEFS: Record<string, { label: string; values: number[] }[]> = {
  Ensino: [
    {
      label: "Domínio do estudante sobre o trabalho.",
      values: [0, 0.4, 0.9, 1.4, 1.8],
    },
    {
      label: "Clareza e objetividade da apresentação.",
      values: [0, 0.4, 0.8, 1.2, 1.6],
    },
    {
      label: "Definição da proposta do projeto.",
      values: [0, 0.4, 0.7, 1.0, 1.4],
    },
    {
      label: "Elaboração do banner (aspectos visuais, organização).",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Contribuição para melhoria do ensino e aprendizagem.",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Metodologia inovadora e ressignificativa.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Contribuição para a sociedade e formação integral.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Articulação entre ensino, pesquisa e extensão.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
    { label: "Relevância social do projeto.", values: [0, 0.2, 0.3, 0.4, 0.6] },
  ],
  "Pesquisa/Inovação": [
    {
      label: "Domínio do estudante sobre o trabalho.",
      values: [0, 0.4, 0.9, 1.4, 1.8],
    },
    { label: "Clareza da apresentação.", values: [0, 0.4, 0.8, 1.2, 1.6] },
    {
      label: "Definição da proposta do projeto.",
      values: [0, 0.4, 0.7, 1.0, 1.4],
    },
    {
      label: "Elaboração do banner (aspectos visuais, organização).",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Conhecimento em relação à metodologia proposta.",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Domínio teórico baseado em literatura científica.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Relação entre resultados e objetivos.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    { label: "Relevância para a sociedade.", values: [0, 0.2, 0.3, 0.4, 0.6] },
    {
      label: "Interdisciplinaridade do projeto.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
  ],
  Extensão: [
    { label: "Clareza dos objetivos.", values: [0, 0.4, 0.7, 1.0, 1.4] },
    { label: "Engajamento da comunidade.", values: [0, 0.3, 0.6, 0.9, 1.2] },
    { label: "Relevância social.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    {
      label: "Parcerias e articulação local.",
      values: [0, 0.3, 0.5, 0.7, 1.0],
    },
    { label: "Sustentabilidade das ações.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Disseminação de resultados.", values: [0, 0.3, 0.6, 0.9, 1.2] },
    { label: "Inovação e criatividade.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Responsabilidade social.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Avaliação de impacto.", values: [0, 0.2, 0.4, 0.6, 0.8] },
  ],
  "Comunicação Oral": [
    { label: "Domínio do tema.", values: [0, 0.4, 0.8, 1.2, 1.6] },
    { label: "Clareza da fala.", values: [0, 0.4, 0.8, 1.2, 1.6] },
    { label: "Expressão e entonação.", values: [0, 0.3, 0.6, 0.9, 1.2] },
    { label: "Postura e linguagem corporal.", values: [0, 0.3, 0.6, 0.9, 1.2] },
    { label: "Uso de recursos visuais.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Tempo de apresentação.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Conexão com a plateia.", values: [0, 0.2, 0.4, 0.6, 0.8] },
    { label: "Respostas às perguntas.", values: [0, 0.3, 0.6, 0.9, 1.2] },
    { label: "Relevância do conteúdo.", values: [0, 0.3, 0.6, 0.9, 1.2] },
  ],
  IFTECH: [
    {
      label: "Objetivos e métodos bem definidos?",
      values: [0, 0.25, 0.5, 1.0, 1.5],
    },
    {
      label: "Protótipo visa solucionar problemas?",
      values: [0, 0.5, 1.0, 1.5, 2.0],
    },
    {
      label: "Sustentabilidade e responsabilidade social?",
      values: [0, 0.25, 0.5, 0.75, 1.0],
    },
    {
      label: "Inovação e criatividade do protótipo?",
      values: [0, 0.5, 1.0, 1.5, 2.0],
    },
    { label: "Apresentação do protótipo.", values: [0, 0.25, 0.5, 1.0, 1.5] },
    {
      label: "Contribuição para a prática educativa.",
      values: [0, 0.5, 1.0, 1.5, 2.0],
    },
  ],
  Robótica: [
    { label: "Funcionalidade do robô.", values: [0, 0.25, 0.5, 1.0, 1.5] },
    { label: "Estrutura e montagem.", values: [0, 0.5, 1.0, 1.5, 2.0] },
    {
      label: "Programação e lógica aplicada.",
      values: [0, 0.25, 0.5, 0.75, 1.0],
    },
    { label: "Inovação e criatividade.", values: [0, 0.5, 1.0, 1.5, 2.0] },
    { label: "Demonstração prática.", values: [0, 0.25, 0.5, 1.0, 1.5] },
    { label: "Viabilidade técnica.", values: [0, 0.5, 1.0, 1.5, 2.0] },
  ],
};

export default function EvaluationScreen({ route, navigation }: Props) {
  const { trabalhoId, titulo, evaluationId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState<
    { label: string; values: number[] }[]
  >([]);
  const [notas, setNotas] = useState<(number | null)[]>([]);
  const [comentarios, setComentarios] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const pSnap = await getDoc(doc(firestore, "trabalhos", trabalhoId));
        if (!pSnap.exists()) {
          Toast.show({ type: "error", text1: "Projeto não encontrado" });
          return navigation.goBack();
        }
        const { categoria } = pSnap.data() as any;
        const defs = CRITERIA_DEFS[categoria];
        if (!defs) {
          Toast.show({
            type: "error",
            text1: "Categoria não suportada",
            text2: categoria,
          });
          return navigation.goBack();
        }
        if (!active) return;
        setCriteria(defs);

        let baseNotas = Array(defs.length).fill(null as number | null);
        let baseComent = "";
        if (evaluationId) {
          const eSnap = await getDoc(
            doc(firestore, "avaliacoes", evaluationId)
          );
          if (eSnap.exists()) {
            const d = eSnap.data();
            baseNotas = defs.map((_, i) => d.notas?.[`C${i + 1}`] ?? null);
            baseComent = d.comentarios || "";
          }
        }
        if (!active) return;
        setNotas(baseNotas);
        setComentarios(baseComent);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Erro ao carregar",
          text2: error.message,
        });
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [trabalhoId, evaluationId, navigation]);

  const handlePress = (idx: number, value: number) => {
    const arr = [...notas];
    arr[idx] = value;
    setNotas(arr);
  };

  const handleSubmit = async () => {
    if (notas.some((n) => n === null)) {
      return Toast.show({
        type: "error",
        text1: "Preencha todos os critérios",
      });
    }
    setLoading(true);
    try {
      const notasObj: Record<string, number> = {};
      notas.forEach((n, i) => {
        notasObj[`C${i + 1}`] = n!;
      });

      const evalRef = evaluationId
        ? doc(firestore, "avaliacoes", evaluationId)
        : collection(firestore, "avaliacoes");

      const payload = {
        trabalhoId,
        avaliadorId: user!.uid,
        evaluatorEmail: user!.email, // ← novo campo com o e-mail
        notas: notasObj,
        comentarios,
        timestamp: serverTimestamp(),
      };

      if (evaluationId) {
        await updateDoc(evalRef as any, payload);
      } else {
        await addDoc(evalRef as any, payload);
      }
      Toast.show({ type: "success", text1: "Avaliação salva com sucesso" });
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao salvar",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{titulo}</Text>
      {criteria.map((c, idx) => (
        <View key={idx} style={styles.field}>
          <Text style={styles.label}>{c.label}</Text>
          <View style={styles.buttonsRow}>
            {c.values.map((v) => (
              <Button
                key={v}
                title={v.toString()}
                onPress={() => handlePress(idx, v)}
                color={notas[idx] === v ? "#007AFF" : undefined}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.label}>Comentários (opcional)</Text>
        <TextInput
          value={comentarios}
          onChangeText={setComentarios}
          multiline
          style={[styles.input, { height: 100 }]}
        />
      </View>
      <Button title="Salvar Avaliação" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { marginBottom: 4 },
  buttonsRow: { flexDirection: "row", flexWrap: "wrap" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4 },
});
