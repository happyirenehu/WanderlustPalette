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
        <Text style={[styles.kicker, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>TRAVEL VIBE</Text>
        <Text style={[styles.name, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{vibe.name}</Text>
        <Text style={[styles.description, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{vibe.description}</Text>
        <Text style={[styles.action, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{selected ? 'Selected ✓' : 'Explore this feeling'}</Text>
        {!failed && vibe.imageCredit ? <Text style={styles.credit}>{vibe.imageCredit}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: 'transparent', borderRadius: 10, borderWidth: 3, justifyContent: 'flex-end', minHeight: 190, overflow: 'hidden' },
  selected: { borderColor: '#FFFFFF' },
  pressed: { opacity: 0.9 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 18, 25, 0.48)' },
  loader: { position: 'absolute', right: 14, top: 14 },
  copy: { padding: 18 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, opacity: 0.9 },
  name: { fontSize: 28, fontWeight: '900', marginTop: 5 },
  description: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  action: { fontSize: 11, fontWeight: '900', marginTop: 14 },
  credit: { color: '#FFFFFF', fontSize: 9, marginTop: 8, opacity: 0.8 },
});
