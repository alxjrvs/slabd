import { useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
import { isValidOtp } from "~/lib/identifier";

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isValidOtp(code)) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    if (!isLoaded || !signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)");
      } else {
        setError("We couldn't verify that code. Try requesting a new one.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't verify that code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title">Check your phone</Text>
      <Text muted>
        We sent a verification code to {params.phone ?? "your phone number"}.
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
