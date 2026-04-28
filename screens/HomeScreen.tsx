import { View, Text, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ImageBackground, Modal, Image } from "react-native"
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { setGameState, setUserData, setFirstGame, updateSettings } from "../reducers/user";
import { useCallback, useEffect, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import AudioManager from '../modules/audioManager';
import AdManager from '../modules/adManager';

import { useFetchWithAuth } from '../components/fetchWithAuth';

type HomeScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}

// Persisté en mémoire (reset au kill de l'app, ce qui est ok)
let popupDismissedAt = -1; // -1 = jamais dismiss, sinon nombre de parties au moment du dismiss
let popupShownThisSession = false; // true = déjà affichée depuis le dernier dismiss
let cachedHidePromo = false;
let cachedIsPremium = false;

const getXpPercent = (levelProgress: any): number => {
    if (!levelProgress) return 0;
    if (!levelProgress.xpForNextLevel) return 100; // niveau max
    const range = levelProgress.xpForNextLevel - levelProgress.xpForCurrentLevel;
    if (range <= 0) return 100;
    const progress = levelProgress.currentXp - levelProgress.xpForCurrentLevel;
    return Math.min(100, Math.max(0, (progress / range) * 100));
};

export default function HomeScreen({ navigation }: HomeScreenProps ) {
    const fetchWithAuth = useFetchWithAuth();
    const [currentGame, setCurrentGame] = useState(false);
    const [showPromo, setShowPromo] = useState(false);
    const [remindLater, setRemindLater] = useState(false);

    const user = useSelector((state: any) => state.user.value);
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
                dispatch(setUserData({ bestScore: data.bestScore ?? 0, soundOn: data.settings.soundOn, volume: data.settings.volume, btnSoundOn: data.settings.btnSoundOn, hapticOn: data.settings.hapticOn ?? true, totalGames: data.totalGames ?? 0, isPremium: data.isPremium ?? false, referralCode: data.referralCode ?? null, xp: data.xp ?? 0, level: data.level ?? 1, levelProgress: data.levelProgress ?? null }));
                AudioManager.init({ volume: data.settings.volume, soundOn: data.settings.soundOn, btnSoundOn: data.settings.btnSoundOn });
                AdManager.setPremium(data.isPremium ?? false);

                // On stocke hidePromo pour la vérification dans handleNewGame
                cachedHidePromo = data.settings?.hidePromo ?? false;
                cachedIsPremium = data.isPremium ?? false;
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
                    dispatch(setFirstGame(false));
                    return;
                } else {
                    dispatch(setFirstGame(true));
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

    const shouldShowPromo = (): boolean => {
        if (cachedIsPremium || cachedHidePromo || popupShownThisSession) return false;
        const total = user.totalGames ?? 0;
        return popupDismissedAt === -1 || total - popupDismissedAt >= 15;
    };

    const handleNewGame = () => {
        if (AdManager.shouldShow() && AdManager.isLoaded()) {
            AdManager.show(() => {
                // Après la fermeture de la pub, proposer la promo
                if (shouldShowPromo()) {
                    popupShownThisSession = true;
                    setShowPromo(true);
                    // La partie se lancera quand l'utilisateur fermera la popup ou ira à la boutique
                } else {
                    startNewGame();
                }
            });
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

    const handleNavigateProfile = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Profile', { screen: 'Profile' });
    };

    const handleNavigateShop = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Shop', { screen: 'Shop' });
    };

    const handleNavigateFeedback = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Feedback', { screen: 'Feedback' });
    };

    const handleNavigateLeaderboard = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Leaderboard', { screen: 'Leaderboard' });
    };


    const handleDismissPromo = () => {
        popupDismissedAt = user.totalGames ?? 0;
        popupShownThisSession = false; // permettra de réapparaître dans 15 parties
        setShowPromo(false);
        setRemindLater(false);
        startNewGame(); // lancer la partie après fermeture
    };

    const handleNeverShowPromo = () => {
        setShowPromo(false);
        cachedHidePromo = true;
        // Persister le choix côté backend dans les settings
        fetchWithAuth('/users/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hidePromo: true }),
        }).catch(() => {});
        dispatch(updateSettings({ hidePromo: true } as any));
        startNewGame(); // lancer la partie après fermeture
    };

    const handlePromoShop = () => {
        setShowPromo(false);
        setRemindLater(false);
        handleNavigateShop(); // va à la boutique, pas de partie lancée
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => handleNavigateProfile()} activeOpacity={0.8} style={styles.headerIcon}>
                        <FontAwesome name={'user-circle' as any} size={32} color='#ffe7bf' />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavigateLeaderboard()} activeOpacity={0.8} style={styles.headerIcon}>
                        <Image source={require('../assets/icon-ranking.png')} style={{ width: 32, height: 32, tintColor: '#ffe7bf' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavigateShop()} activeOpacity={0.8} style={styles.headerIcon}>
                        <FontAwesome name={'shopping-cart' as any} size={32} color='#ffe7bf' />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavigateFeedback()} activeOpacity={0.8} style={styles.headerIcon}>
                        <FontAwesome name={'envelope-o' as any} size={32} color='#ffe7bf' />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavigateParametres()} activeOpacity={0.8} style={styles.headerIcon}>
                        <FontAwesome name={'cog' as any} size={32} color='#ffe7bf' />
                    </TouchableOpacity>
                </View>
                <View style={styles.main}>
                    <Text style={styles.title}>shelter</Text>
                    {user.username && (
                        <View style={styles.levelContainer}>
                            <Text style={styles.usernameText}>{user.username}</Text>
                            <Text style={styles.levelText}>
                                Niv. {user.level ?? 1} — {user.levelProgress?.label ?? 'Rescapé'}
                            </Text>
                            <View style={styles.xpBarContainer}>
                                <View style={[styles.xpBarFill, { width: `${getXpPercent(user.levelProgress)}%` }]} />
                            </View>
                            <Text style={styles.xpText}>
                                {user.levelProgress?.xpForNextLevel
                                    ? `${user.levelProgress.currentXp} / ${user.levelProgress.xpForNextLevel} XP`
                                    : `${user.levelProgress?.currentXp ?? 0} XP — MAX`}
                            </Text>
                        </View>
                    )}
                    <View style={styles.buttonPanel}>
                        {currentGame &&<TouchableOpacity onPress={() => handleCurrentGame()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>reprendre</Text>
                        </TouchableOpacity>}
                        <TouchableOpacity onPress={() => handleNewGame()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>nouvelle partie</Text>
                        </TouchableOpacity>
                         <TouchableOpacity onPress={() => handleNavigateSucces()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>statistiques</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleNavigateCredit()} style={styles.button} activeOpacity={0.8}>
                            <Text style={styles.btnText}>crédits</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Popup promo premium ─────────────────────────────── */}
                <Modal
                    visible={showPromo}
                    transparent
                    animationType="fade"
                    onRequestClose={handleDismissPromo}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalInner}>
                                <FontAwesome name="star" size={32} color="#f2c94c" />
                                <Text style={styles.modalTitle}>JOUE SANS PUB</Text>
                                <Text style={styles.modalText}>
                                    Profite de Shelter sans interruption ! Supprime les publicités en achetant le premium ou en parrainant tes amis.
                                </Text>

                                <TouchableOpacity style={styles.modalButton} onPress={handlePromoShop} activeOpacity={0.8}>
                                    <Text style={styles.modalButtonText}>Voir la boutique</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.remindRow}
                                    onPress={() => setRemindLater(!remindLater)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.checkbox, remindLater && styles.checkboxChecked]}>
                                        {remindLater && <FontAwesome name="check" size={12} color="#242120" />}
                                    </View>
                                    <Text style={styles.remindText}>Me le rappeler plus tard</Text>
                                </TouchableOpacity>

                                {remindLater && (
                                    <TouchableOpacity style={styles.closeButton} onPress={handleDismissPromo} activeOpacity={0.8}>
                                        <Text style={styles.closeButtonText}>Fermer</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={handleNeverShowPromo} activeOpacity={0.8}>
                                    <Text style={styles.dismissText}>Ça ne m'intéresse pas</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

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
        paddingHorizontal: 30,
        paddingTop: 35,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerIcon:{
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
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
    levelContainer: {
        alignItems: 'center',
        marginTop: -30,
        width: '70%',
    },
    usernameText: {
        fontSize: 20,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        letterSpacing: 1.5,
    },
    levelText: {
        fontSize: 14,
        fontFamily: 'ArialRounded',
        color: '#f2c94c',
        marginTop: 4,
    },
    xpBarContainer: {
        width: '100%',
        height: 10,
        backgroundColor: '#242120',
        borderRadius: 5,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#554946',
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#f2c94c',
        borderRadius: 4,
    },
    xpText: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
        marginTop: 4,
    },
    buttonPanel: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 30,
        paddingTop: 30
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
    btnTextSmall: {
        textTransform: 'uppercase',
        fontSize: 19,
        fontWeight: 'bold',
        color: '#ffe7bf',
    },

    // ─── Modal promo ─────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    modalCard: {
        backgroundColor: '#242120',
        borderRadius: 20,
        padding: 12,
        width: '100%',
    },
    modalInner: {
        backgroundColor: '#342c29',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 4,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 16,
    },
    modalTitle: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 22,
        textAlign: 'center',
    },
    modalText: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalButton: {
        backgroundColor: '#f2c94c',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d4a937',
    },
    modalButtonText: {
        color: '#242120',
        fontFamily: 'ArialRounded',
        fontSize: 17,
        fontWeight: 'bold',
    },
    remindRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#554946',
        backgroundColor: '#242120',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#f2c94c',
        borderColor: '#d4a937',
    },
    remindText: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 13,
    },
    closeButton: {
        backgroundColor: '#554946',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
    },
    closeButtonText: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 15,
    },
    dismissText: {
        color: '#8B7355',
        fontFamily: 'ArialRounded',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
});