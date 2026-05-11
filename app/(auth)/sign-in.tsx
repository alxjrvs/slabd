import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isLoaded || !signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: trimmed });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push({ pathname: "/(auth)/verify-email", params: { email: trimmed } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send code. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title" style={styles.brand}>
        Slabd
      </Text>
      <Text muted style={styles.tagline}>
        An Infinite Longbox
      </Text>
      <View style={styles.form}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={error ?? undefined}
        />
        <Button label="Send code" onPress={handleSubmit} loading={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 96,
    gap: 12,
  },
  brand: {
    fontSize: 48,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
  },
  form: {
    marginTop: 32,
    gap: 16,
  },
});
