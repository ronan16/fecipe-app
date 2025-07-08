// src/components/SubmitButton.tsx
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const SubmitButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading,
  disabled,
}) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
  >
    {loading ? <ActivityIndicator /> : <Text style={styles.text}>{title}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#99ccee",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default SubmitButton;
