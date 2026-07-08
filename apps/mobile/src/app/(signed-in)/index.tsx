import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { getAppConfig } from '@money-matters/config';

export default function Dashboard() {
  const config = getAppConfig('money');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome to {config?.name} Dashboard</Text>
      <Text style={styles.subtitle}>Manage your vertical slices.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Configuration Overview</Text>
        <Text style={styles.codeBlock}>{JSON.stringify(config, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  card: { padding: 16, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  codeBlock: { fontFamily: 'monospace', fontSize: 12 },
});
