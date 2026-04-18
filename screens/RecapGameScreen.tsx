import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView, Image, Modal } from "react-native"
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { useFetchWithAuth } from "../components/fetchWithAuth";
import { setGameState, updateBestScore, setLevelProgress } from "../reducers/user";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import Achievement from '../components/Achievement'
import AudioManager from '../modules/audioManager';
import AdManager from '../modules/adManager';

type RecapGameScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}

type AchievementType = {
  id: string;
  name: string;
  description: string;
  image: string;
};

type XpData = {
    gained: number;
    breakdown: { days: number; achievements: number; events: number };
    oldXp: number;
    newXp: number;
    oldLevel: number;
    newLevel: number;
    leveledUp: boolean;
    unlockedCards: { key: string; pool: string; text: string; image: string }[];
    progress: { level: number; label: string; currentXp: number; xpForCurrentLevel: number; xpForNextLevel: number | null };
};

type RecapGameRouteParams = {
  achievements: AchievementType[];
  xp: XpData | null;
};


export default function RecapGameScreen({ navigation, route }: RecapGameScreenProps & { route: { params: RecapGameRouteParams } }) {
    const fetchWithAuth = useFetchWithAuth();
    const user = useSelector((state: any) => state.user.value);
    const dispatch = useDispatch();
    const [previousBestScore, setPreviousBestScore] = useState<number>(user.bestScore || 0);
    const [newBestScore, setNewBestScore] = useState<boolean>(false);
    const [showLevelUp, setShowLevelUp] = useState(false);

    const { achievements, xp } = route.params;

    // Animation barre XP
    const xpAnim = useRef(new Animated.Value(0)).current;
    const [displayXpGained, setDisplayXpGained] = useState(0);
    const xpCounterRef = useRef(new Animated.Value(0)).current;

    // Calculer le pourcentage de la barre XP
    const getXpPercent = (currentXp: number, xpForCurrentLevel: number, xpForNextLevel: number | null): number => {
        if (!xpForNextLevel) return 100;
        const range = xpForNextLevel - xpForCurrentLevel;
        if (range <= 0) return 100;
        const progress = currentXp - xpForCurrentLevel;
        return Math.min(100, Math.max(0, (progress / range) * 100));
    };

    // Met à jour le meilleur score dans le reducer
    useFocusEffect(
        useCallback(() => {
            if(user.numberDays > user.bestScore){
                dispatch(updateBestScore(user.numberDays));
                setNewBestScore(true);
            }
            else{
                setNewBestScore(false);
            }
        }, [])
    );

    // Animation XP
    useEffect(() => {
        if (!xp) return;

        const startPercent = getXpPercent(xp.oldXp, xp.progress.xpForCurrentLevel, xp.progress.xpForNextLevel);
        const endPercent = getXpPercent(xp.newXp, xp.progress.xpForCurrentLevel, xp.progress.xpForNextLevel);

        xpAnim.setValue(startPercent);

        // Compteur XP animé
        xpCounterRef.setValue(0);
        Animated.timing(xpCounterRef, {
            toValue: xp.gained,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();

        xpCounterRef.addListener(({ value }) => {
            setDisplayXpGained(Math.round(value));
        });

        // Barre animée
        const timer = setTimeout(() => {
            Animated.timing(xpAnim, {
                toValue: xp.leveledUp ? 100 : endPercent,
                duration: 1500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start(() => {
                if (xp.leveledUp) {
                    // Pause puis popup montée de niveau
                    setTimeout(() => {
                        setShowLevelUp(true);
                        // Mise à jour du Redux
                        dispatch(setLevelProgress({ xp: xp.newXp, level: xp.newLevel, levelProgress: xp.progress }));
                        // Remet la barre au nouveau pourcentage
                        xpAnim.setValue(0);
                        Animated.timing(xpAnim, {
                            toValue: endPercent,
                            duration: 800,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: false,
                        }).start();
                    }, 400);
                } else {
                    dispatch(setLevelProgress({ xp: xp.newXp, level: xp.newLevel, levelProgress: xp.progress }));
                }
            });
        }, 600);

        return () => {
            clearTimeout(timer);
            xpCounterRef.removeAllListeners();
        };
    }, []);

    const succes = achievements.map((data, i)=> {
        return <Achievement key={i} name={data.name} description={data.description} image={data.image} isUnlocked={true}/>
    });

    const handleNavigateHome = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Home', { screen: 'Home' });
    };

    const startNewPart = () => {
        fetchWithAuth(`/games/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) return;
            AudioManager.playEffect('click');
            dispatch(setGameState({ stateOfGauges: data.game.stateOfGauges, numberDays: data.game.numberDays, currentCard: data.game.currentCard }));
            navigation.navigate('Game', { screen: 'Game' });
        });
    };

    const handleNewPart = () => {
        if (AdManager.shouldShow() && AdManager.isLoaded()) {
            AdManager.show(startNewPart);
        } else {
            startNewPart();
        }
    };

    const displayLevel = xp ? (xp.leveledUp ? xp.newLevel : xp.oldLevel) : (user.level ?? 1);
    const displayLabel = xp?.progress?.label ?? 'Rescapé';

    const poolLabel = (pool: string) => {
        switch (pool) {
            case 'event': return 'Événement';
            case 'encounter': return 'Rencontre';
            default: return pool;
        }
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <View style={styles.main}>
                <View style={styles.darkBackground}>
                    <View style={styles.cardContainer}>
                        <Text style={styles.text}>Vous avez survécu :</Text>
                        <View style={styles.daysContainer}>
                            <Text style={styles.days}>{user.numberDays}</Text>
                        </View>
                        {newBestScore ? (
                            <View style={styles.newBestScore}>
                                <Text style={styles.daysText}>Jours</Text>
                                <Image source={require('../assets/icon-new.png')} style={styles.newLogo} />
                            </View>
                        ) : (
                            <Text style={styles.daysText}>Jours</Text>
                        )}
                        <View style={styles.bestScore}>
                            <Image source={require('../assets/icon-star.png')} style={styles.star} />
                            <Text style={styles.bestScoreText}>
                                {newBestScore ? `Ancien record : ${previousBestScore}` : `Record : ${user.bestScore}`} jour{(newBestScore ? previousBestScore : user.bestScore) > 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* ─── Barre XP ─────────────────────────────────── */}
                        {xp && (
                            <View style={styles.xpSection}>
                                <Text style={styles.xpGainedText}>+ {displayXpGained} XP</Text>
                                <View style={styles.xpLevelRow}>
                                    <Text style={styles.xpLevelText}>Niv. {displayLevel}</Text>
                                    <Text style={styles.xpLabelText}>{displayLabel}</Text>
                                </View>
                                <View style={styles.xpBarOuter}>
                                    <Animated.View style={[styles.xpBarInner, {
                                        width: xpAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    }]} />
                                </View>
                                <Text style={styles.xpDetailText}>
                                    {xp.progress.xpForNextLevel
                                        ? `${xp.newXp} / ${xp.progress.xpForNextLevel} XP`
                                        : `${xp.newXp} XP — MAX`}
                                </Text>
                            </View>
                        )}

                        {succes.length === 0 ? (
                            <ScrollView contentContainerStyle={styles.scrollView}>
                                <Text style={styles.text}>Aucun succès dévérouillé</Text>
                            </ScrollView>
                        ) : (
                            <ScrollView contentContainerStyle={styles.scrollView}>
                                <Text style={styles.text}>Succès dévérouillé(s)</Text>
                                {succes}
                            </ScrollView>
                        )}
                    </View>
                </View>
                <View style={styles.btnContainer}>
                    <TouchableOpacity onPress={() => handleNewPart()} style={styles.leftBtn} activeOpacity={0.8}>
                        <Text style={styles.btnText}>REJOUER</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rigthBtn} activeOpacity={0.8}>
                        <Text onPress={() => handleNavigateHome()} style={styles.btnText}>MENU</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Popup montée de niveau ─────────────────────────── */}
            <Modal
                visible={showLevelUp}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLevelUp(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalInner}>
                            <Text style={styles.levelUpEmoji}>⭐</Text>
                            <Text style={styles.levelUpTitle}>NIVEAU {xp?.newLevel} !</Text>
                            <Text style={styles.levelUpLabel}>{xp?.progress.label}</Text>
                            {xp && xp.unlockedCards.length > 0 && (
                                <>
                                    <Text style={styles.unlockedTitle}>Nouveau contenu débloqué :</Text>
                                    <ScrollView style={styles.unlockedScroll} contentContainerStyle={styles.unlockedList}>
                                        {xp.unlockedCards.map((card, i) => (
                                            <View key={i} style={styles.unlockedCard}>
                                                <Text style={styles.unlockedPool}>{poolLabel(card.pool)}</Text>
                                                <Text style={styles.unlockedText} numberOfLines={2}>{card.text}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </>
                            )}
                            <TouchableOpacity
                                style={styles.levelUpButton}
                                onPress={() => setShowLevelUp(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.levelUpButtonText}>Super !</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    main: {
        width: '100%',
        height: '85%',
        paddingHorizontal: 36,
        paddingVertical: 30,
    },
    darkBackground:{
        backgroundColor : '#242120',
        width: '100%',
        height: '90%',
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor : '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5
    },
    text: {
        marginTop: 20,
        color: '#EFDAB7',
        fontSize: 18,
        fontWeight: 'bold',
    },
    daysContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        width: '48%',
        height: 55,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'black',
        backgroundColor: '#EFDAB7'
    },
    days: {
        color: 'black',
        fontSize: 32,
        fontWeight: 'bold',
    },
    newBestScore: {
      flexDirection: 'row',
    },
    daysText: {
        marginTop: 8,
        color: '#EFDAB7',
        fontSize: 26,
        fontWeight: 'bold',
    },
    newLogo: {
        width: 50,
        height: 50,
        position: 'absolute',
        top: -70,
        left : 80
    },
    bestScore: {
        marginTop: 12,
        paddingRight: 15,
        width: '100%',
        height: 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#554946'
    },
    bestScoreText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#EFDAB7',
    },
    star: {
        marginRight: 10,
        width: 28,
        height: 28,
    },

    // ─── Section XP ──────────────────────────────────────────────────
    xpSection: {
        width: '90%',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    xpGainedText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f2c94c',
        fontFamily: 'ArialRounded',
    },
    xpLevelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    xpLevelText: {
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        fontWeight: 'bold',
    },
    xpLabelText: {
        fontSize: 12,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
    },
    xpBarOuter: {
        width: '100%',
        height: 10,
        backgroundColor: '#242120',
        borderRadius: 5,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#554946',
        overflow: 'hidden',
    },
    xpBarInner: {
        height: '100%',
        backgroundColor: '#f2c94c',
        borderRadius: 4,
    },
    xpDetailText: {
        fontSize: 10,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
        marginTop: 3,
    },

    // ─── Boutons ─────────────────────────────────────────────────────
    btnContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    leftBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '47.5%',
        height: 70,
        borderRadius: 15,
        marginTop: 30,
        backgroundColor: '#D05A34',
    },
    rigthBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '47.5%',
        height: 70,
        borderRadius: 15,
        marginTop: 30,
        backgroundColor: '#74954E',
    },
    btnText: {
        textTransform: 'uppercase',
        fontSize: 23,
        fontWeight: 'bold',
        color: '#EFDAB7',
    },

    scrollView: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        gap: 10,
        paddingTop : 8,
        paddingBottom: 1
    },

    // ─── Modal montée de niveau ─────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
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
        borderColor: '#f2c94c',
        borderWidth: 3,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 10,
    },
    levelUpEmoji: {
        fontSize: 36,
    },
    levelUpTitle: {
        color: '#f2c94c',
        fontFamily: 'ArialRounded',
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    levelUpLabel: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 16,
        textAlign: 'center',
    },
    unlockedTitle: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
    },
    unlockedScroll: {
        maxHeight: 160,
        width: '100%',
    },
    unlockedList: {
        gap: 8,
    },
    unlockedCard: {
        backgroundColor: '#242120',
        borderRadius: 10,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#f2c94c',
    },
    unlockedPool: {
        color: '#f2c94c',
        fontFamily: 'ArialRounded',
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: 'bold',
        marginBottom: 3,
    },
    unlockedText: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 12,
        lineHeight: 16,
    },
    levelUpButton: {
        backgroundColor: '#f2c94c',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d4a937',
        marginTop: 6,
    },
    levelUpButtonText: {
        color: '#242120',
        fontFamily: 'ArialRounded',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
