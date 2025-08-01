// src/components/LogoutButton.tsx

import React from "react";
import { Button, useTheme, Appbar } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";

/**
 * Se você quiser um botão de header:
 *  export function LogoutAction() {
 *    const { signOutUser } = useAuth();
 *    const theme = useTheme();
 *    return (
 *      <Appbar.Action
 *        icon="logout"
 *        onPress={signOutUser}
 *        color={theme.colors.onSurface}
 *      />
 *    );
 *  }
 */

export default function LogoutButton({
  mode = "contained",
}: {
  mode?: "text" | "outlined" | "contained";
}) {
  const { signOutUser } = useAuth();
  const theme = useTheme();

  return (
    <Button
      mode={mode}
      icon="logout"
      onPress={signOutUser}
      buttonColor={mode === "contained" ? theme.colors.primary : undefined}
      textColor={
        mode === "contained" ? theme.colors.onPrimary : theme.colors.primary
      }
      style={[
        {
          borderRadius: 24,
          paddingHorizontal: 16,
          marginVertical: 8,
        },
        mode === "outlined" && {
          borderColor: theme.colors.primary,
          borderWidth: 1,
        },
      ]}
      contentStyle={{ height: 44 }}
      labelStyle={{ fontWeight: "bold" }}
    >
      Sair
    </Button>
  );
}
