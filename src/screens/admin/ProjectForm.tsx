// src/screens/admin/ProjectForm.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Input from "../../components/Input";
import SubmitButton from "../../components/SubmitButton";
import { firestore } from "../../services/firebase";
import {
  addDoc,
  updateDoc,
  doc,
  collection,
  DocumentData,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminParamList } from "../../navigation/AdminStack";

type Props = NativeStackScreenProps<AdminParamList, "ProjectForm">;

// Estado do formulário
interface FormState {
  titulo: string;
  alunos: string; // ';'-separated
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
}

const initialState: FormState = {
  titulo: "",
  alunos: "",
  orientador: "",
  turma: "",
  anoSemestre: "",
  categoria: "",
};

export default function ProjectForm({ navigation, route }: Props) {
  // Se vier via params, tem dados de edição
  const project = route.params?.project as
    | (FormState & { id: string; alunos: string[] })
    | undefined;

  const [data, setData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [loading, setLoading] = useState<boolean>(false);

  // Quando o form ganha foco, limpamos erros
  useFocusEffect(
    useCallback(() => {
      setErrors({});
    }, [])
  );

  // Se estivermos editando, preenchemos o estado
  useEffect(() => {
    if (project) {
      setData({
        titulo: project.titulo,
        alunos: project.alunos.join("; "),
        orientador: project.orientador,
        turma: project.turma,
        anoSemestre: project.anoSemestre,
        categoria: project.categoria,
      });
    }
  }, [project]);

  // Validação simples de campos obrigatórios
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!data.titulo.trim()) errs.titulo = "Título obrigatório";
    if (!data.alunos.trim()) errs.alunos = "Informe ao menos um aluno";
    if (!data.orientador.trim()) errs.orientador = "Orientador obrigatório";
    if (!data.turma.trim()) errs.turma = "Turma obrigatória";
    if (!data.anoSemestre.trim()) errs.anoSemestre = "Ano/Semestre obrigatório";
    if (!data.categoria) errs.categoria = "Categoria obrigatória";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Envio do formulário
  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    // Prepara o payload
    const payload = {
      titulo: data.titulo.trim(),
      alunos: data.alunos
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s),
      orientador: data.orientador.trim(),
      turma: data.turma.trim(),
      anoSemestre: data.anoSemestre.trim(),
      categoria: data.categoria,
    };

    try {
      if (project) {
        // Atualiza
        const ref = doc(firestore, "trabalhos", project.id);
        await updateDoc(ref, payload);
      } else {
        // Novo
        await addDoc(collection(firestore, "trabalhos"), payload);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro ao salvar projeto", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Input
        label="Título"
        value={data.titulo}
        onChangeText={(text) => setData((d) => ({ ...d, titulo: text }))}
        error={errors.titulo}
      />

      <Input
        label="Alunos (separados por ;)"
        value={data.alunos}
        onChangeText={(text) => setData((d) => ({ ...d, alunos: text }))}
        error={errors.alunos}
      />

      <Input
        label="Orientador"
        value={data.orientador}
        onChangeText={(text) => setData((d) => ({ ...d, orientador: text }))}
        error={errors.orientador}
      />

      <Input
        label="Turma"
        value={data.turma}
        onChangeText={(text) => setData((d) => ({ ...d, turma: text }))}
        error={errors.turma}
      />

      <Input
        label="Ano/Semestre"
        value={data.anoSemestre}
        onChangeText={(text) => setData((d) => ({ ...d, anoSemestre: text }))}
        error={errors.anoSemestre}
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Categoria</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={data.categoria}
            onValueChange={(val) => setData((d) => ({ ...d, categoria: val }))}
          >
            <Picker.Item label="Selecione..." value="" />
            <Picker.Item label="Ensino" value="Ensino" />
            <Picker.Item label="Pesquisa/Inovação" value="Pesquisa/Inovação" />
            <Picker.Item label="Extensão" value="Extensão" />
            <Picker.Item label="Comunicação Oral" value="Comunicação Oral" />
            <Picker.Item label="IFTECH" value="IFTECH" />
            <Picker.Item label="Robótica" value="Robótica" />
          </Picker>
        </View>
        {errors.categoria ? (
          <Text style={styles.errorText}>{errors.categoria}</Text>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <SubmitButton
          title={project ? "Atualizar Projeto" : "Salvar Projeto"}
          onPress={handleSave}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  pickerContainer: {
    marginVertical: 12,
  },
  pickerLabel: {
    marginBottom: 4,
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  errorText: {
    color: "red",
    marginTop: 4,
  },
  loader: {
    marginTop: 24,
  },
});
