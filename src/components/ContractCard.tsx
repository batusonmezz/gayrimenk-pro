import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  description?: string;
}

export default function ContractCard({ title, description }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginVertical: 8, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 14, color: '#666', marginTop: 4 },
});
