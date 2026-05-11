import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
import { isValidPhone } from "~/lib/identifier";

export default function SignInPhoneScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = phone.trim();
    if (!isValidPhone(trimmed)) {
      setError("Include your country code, e.g. +15555550101.");
      return;
    }
    if (!isLoaded || !signUp) {
      setError("Sign-up isn't ready yet. Please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp.create({ phoneNumber: trimmed });
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      router.push({ pathname: "/(auth)/verify-phone", params: { phone: trimmed } });
    } catch (err) {
      // TODO(S-1.5): structured log to Sentry with the Clerk error code
      console.error("sign-up phone: prepare failed", err);
      setError("Couldn't send code. Try again.");
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
        Continue with your phone number
      </Text>
      <View style={styles.form}>
        <Field
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoComplete="tel"
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
