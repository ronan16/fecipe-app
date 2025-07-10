// src/screens/admin/BulkUploadScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import Papa from "papaparse";
import { firestore } from "../../services/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

// Interface para tipagem das linhas do CSV
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

  const handlePickFile = async () => {
    console.log("🔍 handlePickFile: start");
    try {
      // 1) Abre o picker sem restrição de MIME
      const res = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });
      console.log("🔍 picker result:", res);

      // 2) Cancelamento
      if ("canceled" in res && res.canceled) {
        console.log("🔍 picker canceled");
        return;
      }

      // 3) Extrai uri e name (web e mobile)
      const file: any = (res as any).assets?.[0] ?? res;
      const uri: string | undefined = file.uri;
      const name: string | undefined = file.name;
      console.log("🔍 uri:", uri, "name:", name);

      if (!uri || !name) {
        Toast.show({
          type: "error",
          text1: "Arquivo inválido",
          text2: "URI ou nome ausente",
        });
        return;
      }

      // 4) Valida extensão CSV
      const lc = name.toLowerCase();
      if (!lc.endsWith(".csv")) {
        Toast.show({
          type: "error",
          text1: "Apenas CSV suportado",
          text2: name,
        });
        return;
      }

      setLoading(true);

      // 5) Leitura do conteúdo (web vs native)
      let fileContent: string;
      if (Platform.OS === "web") {
        console.log("🔍 Web: fetch text");
        fileContent = await fetch(uri).then((r) => r.text());
      } else {
        console.log("🔍 Native: read UTF8");
        fileContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      // 6) Parse CSV
      const result = Papa.parse<TrabalhoRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        console.error("❌ CSV parse errors:", result.errors);
        Toast.show({
          type: "error",
          text1: "Erro no CSV",
          text2: result.errors[0].message,
        });
        return;
      }

      const rows = result.data;
      console.log("🔍 Rows:", rows.length);

      // 7) Carrega títulos existentes
      const existingSnap = await getDocs(collection(firestore, "trabalhos"));
      const existingTitles = new Set<string>();
      existingSnap.docs.forEach((d) => {
        const data = d.data();
        if (typeof data.titulo === "string") {
          existingTitles.add(data.titulo.trim().toLowerCase());
        }
      });

      // 8) Prepara batch com validação de unicidade
      let imported = 0;
      let skipped = 0;
      const batch = writeBatch(firestore);

      rows.forEach((row, idx) => {
        const tituloRaw = row.titulo?.trim();
        const alunosRaw = row.alunos?.trim();
        if (!tituloRaw || !alunosRaw) {
          console.warn(`⚠️ Linha ${idx + 1} incompleta `, row);
          return;
        }
        const lower = tituloRaw.toLowerCase();
        if (existingTitles.has(lower)) {
          skipped++;
          return;
        }
        existingTitles.add(lower);

        const alunosArr = alunosRaw
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);

        const ref = doc(collection(firestore, "trabalhos"));
        batch.set(ref, {
          titulo: tituloRaw,
          alunos: alunosArr,
          orientador: row.orientador,
          turma: row.turma,
          anoSemestre: row.anoSemestre,
          categoria: row.categoria,
        });

        imported++;
      });

      if (imported > 0) {
        await batch.commit();
      }

      Toast.show({
        type: "success",
        text1: "Importação concluída",
        text2: ` ${imported} importados, ${skipped} ignorados `,
      });
    } catch (error: any) {
      console.error("❌ Import error:", error);
      Toast.show({
        type: "error",
        text1: "Erro ao importar",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      console.log("🔍 handlePickFile: end");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importar Projetos em Lote (CSV)</Text>
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
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 18, marginBottom: 12, textAlign: "center" },
});
