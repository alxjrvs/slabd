/**
 * sell/photos.tsx — Photo picker screen.
 *
 * Reads ?id=<draftId> from route params.
 * Mocks the file-picker behind a "(Mock) Pick photos" button.
 * Calls /api/listings/:id/images/upload-url and /confirm for each photo.
 * Requires at least 2 photos before "Continue" enables.
 */
import { useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Text, View } from "~/components/ds";
import { useTheme } from "~/lib/theme-provider";

type MockPhoto = {
  key: string;
  id: string;
};

const MIN_PHOTOS = 2;

export default function SellPhotosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [photos, setPhotos] = useState<MockPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    if (!id) return;
    setUploading(true);
    setError(null);

    try {
      // 1. Request a signed upload URL
      const urlRes = await fetch(`/api/listings/${id}/images/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg" }),
      });

      if (!urlRes.ok) {
        setError("Couldn't get upload URL. Please try again.");
        return;
      }

      const { uploadUrl, key, imageId } = (await urlRes.json()) as {
        uploadUrl: string;
        key: string;
        imageId: string;
      };

      // 2. In a real flow we'd PUT the file to uploadUrl.
      // For this cycle we skip the actual file bytes and go straight to confirm.
      void uploadUrl;

      // 3. Confirm the upload
      const confirmRes = await fetch(`/api/listings/${id}/images/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (!confirmRes.ok) {
        setError("Couldn't confirm upload. Please try again.");
        return;
      }

      setPhotos((prev) => [...prev, { key, id: imageId }]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    if (!id) return;
    router.push(`/sell/review?id=${id}`);
  };

  const canContinue = photos.length >= MIN_PHOTOS;

  return (
    <View surface="bg" style={styles.container}>
      <Text variant="title">Photos</Text>
      <Text muted>Add at least {MIN_PHOTOS} photos of your comic.</Text>

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.photoItem}>
            <Text>Photo {index + 1}</Text>
            <Text muted style={styles.photoKey}>
              {item.key}
            </Text>
          </View>
        )}
        style={styles.photoList}
        ListEmptyComponent={
          <Text muted style={styles.emptyText}>
            No photos yet
          </Text>
        }
      />

      {error ? (
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
      ) : null}

      <Text muted>
        {photos.length} / {MIN_PHOTOS} required
      </Text>

      <Button
        label="(Mock) Pick photo"
        variant="secondary"
        onPress={handlePickPhoto}
        loading={uploading}
        disabled={uploading}
      />

      <Button
        label="Continue to Review"
        onPress={handleContinue}
        disabled={!canContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    gap: 16,
  },
  photoList: {
    maxHeight: 200,
  },
  photoItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  photoKey: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
  },
});
