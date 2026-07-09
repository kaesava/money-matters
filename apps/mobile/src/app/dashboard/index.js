"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
const react_native_1 = require("react-native");
function Dashboard() {
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>Payday Terminal</react_native_1.Text>
      <react_native_1.Text style={styles.subtitle}>Dashboard coming soon...</react_native_1.Text>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 8 }
});
//# sourceMappingURL=index.js.map