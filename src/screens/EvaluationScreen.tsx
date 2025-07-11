// src/screens/EvaluationScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  Card,
  Button as PaperButton,
  TextInput,
  Title,
  Paragraph,
} from "react-native-paper";
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

// Fórmula de padronização
const Z = 2.5;
// Pesos para critérios 1–9 (usados nas categorias de 9 critérios)
const WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];

// Critérios por categoria, conforme anexos I–VI do regulamento
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
      label: "Elaboração do banner (aspectos visuais, diagramação, coesão).",
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
      label: "Elaboração do banner (aspectos visuais, diagramação).",
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
      label: "Elaboração do banner (aspectos visuais, diagramação).",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Participação da comunidade externa.",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Potencial de impacto social/político/cultural.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Resultados obtidos e demandas atendidas.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Relação entre resultados e objetivos.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
    {
      label: "Interdisciplinaridade do projeto.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
  ],
  "Comunicação Oral": [
    {
      label: "Domínio do tema considerando fundamentação teórica.",
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
      label: "Elaboração dos slides (visuais, texto, coesão).",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Contribuição para experiência acadêmica e profissional.",
      values: [0, 0.3, 0.6, 0.9, 1.2],
    },
    {
      label: "Domínio e desenvoltura na apresentação.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Relação entre resultados e objetivos.",
      values: [0, 0.2, 0.4, 0.6, 0.8],
    },
    {
      label: "Relevância e contribuição social.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
    {
      label: "Domínio no uso de recursos audiovisuais.",
      values: [0, 0.2, 0.3, 0.4, 0.6],
    },
  ],
  IFTECH: [
    {
      label: "Objetivos e métodos bem definidos?",
      values: [0, 0.25, 0.5, 1.0, 1.5],
    },
    {
      label: "Protótipo visa solucionar problemas locais?",
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
    {
      label: "Desempenho na explicação do protótipo.",
      values: [0, 0.25, 0.5, 1.0, 1.5],
    },
    {
      label: "Viabilidade técnica e aplicabilidade.",
      values: [0, 0.5, 1.0, 1.5, 2.0],
    },
  ],
  Robótica: [
    {
      label: "Objetivos e métodos bem definidos?",
      values: [0, 0.25, 0.5, 1.0, 1.5],
    },
    { label: "Funcionalidade do robô.", values: [0, 0.5, 1.0, 1.5, 2.0] },
    {
      label: "Sustentabilidade e responsabilidade social?",
      values: [0, 0.25, 0.5, 0.75, 1.0],
    },
    { label: "Inovação e criatividade.", values: [0, 0.5, 1.0, 1.5, 2.0] },
    {
      label: "Desempenho na demonstração prática.",
      values: [0, 0.25, 0.5, 1.0, 1.5],
    },
    { label: "Viabilidade técnica.", values: [0, 0.5, 1.0, 1.5, 2.0] },
  ],
};

export default function EvaluationScreen({ route, navigation }: Props) {
  const { trabalhoId, titulo, evaluationId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState<(typeof CRITERIA_DEFS)["Ensino"]>(
    []
  );
  const [notas, setNotas] = useState<Array<number | null>>([]);
  const [comentarios, setComentarios] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "trabalhos", trabalhoId));
        if (!snap.exists()) {
          Toast.show({ type: "error", text1: "Projeto não encontrado" });
          return navigation.goBack();
        }
        const { categoria } = snap.data() as any;
        const defs = CRITERIA_DEFS[categoria];
        if (!defs) {
          Toast.show({ type: "error", text1: "Categoria inválida" });
          return navigation.goBack();
        }
        if (!active) return;
        setCriteria(defs);
        // init notas base
        const baseNotas = Array(defs.length).fill(null as number | null);
        let baseComent = "";
        if (evaluationId) {
          const eSnap = await getDoc(
            doc(firestore, "avaliacoes", evaluationId)
          );
          if (eSnap.exists()) {
            const data = eSnap.data();
            defs.forEach((_, i) => {
              baseNotas[i] = data.notas?.[`C${i + 1}`] ?? null;
            });
            baseComent = data.comentarios || "";
          }
        }
        if (!active) return;
        setNotas(baseNotas);
        setComentarios(baseComent);
      } catch (e: any) {
        Toast.show({ type: "error", text1: "Erro", text2: e.message });
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [trabalhoId, evaluationId]);

  const handleSelect = (idx: number, value: number) => {
    const arr = [...notas];
    arr[idx] = value;
    setNotas(arr);
  };

  const handleSubmit = async () => {
    if (notas.some((n) => n == null)) {
      Toast.show({ type: "error", text1: "Preencha todos os critérios" });
      return;
    }
    setLoading(true);
    try {
      const notasObj: Record<string, number> = {};
      notas.forEach((n, i) => (notasObj[`C${i + 1}`] = n!));
      const payload = {
        trabalhoId,
        avaliadorId: user!.uid,
        evaluatorEmail: user!.email,
        notas: notasObj,
        comentarios,
        timestamp: serverTimestamp(),
      };
      if (evaluationId) {
        await updateDoc(doc(firestore, "avaliacoes", evaluationId), payload);
      } else {
        await addDoc(collection(firestore, "avaliacoes"), payload);
      }
      Toast.show({ type: "success", text1: "Avaliação salva!" });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Erro ao salvar", text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const BUTTON_SIZE = (Dimensions.get("window").width - 48) / 5;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.header}>{titulo}</Title>

      {criteria.map((c, idx) => (
        <Card key={idx} style={styles.card} elevation={2}>
          <Card.Content>
            <Paragraph style={styles.criterionLabel}>{c.label}</Paragraph>
            <View style={styles.buttonsRow}>
              {c.values.map((v) => {
                const sel = notas[idx] === v;
                return (
                  <PaperButton
                    key={v}
                    mode={sel ? "contained" : "outlined"}
                    onPress={() => handleSelect(idx, v)}
                    style={[
                      styles.noteButton,
                      { width: BUTTON_SIZE },
                      sel && styles.noteButtonSelected,
                    ]}
                    labelStyle={
                      sel ? styles.noteLabelSelected : styles.noteLabel
                    }
                  >
                    {v.toFixed(1)}
                  </PaperButton>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.card} elevation={2}>
        <Card.Content>
          <Paragraph style={styles.criterionLabel}>
            Comentários (opcional)
          </Paragraph>
          <TextInput
            mode="outlined"
            value={comentarios}
            onChangeText={setComentarios}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </Card.Content>
      </Card>

      <PaperButton
        mode="contained"
        onPress={handleSubmit}
        contentStyle={styles.submitButton}
        style={styles.submitWrapper}
      >
        Salvar Avaliação
      </PaperButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, paddingBottom: 32, backgroundColor: "#fff" },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  card: { marginBottom: 16, borderRadius: 8 },
  criterionLabel: { fontSize: 16, marginBottom: 8, fontWeight: "600" },
  buttonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  noteButton: { marginBottom: 8 },
  noteButtonSelected: { backgroundColor: "#007AFF" },
  noteLabel: { color: "#007AFF" },
  noteLabelSelected: { color: "#fff" },
  textArea: { backgroundColor: "#f5f5f5", minHeight: 100 },
  submitWrapper: { marginTop: 24 },
  submitButton: { paddingVertical: 8 },
});
