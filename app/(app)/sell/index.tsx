/**
 * sell/index.tsx — Start screen for the seller flow.
 *
 * On mount: POST /api/listings/draft to create a new draft.
 * Stores the returned id in local state.
 * "Continue" navigates to /sell/attributes?id=<draftId>.
 * Button is disabled until draft creation succeeds.
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { Button, Text, View } from "~/components/ds";
import { useTheme } from "~/lib/theme-provider";

export default function SellStartScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [draftId, setDraftId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCreating(true);
    setError(null);

    fetch("/api/listings/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError("Couldn't start your listing. Please try again.");
          return;
        }
        const data = (await res.json()) as { id: string };
        setDraftId(data.id);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't start your listing. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setCreating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = () => {
    if (!draftId) return;
    router.push(`/sell/attributes?id=${draftId}`);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text variant="title">Sell a comic</Text>
      <Text muted style={styles.description}>
        List your slabbed comic for sale on Sleeve. You&apos;ll provide grading details, photos, and
        a price. Your listing goes live immediately after publishing.
      </Text>

      {error ? (
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={creating || !draftId}
          loading={creating}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 48,
    gap: 16,
  },
  description: {
    lineHeight: 22,
  },
  actions: {
    marginTop: 16,
  },
});
