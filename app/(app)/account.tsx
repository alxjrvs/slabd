import { useClerk, useUser } from "@clerk/clerk-expo";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
import { useAuth } from "~/lib/auth";
import { logger, serializeError } from "~/lib/logger";
import { useTheme } from "~/lib/theme-provider";

type NotificationPrefs = {
  drops: boolean;
  messages: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = { drops: true, messages: true };

function readPrefs(metadata: unknown): NotificationPrefs {
  if (
    metadata &&
    typeof metadata === "object" &&
    "notifications" in metadata &&
    metadata.notifications &&
    typeof metadata.notifications === "object"
  ) {
    const n = metadata.notifications as Partial<NotificationPrefs>;
    return {
      drops: typeof n.drops === "boolean" ? n.drops : DEFAULT_PREFS.drops,
      messages: typeof n.messages === "boolean" ? n.messages : DEFAULT_PREFS.messages,
    };
  }
  return DEFAULT_PREFS;
}

export default function AccountScreen() {
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { signOut } = useClerk();
  const theme = useTheme();

  const initialPrefs = useMemo(() => readPrefs(user?.unsafeMetadata), [user?.unsafeMetadata]);

  const initialFirstName = authUser.kind === "signed-in" ? (authUser.firstName ?? "") : "";
  const initialLastName = authUser.kind === "signed-in" ? (authUser.lastName ?? "") : "";
  const identifier = authUser.kind === "signed-in" ? authUser.identifier : "";

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = authUser.kind === "signed-in" ? authUser.id : null;
  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setPrefs(initialPrefs);
    // Only resync form state when the signed-in identity changes — not on
    // every Clerk reload (which would clobber unsaved edits after a save).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const existing = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        firstName,
        lastName,
        unsafeMetadata: { ...existing, notifications: prefs },
      });
      setSavedAt(Date.now());
    } catch (err) {
      logger.error("account: user.update failed", {
        flow: "account.update",
        error: serializeError(err),
      });
      // Optimistic rollback: when the server rejects, snap the form back
      // to the last-known-persisted Clerk values so the UI never lies.
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setPrefs(initialPrefs);
      setError("Couldn't save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) =>
    setPrefs((current) => ({ ...current, [key]: !current[key] }));

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.container}
    >
      <Text variant="title">Your account</Text>
      <Text muted>{identifier}</Text>

      <View style={styles.section}>
        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
      </View>

      <View style={styles.section}>
        <Text variant="caption" muted>
          Notifications
        </Text>
        <View style={styles.switchRow}>
          <Text>New comic drops</Text>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="New comic drops"
            value={prefs.drops}
            onValueChange={() => togglePref("drops")}
          />
        </View>
        <View style={styles.switchRow}>
          <Text>Direct messages</Text>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Direct messages"
            value={prefs.messages}
            onValueChange={() => togglePref("messages")}
          />
        </View>
      </View>

      {error ? (
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
      ) : savedAt ? (
        <Text style={{ color: theme.colors.success }}>Saved</Text>
      ) : null}

      <Button label="Save changes" onPress={handleSave} loading={submitting} />
      <Button label="Sign out" variant="secondary" onPress={() => signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
});
