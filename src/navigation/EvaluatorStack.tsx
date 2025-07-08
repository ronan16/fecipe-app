// src/navigation/EvaluatorStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";
import LogoutButton from "../components/LogoutButton";
import WorkListScreen from "../screens/WorkListScreen";
import EvaluationScreen from "../screens/EvaluationScreen";
import ProfileScreen from "../screens/evaluator/ProfileScreen";

export type EvaluatorStackParamList = {
  Works: undefined; // <--- rota para WorkListScreen
  Evaluate: { trabalhoId: string; titulo: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<EvaluatorStackParamList>();

export default function EvaluatorStack() {
  return (
    <Stack.Navigator
      initialRouteName="Works" // <--- garante que "Works" seja a primeira tela
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LogoutButton />
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="Works"
        component={WorkListScreen}
        options={{ title: "Meus Trabalhos" }} // título no header
      />
      <Stack.Screen
        name="Evaluate"
        component={EvaluationScreen}
        options={{ title: "Avaliar Trabalho" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Meu Perfil" }}
      />
    </Stack.Navigator>
  );
}
