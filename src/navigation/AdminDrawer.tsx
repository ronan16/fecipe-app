// src/navigation/AdminDrawer.tsx

import React from "react";
import { View } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import LogoutButton from "../components/LogoutButton";

import DashboardScreen from "../screens/admin/DashboardScreen";
import ProjectsScreen from "../screens/admin/ProjectsScreen";
import ProjectForm from "../screens/admin/ProjectForm";
import BulkUploadScreen from "../screens/admin/BulkUploadScreen";
import EvaluatorsScreen from "../screens/admin/EvaluatorsScreen";
import EvaluatorForm from "../screens/admin/EvaluatorForm";
import ReportsScreen from "../screens/admin/ReportsScreen";
import ProjectReportDetail from "../screens/admin/ProjectReportDetail";

/** ROTAS DO DRAWER **/
export type AdminDrawerParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Evaluators: undefined;
  Reports: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

/** STACK DE PROJETOS **/
export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectForm: { project?: any };
  BulkUpload: undefined;
};

const ProjectsStack = createNativeStackNavigator<ProjectsStackParamList>();

function ProjectsStackNavigator() {
  return (
    <ProjectsStack.Navigator
      initialRouteName="ProjectsList"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <ProjectsStack.Screen
        name="ProjectsList"
        component={ProjectsScreen}
        options={{ title: "Projetos" }}
      />
      <ProjectsStack.Screen
        name="ProjectForm"
        component={ProjectForm}
        options={({ route }) => ({
          title: route.params?.project ? "Editar Projeto" : "Novo Projeto",
        })}
      />
      <ProjectsStack.Screen
        name="BulkUpload"
        component={BulkUploadScreen}
        options={{ title: "Novo Projeto em Lote" }}
      />
    </ProjectsStack.Navigator>
  );
}

/** STACK DE AVALIADORES **/
export type EvaluatorsStackParamList = {
  EvaluatorsList: undefined;
  EvaluatorForm: { evaluator?: any };
};

const EvaluatorsStack = createNativeStackNavigator<EvaluatorsStackParamList>();

function EvaluatorsStackNavigator() {
  return (
    <EvaluatorsStack.Navigator
      initialRouteName="EvaluatorsList"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <EvaluatorsStack.Screen
        name="EvaluatorsList"
        component={EvaluatorsScreen}
        options={{ title: "Avaliadores" }}
      />
      <EvaluatorsStack.Screen
        name="EvaluatorForm"
        component={EvaluatorForm}
        options={({ route }) => ({
          title: route.params?.evaluator
            ? "Editar Avaliador"
            : "Novo Avaliador",
        })}
      />
    </EvaluatorsStack.Navigator>
  );
}

/** STACK DE RELATÓRIOS **/
export type ReportsStackParamList = {
  ReportsList: undefined;
  ProjectReportDetail: { project: any };
};

const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();

function ReportsStackNavigator() {
  return (
    <ReportsStack.Navigator
      initialRouteName="ReportsList"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <ReportsStack.Screen
        name="ReportsList"
        component={ReportsScreen}
        options={{ title: "Relatórios" }}
      />
      <ReportsStack.Screen
        name="ProjectReportDetail"
        component={ProjectReportDetail}
        options={{ title: "Detalhe do Relatório" }}
      />
    </ReportsStack.Navigator>
  );
}

/** DRAWER PRINCIPAL **/
export default function AdminDrawer() {
  const { signOutUser } = useAuth();

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => (
        <DrawerContentScrollView {...props}>
          <DrawerItemList {...props} />
          <DrawerItem
            label="Sair"
            onPress={signOutUser}
            inactiveTintColor="red"
          />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Início" }}
      />
      <Drawer.Screen
        name="Projects"
        component={ProjectsStackNavigator}
        options={{ title: "Projetos" }}
      />
      <Drawer.Screen
        name="Evaluators"
        component={EvaluatorsStackNavigator}
        options={{ title: "Avaliadores" }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsStackNavigator}
        options={{ title: "Relatórios" }}
      />
    </Drawer.Navigator>
  );
}
