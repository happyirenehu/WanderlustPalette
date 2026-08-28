import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import getContrastColor from '../utils/accessibility.js';
import getDisplayImageUri from '../utils/imageSources.js';

export default function VibeCard({ onPress, selected, vibe }) {
  const imageUri = getDisplayImageUri(vibe.imageUri);
  const fallbackColor = vibe.palette[0] || '#315C72';
  const fallbackTextColor = getContrastColor(fallbackColor);
  const [failed, setFailed] = useState(!imageUri);
  const [loading, setLoading] = useState(Boolean(imageUri));

  useEffect(() => {
    setFailed(!imageUri);
    setLoading(Boolean(imageUri));
  }, [imageUri]);

  return (
    <Pressable
      accessibilityLabel={`${vibe.name} vibe. ${vibe.description}${selected ? ' Selected.' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed, { backgroundColor: fallbackColor }]}
    >
      {imageUri && !failed ? (
        <Image
          accessibilityElementsHidden
          onError={() => { setFailed(true); setLoading(false); }}
          onLoad={() => setLoading(false)}
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {imageUri && !failed ? <View style={styles.overlay} /> : null}
      {loading && !failed ? <ActivityIndicator color="#FFFFFF" style={styles.loader} /> : null}
      <View style={styles.copy}>
        <Text style={[styles.name, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{vibe.name}</Text>
        <Text style={[styles.description, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{vibe.description}</Text>
        <Text style={[styles.action, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{selected ? 'Selected ✓' : 'Choose'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 1.12, borderColor: 'transparent', borderRadius: 10, borderWidth: 3, flexBasis: '47%', flexGrow: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  selected: { borderColor: '#FFFFFF' },
  pressed: { opacity: 0.9 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 18, 25, 0.48)' },
  loader: { position: 'absolute', right: 14, top: 14 },
  copy: { padding: 12 },
  name: { fontSize: 19, fontWeight: '900' },
  description: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  action: { fontSize: 10, fontWeight: '900', marginTop: 8 },
});
