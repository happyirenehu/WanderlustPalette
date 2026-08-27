import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import mockData from '../assets/mockData.json';
import getContrastColor from '../utils/accessibility.js';

const ACTIVE_THEME_KEY = '@wanderlust_palette/active_theme';

export default function HomeScreen() {
  const [travelEntries, setTravelEntries] = useState([]);
  const [activeTheme, setActiveTheme] = useState(mockData[0]?.palette[0] || '#F7FAFC');

  useEffect(() => {
    let isMounted = true;

    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(ACTIVE_THEME_KEY);
        if (isMounted && savedTheme) {
          setActiveTheme(savedTheme);
        }
      } catch (error) {
        // The bundled theme remains available when storage is unavailable.
      }
    };

    setTravelEntries(mockData);
    loadSavedTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectTheme = async (color) => {
    setActiveTheme(color);

    try {
      await AsyncStorage.setItem(ACTIVE_THEME_KEY, color);
    } catch (error) {
      // Theme selection still applies for the current session.
    }
  };

  const textColor = getContrastColor(activeTheme);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: activeTheme }]}
      style={[styles.screen, { backgroundColor: activeTheme }]}
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: textColor }]}>FIELD NOTES / 2025</Text>
        <Text style={[styles.title, { color: textColor }]}>Wanderlust</Text>
        <Text style={[styles.subtitle, { color: textColor }]}>A palette of places worth remembering.</Text>
      </View>

      {travelEntries.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => selectTheme(item.palette[0])}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Image source={{ uri: item.imageUri }} style={styles.image} />
          <View style={styles.cardBody}>
            <Text style={styles.cardDate}>{item.date}</Text>
            <Text style={styles.location}>{item.location}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.paletteRow}>
              {item.palette.slice(0, 5).map((color) => (
                <Pressable
                  accessibilityLabel={`Set theme to ${color}`}
                  key={color}
                  onPress={() => selectTheme(color)}
                  style={[styles.swatch, { backgroundColor: color }]}
                />
              ))}
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 28,
    paddingTop: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
    opacity: 0.72,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 6,
    opacity: 0.78,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 4,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  cardPressed: {
    opacity: 0.88,
  },
  image: {
    aspectRatio: 1.55,
    backgroundColor: '#CBD5E0',
    width: '100%',
  },
  cardBody: {
    padding: 18,
  },
  cardDate: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  location: {
    color: '#17202A',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  description: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  swatch: {
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    flex: 1,
    height: 42,
  },
});