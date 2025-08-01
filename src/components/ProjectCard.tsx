// src/components/ProjectCard.tsx

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Title, Paragraph, Badge, useTheme } from "react-native-paper";

export interface ProjectCardProps {
  title: string;
  category: string;
  finalScore?: number;
  evaluationsCount?: number;
  topEvaluators?: Array<{
    name: string;
    email?: string;
    score: number;
  }>;
  onPress?: () => void;
}

export default function ProjectCard({
  title,
  category,
  finalScore,
  evaluationsCount,
  topEvaluators = [],
  onPress,
}: ProjectCardProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <Title numberOfLines={1} style={styles.title}>
              {title}
            </Title>
            {typeof finalScore === "number" && (
              <Badge style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                {finalScore.toFixed(2)}
              </Badge>
            )}
          </View>
          <Paragraph style={styles.meta}>
            Categoria: {category} • Avaliações: {evaluationsCount ?? 0}
          </Paragraph>
          {topEvaluators.length > 0 && (
            <View style={styles.evalsRow}>
              {topEvaluators.map((e, i) => (
                <View key={i} style={styles.eval}>
                  <Paragraph style={styles.evalName} numberOfLines={1}>
                    {e.name}
                  </Paragraph>
                  <Paragraph style={styles.evalScore}>{e.score.toFixed(2)}</Paragraph>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { flex: 1 },
  badge: { marginLeft: 8, paddingHorizontal: 8 },
  meta: { fontSize: 12, color: "#555", marginTop: 4 },
  evalsRow: { flexDirection: "row", marginTop: 8, gap: 12 },
  eval: { flex: 1 },
  evalName: { fontSize: 12, fontWeight: "600" },
  evalScore: { fontSize: 12, color: "#333" },
});
