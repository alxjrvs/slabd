/**
 * sell/review.tsx — Summary and publish screen.
 *
 * Reads ?id=<draftId> from route params.
 * On mount: GET /api/listings/draft/:id to load the draft.
 * "Publish" POSTs to /api/listings/:id/publish.
 *   - 200: router.replace("/")
 *   - 422: show inline error banner
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Text, View } from "~/components/ds";
import { useTheme } from "~/lib/theme-provider";

type DraftListing = {
  id: string;
  status: string;
  series: string | null;
  issue: string | null;
  gradeCompany: string | null;
  gradeNumeric: string | null;
  priceCents: number | null;
  conditionNotes: string | null;
  images?: unknown[];
};

function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SellReviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [draft, setDraft] = useState<DraftListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/listings/draft/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setLoadError("Couldn't load your listing.");
          return;
        }
        const data = (await res.json()) as DraftListing;
        setDraft(data);
      })
      .catch(() => {
        setLoadError("Couldn't load your listing.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    setPublishError(null);

    try {
      const res = await fetch(`/api/listings/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        router.replace("/");
        return;
      }

      if (res.status === 422) {
        // Show inline error — cannot publish until required fields are provided
        setPublishError("Cannot publish: some required fields are missing or invalid.");
        return;
      }

      setPublishError("Publish failed. Please try again.");
    } catch {
      setPublishError("Publish failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <View surface="bg" style={styles.centered}>
        <Text muted>Loading…</Text>
      </View>
    );
  }

  if (loadError || !draft) {
    return (
      <View surface="bg" style={styles.centered}>
        <Text style={{ color: theme.colors.danger }}>{loadError ?? "Something went wrong."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text variant="title">Review listing</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text variant="caption" muted>
            Series
          </Text>
          <Text>{draft.series ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="caption" muted>
            Issue
          </Text>
          <Text>{draft.issue ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="caption" muted>
            Grade
          </Text>
          <Text>
            {draft.gradeCompany && draft.gradeNumeric
              ? `${draft.gradeCompany} ${draft.gradeNumeric}`
              : "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="caption" muted>
            Price
          </Text>
          <Text>{formatPrice(draft.priceCents)}</Text>
        </View>
        {draft.conditionNotes ? (
          <View style={styles.row}>
            <Text variant="caption" muted>
              Notes
            </Text>
            <Text>{draft.conditionNotes}</Text>
          </View>
        ) : null}
      </View>

      {publishError ? (
        <Text style={{ color: theme.colors.danger }}>{publishError}</Text>
      ) : null}

      <Button
        label="Publish"
        onPress={handlePublish}
        loading={publishing}
        disabled={publishing}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 48,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
  },
  row: {
    gap: 4,
  },
});
