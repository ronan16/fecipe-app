// src/navigation/EvaluatorDrawer.tsx

import React from "react";
import { View } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LogoutButton from "../components/LogoutButton";
import WorkListScreen from "../screens/WorkListScreen";
import EvaluationsListScreen from "../screens/evaluator/EvaluationsListScreen";
import EvaluationScreen from "../screens/EvaluationScreen";
import ProfileScreen from "../screens/evaluator/ProfileScreen";
import ResetPasswordScreen from "../screens/evaluator/ResetPasswordScreen";

// Rotas do Drawer
export type DrawerParamList = {
  Home: undefined;
  Evaluated: undefined;
  Profile: undefined;
};
const Drawer = createDrawerNavigator<DrawerParamList>();

// Rotas compartilhadas pelas stacks internas
export type EvaluatorStackParamList = {
  Works: undefined;
  Evaluate: { trabalhoId: string; titulo: string; evaluationId?: string };
  EvaluatedList: undefined;
  Profile: undefined;
  ResetPassword: undefined;
};

// Criação das três stacks
const HomeStack = createNativeStackNavigator<EvaluatorStackParamList>();
const EvaluatedStack = createNativeStackNavigator<EvaluatorStackParamList>();
const ProfileStack = createNativeStackNavigator<EvaluatorStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      initialRouteName="Works"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <HomeStack.Screen
        name="Works"
        component={WorkListScreen}
        options={{ title: "Meus Trabalhos" }}
      />
      <HomeStack.Screen
        name="Evaluate"
        component={EvaluationScreen}
        options={{ title: "Avaliar / Editar" }}
      />
    </HomeStack.Navigator>
  );
}

function EvaluatedStackNavigator() {
  return (
    <EvaluatedStack.Navigator
      initialRouteName="EvaluatedList"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <EvaluatedStack.Screen
        name="EvaluatedList"
        component={EvaluationsListScreen}
        options={{ title: "Trabalhos Avaliados" }}
      />
      <EvaluatedStack.Screen
        name="Evaluate"
        component={EvaluationScreen}
        options={{ title: "Avaliar / Editar" }}
      />
    </EvaluatedStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      initialRouteName="Profile"
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Meu Perfil" }}
      />
      <ProfileStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: "Redefinir Senha" }}
      />
    </ProfileStack.Navigator>
  );
}

export default function EvaluatorDrawer() {
  return (
    <Drawer.Navigator initialRouteName="Home">
      <Drawer.Screen name="Home" options={{ title: "Início" }}>
        {() => <HomeStackNavigator />}
      </Drawer.Screen>
      <Drawer.Screen
        name="Evaluated"
        options={{ title: "Trabalhos Avaliados" }}
      >
        {() => <EvaluatedStackNavigator />}
      </Drawer.Screen>
      <Drawer.Screen name="Profile" options={{ title: "Perfil" }}>
        {() => <ProfileStackNavigator />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
