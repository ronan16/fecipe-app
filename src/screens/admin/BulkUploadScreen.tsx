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
import { collection, writeBatch, doc } from "firebase/firestore";

type TrabalhoRow = {
  titulo: string;
  alunos: string;
  orientador?: string;
  turma?: string;
  anoSemestre?: string;
  categoria?: string;
};

export default function BulkUploadScreen() {
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    console.log("🔍 handlePickFile: start");
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv"],
        copyToCacheDirectory: true,
      });
      console.log("🔍 picker result:", res);

      if ("canceled" in res && res.canceled) {
        console.log("🔍 picker canceled");
        return;
      }

      const file = res.assets?.[0] || res;
      const { uri, name } = file;

      if (!uri || !name) {
        Toast.show({
          type: "error",
          text1: "Arquivo inválido",
          text2: "uri/name inválidos",
        });
        return;
      }

      const lc = name.toLowerCase();
      if (!lc.endsWith(".csv")) {
        Toast.show({
          type: "error",
          text1: "Apenas arquivos CSV são suportados",
          text2: name,
        });
        return;
      }

      setLoading(true);

      let fileContent = "";
      if (Platform.OS === "web") {
        console.log("🔍 lendo arquivo via fetch no Web");
        const response = await fetch(uri);
        fileContent = await response.text();
      } else {
        console.log("🔍 lendo arquivo local com FileSystem no Android/iOS");
        fileContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const result = Papa.parse<TrabalhoRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length) {
        console.error("❌ Erros ao fazer parse do CSV:", result.errors);
        Toast.show({
          type: "error",
          text1: "Erro no arquivo CSV",
          text2: result.errors[0].message,
        });
        return;
      }

      const rows = result.data;
      console.log("🔍 Total de linhas:", rows.length);

      const batch = writeBatch(firestore);
      rows.forEach((row, idx) => {
        const { titulo, alunos, orientador, turma, anoSemestre, categoria } =
          row;

        if (!titulo || !alunos) {
          console.warn(`⚠️ Linha ${idx + 1} com dados incompletos`, row);
          return;
        }

        const alunosArr = alunos
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
      console.error("❌ Erro na importação:", error);
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
