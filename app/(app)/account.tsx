import { useClerk, useUser } from "@clerk/clerk-expo";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch } from "react-native";

import { Button, Field, Text, View } from "~/components/ds";
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
  const { signOut } = useClerk();
  const theme = useTheme();

  const initialPrefs = useMemo(() => readPrefs(user?.unsafeMetadata), [user?.unsafeMetadata]);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPrefs(initialPrefs);
  }, [user, initialPrefs]);

  const identifier =
    user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber ?? "";

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await user.update({
        firstName,
        lastName,
        unsafeMetadata: { notifications: prefs },
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
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
