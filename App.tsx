import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';

import AudioManager from './modules/audioManager';
import { store, persistor } from './store';  // import du store
import ForceUpdateCheck from './components/ForceUpdateCheck';

import ConnexionScreen from './screens/ConnexionScreen';
import CreditScreen from './screens/CreditScreen';
import EndGameScreen from './screens/EndGameScreen';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import IntroductionScreen from './screens/IntroductionScreen';
import ParametreScreen from './screens/ParametreScreen';
import SplashScreen from './screens/SplashScreen';
import SuccesScreen from './screens/SuccesScreen';
import RecapGameScreen from './screens/RecapGameScreen';
import ShopScreen from './screens/ShopScreen';
import ProfileScreen from './screens/ProfileScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {


  const hideNavBar = () => NavigationBar.setVisibilityAsync('hidden');

  // Cache la barre au démarrage
  useEffect(() => {
    hideNavBar();
  }, []);

  // Re-cache automatiquement 1.5s après que l'utilisateur l'ait révélée
  useEffect(() => {
    const sub = NavigationBar.addVisibilityListener(({ visibility }) => {
      if (visibility === 'visible') {
        setTimeout(hideNavBar, 1500);
      }
    });
    return () => sub.remove();
  }, []);

  // Re-cache quand l'app revient au premier plan
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideNavBar();
    });
    return () => sub.remove();
  }, []);

  // Charge les sons et lance la musique de fond du menu
  useEffect(() => {
    const init = async () => {
      await AudioManager.preloadAll();
      await AudioManager.playBackground();
    };

    init();
  }, []);

  // Permet la transition de la musique de fond du menu a celle de la game
  useEffect(() => {
    let lastInGame = store.getState().game?.inGame;

    const unsubscribe = store.subscribe(async () => {
      const state = store.getState();
      const inGame = state.game?.inGame;

      if (inGame !== lastInGame) {
        if (inGame) {
          await AudioManager.pauseBackground();
          await AudioManager.playBackgroundGame();
        } else {
          await AudioManager.pauseBackgroundGame();
          await AudioManager.playBackground();
        }

        lastInGame = inGame;
      }
    });

    return () => unsubscribe();
  }, []);

  // Chargement des polices
  const [loaded, error] = useFonts({
    DaysLater: require('./assets/fonts/28 Days Later.ttf'),
    ArialRounded: require('./assets/fonts/arialroundedmtbold.ttf'),
  });

  if (!loaded && !error) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ForceUpdateCheck>
          <GestureHandlerRootView>
            <NavigationContainer onStateChange={hideNavBar}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="SplashScreen" component={SplashScreen} />
                <Stack.Screen name="Introduction" component={IntroductionScreen} />
                <Stack.Screen name="Connexion" component={ConnexionScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Parametre" component={ParametreScreen} />
                <Stack.Screen name="Credit" component={CreditScreen} />
                <Stack.Screen name="Shop" component={ShopScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Feedback" component={FeedbackScreen} />
                <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                <Stack.Screen name="Succes" component={SuccesScreen} />
                <Stack.Screen name="Game" component={GameScreen} />
                <Stack.Screen name="EndGame" component={EndGameScreen} />
                <Stack.Screen name="RecapGame" component={RecapGameScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </GestureHandlerRootView>
        </ForceUpdateCheck>
      </PersistGate>
    </Provider>
  );
}
