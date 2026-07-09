"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LandingPage;
const react_native_1 = require("react-native");
const expo_router_1 = require("expo-router");
function LandingPage() {
    const router = (0, expo_router_1.useRouter)();
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>money</react_native_1.Text>
      <react_native_1.Text style={styles.subtitle}>The forward-looking income allocation system engineered for absolute financial clarity without administrative friction.</react_native_1.Text>
      
      <react_native_1.View style={styles.buttonContainer}>
        <react_native_1.TouchableOpacity style={styles.button} onPress={() => router.push('/dashboard')}>
           <react_native_1.Text style={styles.buttonText}>Sign In / Register</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.Text style={styles.hint}>Start managing your money at the exact point of income arrival.</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 32, justifyContent: 'center', backgroundColor: '#fafafa' },
    title: { fontSize: 48, fontWeight: 'bold', marginBottom: 16, color: '#18181b', textAlign: 'center' },
    subtitle: { fontSize: 18, color: '#52525b', marginBottom: 48, textAlign: 'center', lineHeight: 26 },
    buttonContainer: { marginTop: 24, alignItems: 'center' },
    button: { backgroundColor: '#18181b', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
    buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
    hint: { fontSize: 14, color: '#a1a1aa', marginTop: 16, textAlign: 'center' }
});
//# sourceMappingURL=index.js.map