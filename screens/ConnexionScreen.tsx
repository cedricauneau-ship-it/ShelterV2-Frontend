import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image } from "react-native"
import { useCallback } from "react";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from "react-redux";
import { signin } from "../reducers/user";
import { useState } from "react";

import { DEPLOYED_BACKEND_ADDRESS } from "../modules/global";
import AudioManager from '../modules/audioManager';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '542100763309-addf4tkcshndslbikc7sehrebpj5vjkf.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

type ConnexionScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}

const BACKEND_ADDRESS = DEPLOYED_BACKEND_ADDRESS;

export default function ConnexionScreen({ navigation }: ConnexionScreenProps) {

    const [error, setError] = useState('');
    const dispatch = useDispatch();

    // Coupe la musique sur l'écran de connexion
    useFocusEffect(useCallback(() => {
        AudioManager.pauseBackground();
        AudioManager.pauseBackgroundGame();
    }, []));

    const handleGoogleSignin = async () => {
        setError('');
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;

            if (!idToken) {
                setError('Impossible de récupérer le token Google');
                return;
            }

            const response = await fetch(`${BACKEND_ADDRESS}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            const data = await response.json();

            if (data.result) {
                dispatch(signin({
                    token: data.token,
                    refreshToken: data.refreshToken,
                    username: data.username,
                    email: data.email ?? '',
                }));
                navigation.navigate('Home', { screen: 'Home' });
            } else {
                setError(data.error ?? 'Erreur de connexion Google');
            }
        } catch (err: any) {
            if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
            if (err.code === statusCodes.IN_PROGRESS) return;
            if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                setError('Google Play Services non disponible');
                return;
            }
            setError('Erreur de connexion Google');
            if (__DEV__) console.error('[Google SignIn]', err);
        }
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.title}>shelter</Text>
                <Text style={styles.subtitle}>Connecte-toi pour survivre</Text>

                <TouchableOpacity onPress={handleGoogleSignin} style={styles.googleButton} activeOpacity={0.8}>
                    <Image source={require('../assets/icon-google.png')} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>

                {error !== '' && <Text style={styles.error}>{error}</Text>}
            </View>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 70,
        fontWeight: '600',
        fontFamily: 'DaysLater',
        color: '#EFDAB7',
        textShadowColor: '#242120',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 2,
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
        marginBottom: 50,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        width: 260,
        height: 60,
        borderWidth: 2.5,
        borderColor: 'black',
        borderRadius: 15,
        gap: 12,
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    googleButtonText: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#352C2B',
    },
    error: {
        marginTop: 20,
        color: '#ff4444',
        textAlign: 'center',
        fontWeight: '500',
        fontFamily: 'ArialRounded',
        fontSize: 14,
        paddingHorizontal: 30,
    },
});
