// src/navigation/AdminStack.tsx

import React from "react";
import { View } from "react-native"; // <— importe View
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LogoutButton from "../components/LogoutButton";
import AdminHome from "../screens/admin/AdminHome";
import ProjectsScreen from "../screens/admin/ProjectsScreen";
import ProjectForm from "../screens/admin/ProjectForm";
import EvaluatorsScreen from "../screens/admin/EvaluatorsScreen";
import EvaluatorForm from "../screens/admin/EvaluatorForm";
import ReportsScreen from "../screens/admin/ReportsScreen";
import ProjectReportDetail from "../screens/admin/ProjectReportDetail";

export type Project = {
  id: string;
  titulo: string;
  alunos: string[];
  orientador: string;
  turma: string;
  anoSemestre: string;
  categoria: string;
};

export type Evaluator = {
  id: string;
  role: string;
  name?: string;
};

export type AdminParamList = {
  Home: undefined;
  Projects: undefined;
  ProjectForm: { project?: Project };
  Evaluators: undefined;
  EvaluatorForm: { evaluator?: Evaluator };
  Reports: undefined;
  ProjectReportDetail: { project: Project };
};

const Stack = createNativeStackNavigator<AdminParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <Stack.Screen name="Home" component={AdminHome} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen
        name="ProjectForm"
        component={ProjectForm}
        options={({ route }) => ({
          title: route.params?.project ? "Editar Projeto" : "Novo Projeto",
        })}
      />
      <Stack.Screen name="Evaluators" component={EvaluatorsScreen} />
      <Stack.Screen
        name="EvaluatorForm"
        component={EvaluatorForm}
        options={({ route }) => ({
          title: route.params?.evaluator
            ? "Editar Avaliador"
            : "Novo Avaliador",
        })}
      />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen
        name="ProjectReportDetail"
        component={ProjectReportDetail}
        options={{ title: "Detalhe do Relatório" }}
      />
    </Stack.Navigator>
  );
}
