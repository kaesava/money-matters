import { Text, View, StyleSheet } from 'react-native';
import { getAppConfig } from '@money-matters/config';

export default function LandingPage() {
  const config = getAppConfig('money');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{config?.landingPage.heroTitle ?? 'Welcome'}</Text>
      <Text style={styles.subtitle}>{config?.landingPage.heroSubtitle ?? 'The ultimate platform.'}</Text>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>Available Features</Text>
        {config && Object.entries(config.components).map(([key, comp]) => (
          <View key={key} style={styles.featureItem}>
            <Text style={styles.featureName}>{comp.label}</Text>
            <Text style={styles.featureDesc}>Supports custom fields: {Object.keys(comp.extraFields || {}).join(', ') || 'none'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 32 },
  features: { marginTop: 24 },
  featuresTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  featureItem: { marginBottom: 16 },
  featureName: { fontSize: 18, fontWeight: '600' },
  featureDesc: { fontSize: 14, color: '#666' },
});
