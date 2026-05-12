/**
 * sell/attributes.tsx — Listing attributes form.
 *
 * Reads ?id=<draftId> from route params.
 * "Save & Continue" PATCHes /api/listings/draft/:id and navigates to /sell/photos?id=<id>.
 * Price is displayed in dollars but sent as priceCents (integer cents).
 */
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Field, Text, View } from "~/components/ds";
import { useTheme } from "~/lib/theme-provider";

export default function SellAttributesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [series, setSeries] = useState("");
  const [issue, setIssue] = useState("");
  const [gradeCompany, setGradeCompany] = useState("");
  const [gradeNumeric, setGradeNumeric] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);

    // Convert dollars string to integer cents
    const priceCents = priceDisplay
      ? Math.round(parseFloat(priceDisplay) * 100)
      : null;

    try {
      const res = await fetch(`/api/listings/draft/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: series || null,
          issue: issue || null,
          gradeCompany: gradeCompany || null,
          gradeNumeric: gradeNumeric || null,
          priceCents: isNaN(priceCents as number) ? null : priceCents,
          conditionNotes: conditionNotes || null,
        }),
      });

      if (!res.ok) {
        setError("Couldn't save. Please try again.");
        return;
      }

      router.push(`/sell/photos?id=${id}`);
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text variant="title">Listing details</Text>

      <View style={styles.form}>
        <Field label="Series" value={series} onChangeText={setSeries} placeholder="e.g. Amazing Spider-Man" />
        <Field label="Issue" value={issue} onChangeText={setIssue} placeholder="e.g. 300" keyboardType="default" />
        <Field label="Grade Company" value={gradeCompany} onChangeText={setGradeCompany} placeholder="e.g. CGC, CBCS" />
        <Field label="Grade" value={gradeNumeric} onChangeText={setGradeNumeric} placeholder="e.g. 9.8" keyboardType="decimal-pad" />
        <Field
          label="Price (USD)"
          value={priceDisplay}
          onChangeText={setPriceDisplay}
          placeholder="e.g. 150.00"
          keyboardType="decimal-pad"
        />
        <Field
          label="Condition Notes"
          value={conditionNotes}
          onChangeText={setConditionNotes}
          placeholder="Optional notes about the comic's condition"
          multiline
        />
      </View>

      {error ? (
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
      ) : null}

      <Button
        label="Save & Continue"
        onPress={handleSave}
        loading={submitting}
        disabled={submitting}
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
  form: {
    gap: 12,
  },
});
