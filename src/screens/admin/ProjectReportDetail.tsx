// src/screens/admin/ProjectReportDetail.tsx

import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import {
  Text,
  Card,
  Badge,
  Button,
  Divider,
  useTheme,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../../services/firebase";
import type { AdminParamList } from "../../navigation/AdminStack";
import { exportProjectReportPDF } from "../../utils/projectReportTemplate";

const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

type Props = NativeStackScreenProps<AdminParamList, "ProjectReportDetail">;

interface Evaluation {
  id: string;
  trabalhoId: string;
  avaliadorId: string;
  evaluatorEmail?: string;
  notas: Record<string, number>;
  comentarios?: string;
  timestamp?: any;
}

interface Project {
  id: string;
  titulo: string;
  alunos: string[];
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
}

export default function ProjectReportDetail({ route, navigation }: Props) {
  const theme = useTheme();
  const project = route.params.project as Project;
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluatorNameCache, setEvaluatorNameCache] = useState<
    Record<string, string>
  >({});

  const fetchUserName = useCallback(
    async (idOrEmail: string) => {
      if (evaluatorNameCache[idOrEmail]) return evaluatorNameCache[idOrEmail];
      try {
        const snap = await getDoc(doc(firestore, "users", idOrEmail));
        if (snap.exists()) {
          const data = snap.data() as any;
          const name = data.name || idOrEmail;
          setEvaluatorNameCache((c) => ({ ...c, [idOrEmail]: name }));
          return name;
        }
      } catch {}
      return idOrEmail;
    },
    [evaluatorNameCache]
  );

  const computeFinalScore = (project: Project, evaluations: Evaluation[]) => {
    if (!evaluations.length) return 0;
    const k = ["IFTECH", "Robótica"].includes(project.categoria) ? 6 : 9;
    const evalCount = evaluations.length;

    // Agrupa por critério
    const perCriterion: number[][] = [];
    for (let i = 1; i <= k; i++) {
      const key = `C${i}`;
      perCriterion[i - 1] = evaluations.map((e) => e.notas[key] ?? 0);
    }

    // Calcula scores padronizados e ponderados por avaliação
    const scoresPerEval = Array(evalCount).fill(0);
    for (let i = 0; i < k; i++) {
      const arr = perCriterion[i];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd =
        Math.sqrt(
          arr.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
            arr.length
        ) || 1;
      arr.forEach((v, idx) => {
        const normalized = (v - mean) / sd + Z;
        const weight = CRITERIA_WEIGHTS[i] ?? 1;
        scoresPerEval[idx] += normalized * weight;
      });
    }

    // Média das avaliações
    const finalScore =
      scoresPerEval.reduce((a, b) => a + b, 0) / scoresPerEval.length;
    return finalScore;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(firestore, "avaliacoes"),
          where("trabalhoId", "==", project.id)
        )
      );
      const list: Evaluation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      await Promise.all(
        list.map(async (e) => {
          const email = e.evaluatorEmail || e.avaliadorId;
          await fetchUserName(email);
        })
      );

      setEvals(list);
      const final = computeFinalScore(project, list);
      setFinalScore(final);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao carregar relatório",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [project, fetchUserName]);

  useEffect(() => {
    load();
  }, [load]);

  const top3 = React.useMemo(() => {
    const enriched = evals
      .map((e) => {
        const total = Object.values(e.notas || {}).reduce((a, b) => a + b, 0);
        return { ...e, total };
      })
      .sort((a, b) => b.total - a.total);
    const slice = enriched.slice(0, 3);
    while (slice.length < 3) {
      slice.push({
        id: `empty-${slice.length}`,
        trabalhoId: project.id,
        avaliadorId: "none",
        evaluatorEmail: "Sem avaliador",
        notas: {},
        comentarios: "",
        total: 0,
      } as any);
    }
    return slice;
  }, [evals, project.id]);

  const handleExportPDF = async () => {
    const payload = {
      project: {
        titulo: project.titulo,
        alunos: project.alunos,
        orientador: project.orientador,
        categoria: project.categoria,
        turma: project.turma,
        anoSemestre: project.anoSemestre,
      },
      finalScore: finalScore ?? 0,
      evaluations: await Promise.all(
        evals.map(async (e) => {
          const evaluatorEmail = e.evaluatorEmail || e.avaliadorId;
          const evaluatorName = await fetchUserName(evaluatorEmail);
          return {
            evaluatorName,
            evaluatorEmail,
            notas: e.notas,
            comentarios: e.comentarios,
            total: Object.values(e.notas || {}).reduce((a, b) => a + b, 0),
          };
        })
      ),
    };
    await exportProjectReportPDF(payload);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        {project.titulo}
      </Text>
      <Text variant="bodySmall" style={styles.meta}>
        {project.alunos.join(", ")} • {project.categoria} • {project.orientador}{" "}
        • {project.turma} • {project.anoSemestre}
      </Text>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sub}>
            Nota final calculada:
          </Text>
          <View style={styles.scoreRow}>
            <Badge style={styles.finalBadge}>
              {finalScore !== null ? finalScore.toFixed(2) : "--"}
            </Badge>
            <Text style={{ marginLeft: 12, flex: 1 }}>
              Aplicando padronização por critério e pesos conforme edital.
            </Text>
          </View>
          <Button
            mode="outlined"
            onPress={handleExportPDF}
            style={styles.exportBtn}
          >
            Exportar relatório (PDF)
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Top 3 Avaliadores
        </Text>
        {top3.map((ev, i) => {
          const total = (ev as any).total ?? 0;
          const evaluatorEmail = ev.evaluatorEmail || ev.avaliadorId;
          const evaluatorName =
            evaluatorNameCache[evaluatorEmail] || evaluatorEmail;
          return (
            <Card key={i} style={styles.evalCard}>
              <Card.Content>
                <View style={styles.evalHeader}>
                  <Text variant="titleSmall" style={styles.evalRank}>
                    {i + 1}º Avaliador
                  </Text>
                  <Badge style={styles.evalTotalBadge}>
                    {`Total: ${total.toFixed(2)}`}
                  </Badge>
                </View>
                <Text>
                  Nome: {evaluatorName} ({evaluatorEmail})
                </Text>
                {ev.notas && Object.keys(ev.notas).length ? (
                  <>
                    <Divider style={{ marginVertical: 6 }} />
                    {Object.entries(ev.notas).map(([crit, val]) => (
                      <View key={crit} style={styles.critRow}>
                        <Text style={styles.critLabel}>{crit}</Text>
                        <Text>{val.toFixed(2)}</Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text>Sem avaliação</Text>
                )}
                {ev.comentarios ? (
                  <>
                    <Divider style={{ marginVertical: 6 }} />
                    <Text style={styles.commentTitle}>Comentários:</Text>
                    <Text>{ev.comentarios}</Text>
                  </>
                ) : null}
              </Card.Content>
            </Card>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Todas as Avaliações
        </Text>
        {evals.map((ev) => {
          const total = Object.values(ev.notas || {}).reduce(
            (a, b) => a + b,
            0
          );
          const evaluatorEmail = ev.evaluatorEmail || ev.avaliadorId;
          const evaluatorName =
            evaluatorNameCache[evaluatorEmail] || evaluatorEmail;

          return (
            <Card key={ev.id} style={styles.evalCard}>
              <Card.Content>
                <View style={styles.evalHeader}>
                  <Text variant="titleSmall" style={styles.evalRank}>
                    Avaliador: {evaluatorName}
                  </Text>
                  <Badge>{`Total: ${total.toFixed(2)}`}</Badge>
                </View>
                <Text variant="bodySmall" style={styles.small}>
                  Email: {evaluatorEmail}
                </Text>
                <Text variant="bodySmall" style={styles.small}>
                  ID da avaliação: {ev.id}
                </Text>

                <Divider style={{ marginVertical: 6 }} />
                {Object.entries(ev.notas || {}).map(([crit, val]) => (
                  <View key={crit} style={styles.critRow}>
                    <Text style={styles.critLabel}>{crit}</Text>
                    <Text>{val.toFixed(2)}</Text>
                  </View>
                ))}
                {ev.comentarios ? (
                  <>
                    <Divider style={{ marginVertical: 6 }} />
                    <Text style={styles.commentTitle}>Comentário:</Text>
                    <Text>{ev.comentarios}</Text>
                  </>
                ) : null}
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#fff" },
  title: { marginBottom: 4 },
  meta: { fontSize: 12, color: "#555", marginBottom: 12 },
  summaryCard: { marginBottom: 16, borderRadius: 8 },
  sub: { fontWeight: "600" },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  finalBadge: {
    fontSize: 16,
    padding: 8,
    backgroundColor: "#007AFF",
    color: "#fff",
  },
  exportBtn: { marginTop: 8, borderRadius: 20 },
  section: { marginTop: 16 },
  sectionTitle: { marginBottom: 8 },
  evalCard: { marginBottom: 12, borderRadius: 8 },
  evalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  evalRank: { fontWeight: "600" },
  evalTotalBadge: { backgroundColor: "#4CAF50" },
  critRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  critLabel: { fontWeight: "600" },
  commentTitle: { fontWeight: "600", marginTop: 4 },
  small: { fontSize: 12, color: "#555" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
