import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider } from './context/LanguageContext';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <HomeScreen />
      </LanguageProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
