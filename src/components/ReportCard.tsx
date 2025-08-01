// src/components/ReportCard.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ReportCardProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  onPress: () => void;
}

export default function ReportCard({
  title,
  description,
  icon,
  color = "#007AFF",
  onPress,
}: ReportCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: color }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={40} color={color} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  texts: { marginLeft: 12, flex: 1 },
  title: { fontSize: 18, fontWeight: "bold" },
  desc: { color: "#555", marginTop: 4 },
});
