// src/screens/admin/BulkUploadScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import Toast from "react-native-toast-message";
import Papa from "papaparse";
import { firestore } from "../../services/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

// Categorias permitidas (mesma lista usada no formulário)
const VALID_CATEGORIES = [
  "Ensino",
  "Pesquisa/Inovação",
  "Extensão",
  "IFTECH",
  "Robótica",
  "Comunicação Oral",
];

interface TrabalhoRow {
  titulo: string;
  alunos: string;
  orientador?: string;
  turma?: string;
  anoSemestre?: string;
  categoria?: string;
}

export default function BulkUploadScreen() {
  const [loading, setLoading] = useState(false);

  // Carrega títulos já existentes
  const loadExistingTitles = async (): Promise<Set<string>> => {
    const snap = await getDocs(collection(firestore, "trabalhos"));
    const titles = new Set<string>();
    snap.docs.forEach((d) => {
      const t = d.data().titulo;
      if (typeof t === "string") titles.add(t.trim().toLowerCase());
    });
    return titles;
  };

  // Lê e parseia CSV via PapaParse
  const parseCsv = async (uri: string): Promise<TrabalhoRow[]> => {
    const resp = await fetch(uri);
    const text = await resp.text();
    const result = Papa.parse<TrabalhoRow>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length) {
      throw new Error(result.errors[0].message);
    }
    return result.data;
  };

  // Valida uma linha
  const validateRow = (
    row: TrabalhoRow,
    existing: Set<string>
  ): { valid: boolean; reason?: "duplicate" | "category" | "incomplete" } => {
    const t = row.titulo?.trim();
    const a = row.alunos?.trim();
    if (!t || !a) return { valid: false, reason: "incomplete" };
    if (existing.has(t.toLowerCase()))
      return { valid: false, reason: "duplicate" };
    if (!VALID_CATEGORIES.includes(row.categoria || "")) {
      return { valid: false, reason: "category" };
    }
    return { valid: true };
  };

  const handlePickFile = async () => {
    try {
      setLoading(true);

      // 1) Seleciona arquivo
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });
      // 2) Se cancelou, sai
      if ((result as any).canceled) {
        setLoading(false);
        return;
      }

      // 3) Extrai uri e name via any, cobrindo web e mobile
      const anyRes = result as any;
      let uri: string | undefined = anyRes.uri;
      let name: string | undefined = anyRes.name;
      if (!uri && Array.isArray(anyRes.assets) && anyRes.assets.length > 0) {
        uri = anyRes.assets[0].uri;
        name = anyRes.assets[0].name;
      }

      // 4) Valida uri/name e extensão
      if (!uri || !name || !name.toLowerCase().endsWith(".csv")) {
        Toast.show({
          type: "error",
          text1: "Selecione um arquivo CSV válido",
          text2: name ?? "nenhum arquivo",
        });
        setLoading(false);
        return;
      }

      // 5) Parse CSV
      const rows = await parseCsv(uri);

      // 6) Load existing titles
      const existingTitles = await loadExistingTitles();

      // 7) Prepara batch e contadores
      const batch = writeBatch(firestore);
      let inserted = 0,
        dupes = 0,
        invalidCat = 0,
        incomplete = 0;

      // 8) Itera e valida cada linha
      rows.forEach((row) => {
        const check = validateRow(row, existingTitles);
        if (!check.valid) {
          if (check.reason === "duplicate") dupes++;
          else if (check.reason === "category") invalidCat++;
          else if (check.reason === "incomplete") incomplete++;
          return;
        }
        // adiciona ao batch
        const alunosArr = row.alunos
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        const ref = doc(collection(firestore, "trabalhos"));
        batch.set(ref, {
          titulo: row.titulo.trim(),
          alunos: alunosArr,
          orientador: row.orientador,
          turma: row.turma,
          anoSemestre: row.anoSemestre,
          categoria: row.categoria,
        });
        existingTitles.add(row.titulo.trim().toLowerCase());
        inserted++;
      });

      // 9) Commit se necessário
      if (inserted > 0) await batch.commit();

      // 10) Exibe toast de resumo
      const parts: string[] = [];
      if (inserted) parts.push(`${inserted} inserido(s)`);
      if (dupes) parts.push(`${dupes} duplicado(s)`);
      if (invalidCat) parts.push(`${invalidCat} categoria(s) inválida(s)`);
      if (incomplete) parts.push(`${incomplete} incompleto(s)`);
      Toast.show({
        type: inserted > 0 ? "success" : "error",
        text1: "Importação concluída",
        text2: parts.join(" • ") || "Nenhum registro válido",
        visibilityTime: 5000,
      });
    } catch (err: any) {
      console.error("BulkUpload error:", err);
      Toast.show({
        type: "error",
        text1: "Erro ao importar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📥 Importar Projetos em Lote (CSV)</Text>
      <Button
        title="Selecionar Arquivo CSV"
        onPress={handlePickFile}
        disabled={loading}
      />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
});
