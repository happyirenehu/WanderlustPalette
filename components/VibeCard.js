import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext.js';
import getContrastColor from '../utils/accessibility.js';
import getDisplayImageUri from '../utils/imageSources.js';

export default function VibeCard({ onPress, selected, vibe }) {
  const { t } = useLanguage();
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
      accessibilityLabel={t('vibeCard.accessibility', {
        description: vibe.description,
        name: vibe.name,
        selected: selected ? t('vibeCard.selectedSuffix') : '',
      })}
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
        <Text style={[styles.action, { color: failed ? fallbackTextColor : '#FFFFFF' }]}>{selected ? t('common.selected') : t('common.choose')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 0.92, borderColor: 'transparent', borderRadius: 16, borderWidth: 3, flexBasis: '47%', flexGrow: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  selected: { borderColor: '#FFFFFF', elevation: 7, shadowColor: '#17202A', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.28, shadowRadius: 12 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 18, 25, 0.34)' },
  loader: { position: 'absolute', right: 14, top: 14 },
  copy: { padding: 14 },
  name: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  description: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  action: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginTop: 10, textTransform: 'uppercase' },
});
