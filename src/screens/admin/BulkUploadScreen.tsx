import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import XLSX from "xlsx";
import { firestore } from "../../services/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";

export default function BulkUploadScreen() {
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      copyToCacheDirectory: true,
    });

    // Usuário cancelou?
    if ("cancelled" in res && res.cancelled) return;
    // ou API antiga:
    if ("type" in res && res.type === "cancel") return;

    // Verifica URI
    if (typeof (res as any).uri !== "string") {
      Toast.show({ type: "error", text1: "Arquivo inválido" });
      return;
    }
    const uri = (res as any).uri;

    setLoading(true);
    try {
      // Lê conteúdo em base64
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Converte para workbook
      const wb = XLSX.read(b64, { type: "base64" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      // Inicia batch
      const batch = writeBatch(firestore);
      rows.forEach((row) => {
        const { titulo, alunos, orientador, turma, anoSemestre, categoria } =
          row;
        if (!titulo) return;
        const alunosArr = String(alunos)
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        const ref = doc(collection(firestore, "trabalhos"));
        batch.set(ref, {
          titulo,
          alunos: alunosArr,
          orientador,
          turma,
          anoSemestre,
          categoria,
        });
      });

      await batch.commit();
      Toast.show({
        type: "success",
        text1: "Importação concluída",
        text2: `${rows.length} projetos importados`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao importar",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importar Projetos em Lote</Text>
      <Button
        title="Selecionar arquivo CSV/XLSX"
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
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
  },
});
