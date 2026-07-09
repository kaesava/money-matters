import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>money</Text>
      <Text style={styles.subtitle}>The forward-looking income allocation system engineered for absolute financial clarity without administrative friction.</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/dashboard')}>
           <Text style={styles.buttonText}>Sign In / Register</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Start managing your money at the exact point of income arrival.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: 'center', backgroundColor: '#fafafa' },
  title: { fontSize: 48, fontWeight: 'bold', marginBottom: 16, color: '#18181b', textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#52525b', marginBottom: 48, textAlign: 'center', lineHeight: 26 },
  buttonContainer: { marginTop: 24, alignItems: 'center' },
  button: { backgroundColor: '#18181b', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  hint: { fontSize: 14, color: '#a1a1aa', marginTop: 16, textAlign: 'center' }
});
