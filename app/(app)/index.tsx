import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { Button, Text, View } from "~/components/ds";

export default function Home() {
  const router = useRouter();
  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title" style={styles.title}>
        Slabd
      </Text>
      <Text muted style={styles.subtitle}>
        An Infinite Longbox
      </Text>
      <View style={styles.actions}>
        <Button
          label="Profile"
          variant="secondary"
          onPress={() => router.push("/(app)/account")}
        />
      </View>
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
  actions: {
    marginTop: 32,
    width: "60%",
  },
});
