import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ImageBackground } from 'react-native';
import Constants from 'expo-constants';
import { FontAwesome } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_ADDRESS;

// URL de ta fiche Google Play Store
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.azulys.shelter';

// Compare deux versions "1.2.3" → true si current < min
const isVersionOutdated = (current: string, min: string): boolean => {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] ?? 0) < (m[i] ?? 0)) return true;
    if ((c[i] ?? 0) > (m[i] ?? 0)) return false;
  }
  return false;
};

type Props = {
  children: React.ReactNode;
};

export default function ForceUpdateCheck({ children }: Props) {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/app/min-version`);
        const data = await res.json();
        const currentVersion = Constants.expoConfig?.version ?? '1.0.0';

        if (data.minVersion && isVersionOutdated(currentVersion, data.minVersion)) {
          setNeedsUpdate(true);
        }
      } catch {
        // En cas d'erreur réseau, on laisse passer (pas de blocage)
      }
    };

    check();
  }, []);

  if (needsUpdate) {
    return (
      <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
        <View style={styles.content}>
          <FontAwesome name={'exclamation-triangle' as any} size={60} color='#f2c94c' />
          <Text style={styles.title}>Mise à jour requise</Text>
          <Text style={styles.message}>
            Une nouvelle version de Shelter est disponible. Mets à jour pour continuer à jouer.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
            activeOpacity={0.8}
          >
            <FontAwesome name={'download' as any} size={18} color='#1a1715' />
            <Text style={styles.buttonText}>Mettre à jour</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#342c29',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#554946',
    padding: 30,
    marginHorizontal: 30,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'ArialRounded',
    color: '#ffe7bf',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontFamily: 'ArialRounded',
    color: '#ffe8bfaf',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f2c94c',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'ArialRounded',
    color: '#1a1715',
  },
});
