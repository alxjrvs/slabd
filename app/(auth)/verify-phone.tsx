import { useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
import { isValidOtp } from "~/lib/identifier";
import { logger, serializeError } from "~/lib/logger";

const RESEND_COOLDOWN_MS = 90_000;
const TICK_MS = 1_000;

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendingAt, setResendingAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const cooldownStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - cooldownStartedAt.current;
  const remainingMs = Math.max(0, RESEND_COOLDOWN_MS - elapsed);
  const resendEnabled = remainingMs === 0 && !resendingAt;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

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
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)");
      } else {
        setError("We couldn't verify that code. Try requesting a new one.");
      }
    } catch (err) {
      logger.error("verify phone: attempt failed", {
        flow: "auth.phone.verify",
        error: serializeError(err),
      });
      setError("We couldn't verify that code. Try requesting a new one.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!resendEnabled || !isLoaded || !signUp) return;
    setResendingAt(Date.now());
    setError(null);
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      cooldownStartedAt.current = Date.now();
      setNow(Date.now());
    } catch (err) {
      logger.error("verify phone: resend failed", {
        flow: "auth.phone.resend",
        error: serializeError(err),
      });
      setError("Couldn't resend the code. Try again in a moment.");
    } finally {
      setResendingAt(null);
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
        <Button
          label={
            resendEnabled
              ? "Resend code"
              : `Resend in ${remainingSeconds}s`
          }
          variant="secondary"
          onPress={handleResend}
          disabled={!resendEnabled}
          loading={resendingAt !== null}
        />
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
