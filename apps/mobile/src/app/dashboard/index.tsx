import { Text, View, StyleSheet } from 'react-native';

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payday Terminal</Text>
      <Text style={styles.subtitle}>Dashboard coming soon...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 8 }
});
