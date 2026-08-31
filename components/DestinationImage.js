import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext.js';
import getContrastColor from '../utils/accessibility.js';
import getDisplayImageUri from '../utils/imageSources.js';

export default function DestinationImage({ destination, detail = false }) {
  const { t } = useLanguage();
  const imageUri = getDisplayImageUri(destination?.imageUri);
  const fallbackColor = destination?.palette?.[0] || '#E8EEF2';
  const [loading, setLoading] = useState(Boolean(imageUri));
  const [failed, setFailed] = useState(!imageUri);

  useEffect(() => {
    setLoading(Boolean(imageUri));
    setFailed(!imageUri);
  }, [imageUri]);

  return (
    <View style={[styles.frame, detail ? styles.detailFrame : styles.cardFrame, { backgroundColor: fallbackColor }]}>
      {imageUri && !failed ? (
        <Image
          accessibilityLabel={destination.imageAlt || t('images.travelPhoto', { name: destination.name })}
          onError={() => {
            setFailed(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading && !failed ? (
        <View accessibilityLabel={t('images.loading', { name: destination.name })} style={styles.loading}>
          <ActivityIndicator color={getContrastColor(fallbackColor)} />
        </View>
      ) : null}
      {failed ? (
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { color: getContrastColor(fallbackColor) }]}>{t('images.fallback')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', width: '100%' },
  cardFrame: { aspectRatio: 1.45 },
  detailFrame: { aspectRatio: 1.08 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontSize: 14, fontWeight: '900', letterSpacing: 1.8 },
});
