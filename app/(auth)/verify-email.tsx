import { useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
import { isValidOtp } from "~/lib/identifier";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isValidOtp(code)) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    if (!isLoaded || !signUp) {
      setError("Verification isn't ready yet. Please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)");
      } else {
        setError("We couldn't verify that code. Try requesting a new one.");
      }
    } catch (err) {
      // TODO(S-1.5): structured log to Sentry with the Clerk error code
      console.error("verify email: attempt failed", err);
      setError("We couldn't verify that code. Try requesting a new one.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title">Check your email</Text>
      <Text muted>
        We sent a verification code to {params.email ?? "your email address"}.
      </Text>
      <View style={styles.form}>
        <Field
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
          error={error ?? undefined}
        />
        <Button label="Verify" onPress={handleSubmit} loading={submitting} />
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
  form: {
    marginTop: 32,
    gap: 16,
  },
});
