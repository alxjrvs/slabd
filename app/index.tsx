import { StyleSheet } from "react-native";

import { Text, View } from "~/components/ds";

export default function Home() {
  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title" style={styles.title}>
        Slabd
      </Text>
      <Text muted style={styles.subtitle}>
        An Infinite Longbox
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 48,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
  },
});
