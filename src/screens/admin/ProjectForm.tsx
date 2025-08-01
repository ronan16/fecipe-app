// src/screens/admin/ProjectForm.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Card,
  TextInput,
  Button,
  Title,
  HelperText,
  Divider,
  useTheme,
  Paragraph,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import { firestore } from "../../services/firebase";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminParamList } from "../../navigation/AdminStack";

type Props = NativeStackScreenProps<AdminParamList, "ProjectForm">;

const CATEGORIES = [
  "Ensino",
  "Pesquisa/Inovação",
  "Extensão",
  "Comunicação Oral",
  "IFTECH",
  "Robótica",
];

export default function ProjectForm({ route, navigation }: Props) {
  const theme = useTheme();
  const project = route.params?.project as any | undefined;

  const [titulo, setTitulo] = useState("");
  const [alunos, setAlunos] = useState("");
  const [orientador, setOrientador] = useState("");
  const [turma, setTurma] = useState("");
  const [anoSem, setAnoSem] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setTitulo(project.titulo);
      setAlunos(project.alunos.join("; "));
      setOrientador(project.orientador);
      setTurma(project.turma);
      setAnoSem(project.anoSemestre);
      setCategoria(project.categoria);
    }
  }, [project]);

  const validate = () => {
    if (
      !titulo.trim() ||
      !alunos.trim() ||
      !orientador.trim() ||
      !turma.trim() ||
      !anoSem.trim() ||
      !categoria
    ) {
      Toast.show({
        type: "error",
        text1: "Preencha todos os campos obrigatórios",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const payload = {
      titulo: titulo.trim(),
      alunos: alunos
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s),
      orientador: orientador.trim(),
      turma: turma.trim(),
      anoSemestre: anoSem.trim(),
      categoria,
    };

    try {
      if (project) {
        await updateDoc(doc(firestore, "trabalhos", project.id), payload);
      } else {
        await addDoc(collection(firestore, "trabalhos"), payload);
      }
      Toast.show({ type: "success", text1: "Projeto salvo com sucesso" });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Erro ao salvar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.header}>
          {project ? "Editar Projeto" : "Novo Projeto"}
        </Title>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Título"
              value={titulo}
              onChangeText={setTitulo}
              mode="outlined"
              style={styles.field}
            />
            <HelperText type="error" visible={!titulo.trim()}>
              Obrigatório
            </HelperText>

            <TextInput
              label="Alunos (separados por `;`)"
              value={alunos}
              onChangeText={setAlunos}
              mode="outlined"
              multiline
              style={styles.field}
            />
            <HelperText type="error" visible={!alunos.trim()}>
              Obrigatório
            </HelperText>

            <TextInput
              label="Orientador"
              value={orientador}
              onChangeText={setOrientador}
              mode="outlined"
              style={styles.field}
            />
            <HelperText type="error" visible={!orientador.trim()}>
              Obrigatório
            </HelperText>

            <Divider style={styles.divider} />

            <TextInput
              label="Turma"
              value={turma}
              onChangeText={setTurma}
              mode="outlined"
              style={styles.field}
            />
            <HelperText type="error" visible={!turma.trim()}>
              Obrigatório
            </HelperText>

            <TextInput
              label="Ano/Semestre"
              value={anoSem}
              onChangeText={setAnoSem}
              mode="outlined"
              style={styles.field}
            />
            <HelperText type="error" visible={!anoSem.trim()}>
              Obrigatório
            </HelperText>

            <Divider style={styles.divider} />

            <Paragraph style={styles.label}>Categoria</Paragraph>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={categoria}
                onValueChange={setCategoria}
                style={styles.picker}
              >
                <Picker.Item label="Selecione..." value="" />
                {CATEGORIES.map((c) => (
                  <Picker.Item key={c} label={c} value={c} />
                ))}
              </Picker>
            </View>
            <HelperText type="error" visible={!categoria}>
              Obrigatório
            </HelperText>
          </Card.Content>
        </Card>

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 24 }}
            color={theme.colors.primary}
          />
        ) : (
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            Salvar
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 16, textAlign: "center" },
  card: { borderRadius: 8, padding: 8, marginBottom: 16 },
  field: { marginBottom: 8 },
  divider: { marginVertical: 8 },
  label: { marginTop: 8, marginBottom: 4, fontSize: 14, fontWeight: "500" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    overflow: "hidden",
  },
  picker: { width: "100%" },
  submit: { marginTop: 8, borderRadius: 24 },
  submitContent: { paddingVertical: 6 },
});
