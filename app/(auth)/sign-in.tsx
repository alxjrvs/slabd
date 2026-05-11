import { StyleSheet } from "react-native";

import { Text, View } from "~/components/ds";

export default function SignInScreen() {
  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title" style={styles.brand}>
        Slabd
      </Text>
      <Text muted style={styles.tagline}>
        An Infinite Longbox
      </Text>
      <Text muted style={styles.subtitle}>
        Sign in to start swiping rare comics.
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
    gap: 8,
  },
  brand: {
    fontSize: 48,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
  },
  subtitle: {
    marginTop: 24,
    textAlign: "center",
  },
});
