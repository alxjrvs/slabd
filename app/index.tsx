import { StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Slabd
      </Text>
      <Text style={styles.subtitle}>An Infinite Longbox</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0b0c",
    padding: 24,
  },
  title: {
    color: "#fafafa",
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#9aa0a6",
    fontSize: 16,
    marginTop: 8,
  },
});
