import { View, Text, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ImageBackground } from "react-native"
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { setGameState, setUserData, signout, setFirstGame, updateSettings } from "../reducers/user";
import { useCallback, useEffect, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import AudioManager from '../modules/audioManager';
import AdManager from '../modules/adManager';

import { useFetchWithAuth } from '../components/fetchWithAuth';

type HomeScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}


export default function HomeScreen({ navigation }: HomeScreenProps ) {
    const fetchWithAuth = useFetchWithAuth();
    const [currentGame, setCurrentGame] = useState(false);

    const user = useSelector((state: string) => state.user.value);
    const dispatch = useDispatch();

    // Initialise AdMob
    useEffect(() => {
        AdManager.initialize();
    }, []);

    // les fetch doivent se faire avec fetchWithAuth pour gérer le refresh token 

    useFocusEffect(
        useCallback(() => {
            fetchWithAuth(`/users/data`, {
                method: 'GET',
            })
            .then(response => response.json())
            .then(data => {
                if (!data) return;
                setCurrentGame(data.currentGameId != null);
                if (!data.settings) return;
                dispatch(setUserData({ bestScore: data.bestScore ?? 0, soundOn: data.settings.soundOn, volume: data.settings.volume, btnSoundOn: data.settings.btnSoundOn, hapticOn: data.settings.hapticOn ?? true, totalGames: data.totalGames ?? 0 }));
                AudioManager.init({ volume: data.settings.volume, soundOn: data.settings.soundOn, btnSoundOn: data.settings.btnSoundOn });
            })
            .catch(err => { if (__DEV__) console.error('[HomeScreen] fetch /users/data :', err); });
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            AudioManager.playBackground();
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            fetchWithAuth(`/games`, {
                method: 'GET',
            })
            .then(response => response.json())
            .then(data => {
                if (data.result && data.games && data.games.length > 0) {
                    dispatch(setFirstGame(false)); // il y a des partie dans l'historique du joueur, on affihe pas le tuto
                    return;
                } else {              
                    dispatch(setFirstGame(true));   // pas de partie dans l'historique du joueur, on affihe le tuto
                }
            });
        }, [])
    );
    
    const handleCurrentGame = () => {
        fetchWithAuth(`/games/current`, {
            method: 'GET',
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {            
                return;
            } else {
                AudioManager.playEffect('click');
                dispatch(setGameState({ stateOfGauges: data.currentGame.stateOfGauges, numberDays: data.currentGame.numberDays, currentCard: data.currentGame.currentCard }));
                navigation.navigate('Game', { screen: 'Game' });
            }
        });
    };
     
    const startNewGame = () => {
        fetchWithAuth(`/games/new`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.error) return;
            AudioManager.playEffect('click');
            dispatch(setGameState({ stateOfGauges: data.game.stateOfGauges, numberDays: data.game.numberDays, currentCard: data.game.currentCard }));
            navigation.navigate('Game', { screen: 'Game' });
        });
    };

    const handleNewGame = () => {
        if (AdManager.shouldShow() && AdManager.isLoaded()) {
            AdManager.show(startNewGame);
        } else {
            startNewGame();
        }
    };

    const handleNavigateParametres = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Parametre', { screen: 'Parametre' });
    };

    const handleNavigateSucces = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Succes', { screen: 'Succes' });
    };

    const handleNavigateCredit = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Credit', { screen: 'Credit' });
    };

    const handleLogout = () => {
        AudioManager.playEffect('click');
        dispatch(signout())
        navigation.navigate('Connexion', { screen: 'ConnexionScreen' });
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => handleLogout()} activeOpacity={0.8} style={styles.logout}>
                        <FontAwesome name={'sign-out' as any} size={50} color='#ffe7bf' />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavigateParametres()} activeOpacity={0.8} style={styles.logout}>
                        <FontAwesome name={'cog' as any} size={50} color='#ffe7bf' />
                    </TouchableOpacity>
                </View>
                <View style={styles.main}>
                    <Text style={styles.title}>shelter</Text>
                    {user.bestScore !== null && user.bestScore > 0 && (
                        <Text style={styles.bestScore}>meilleur score : {user.bestScore} jour{user.bestScore > 1 ? 's' : ''}</Text>
                    )}
                    <View style={styles.buttonPanel}>
                        {currentGame &&<TouchableOpacity onPress={() => handleCurrentGame()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>reprendre</Text>
                        </TouchableOpacity>}
                        <TouchableOpacity onPress={() => handleNewGame()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>nouvelle partie</Text>
                        </TouchableOpacity>
                         <TouchableOpacity onPress={() => handleNavigateSucces()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>succès</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleNavigateCredit()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>crédits</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
            </KeyboardAvoidingView>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        width: '100%',
        height: 80,
        padding: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    logout:{
        width: 55,
        height: 55,
    },
    main:{
       width : '100%',
       height:'100%',
       alignItems: 'center',
       paddingTop: 80

    },
    title: {
        fontSize: 70,
        fontWeight: '600',
        fontFamily: 'DaysLater',
        color: '#EFDAB7',
        textShadowColor: '#242120',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 2,
        marginVertical: 60
    },
    bestScore: {
        fontSize: 19,
        fontFamily: 'ArialRounded',
        color: '#ffffffc7',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: -35,
    },
    buttonPanel: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 30,
        paddingTop: 40
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#352C2B',
        width: 235,
        height: 60,
        borderWidth: 2.5,
        borderColor: 'black',
        borderRadius: 15,
    },
    btnText: {
        textTransform: 'uppercase',
        fontSize: 23,
        fontWeight: 'bold',
        color: '#ffe7bf',
    },
});