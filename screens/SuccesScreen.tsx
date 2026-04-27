import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground, ActivityIndicator } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector } from "react-redux";
import { useFetchWithAuth } from "../components/fetchWithAuth";
import { RootState } from "../store";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView } from "react-native-gesture-handler";
import { useCallback, useMemo, useState } from "react";
import Achievement from '../components/Achievement';
import AudioManager from '../modules/audioManager';

type SuccesScreenProps = {
    navigation: NavigationProp<ParamListBase>;
};

type AchievementData = {
    name: string;
    description: string;
    image: string;
};

type UserStats = {
    bestScore: number;
    totalGames: number;
    avgDays: number;
    xp: number;
    level: number;
    unlockedAchievements: number;
    totalAchievements: number;
};

// Labels des niveaux (miroir du backend)
const LEVEL_LABELS: Record<number, string> = {
    1: 'Rescapé',
    2: 'Survivant',
    3: 'Débrouillard',
    4: 'Explorateur',
    5: 'Vétéran',
    6: 'Aguerri',
    7: 'Chef de camp',
    8: 'Légende',
    9: 'Indomptable',
};

export default function SuccesScreen({ navigation }: SuccesScreenProps) {
    const fetchWithAuth = useFetchWithAuth();
    const user = useSelector((state: RootState) => state.user.value);
    const [succesData, setSuccesData] = useState<AchievementData[]>([]);
    const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementData[]>([]);
    const [activeTab, setActiveTab] = useState<'succes' | 'stats'>('succes');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        Promise.all([
            fetchWithAuth('/achievements', { method: 'GET' }).then(r => r.json()),
            fetchWithAuth('/users/unlockedAchievements', { method: 'GET' }).then(r => r.json()),
            fetchWithAuth('/users/stats', { method: 'GET' }).then(r => r.json()),
        ])
            .then(([achData, unlockedData, statsData]) => {
                setSuccesData(achData.achievements ?? []);
                setUnlockedAchievement(unlockedData.unlockedAchievements ?? []);
                if (statsData.result) setStats(statsData);
            })
            .catch(err => { if (__DEV__) console.error('Erreur fetch succes :', err); })
            .finally(() => setLoading(false));
    }, []));

    const succes = useMemo(() => {
        const sorted = [...succesData].sort((a, b) => {
            const aUnlocked = unlockedAchievement.some(ach => ach.name === a.name);
            const bUnlocked = unlockedAchievement.some(ach => ach.name === b.name);
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return 0;
        });
        return sorted.map((data, i) => {
            const isUnlocked = unlockedAchievement.some(ach => ach.name === data.name);
            return <Achievement key={i} name={data.name} description={data.description} image={data.image} isUnlocked={isUnlocked} />;
        });
    }, [succesData, unlockedAchievement]);

    const renderStatBox = (icon: string, value: string | number, label: string) => (
        <View style={styles.statBox}>
            <FontAwesome name={icon as any} size={22} color='#f2c94c' />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <ImageBackground
            source={require('../assets/background.jpg')}
            resizeMode="cover"
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        try { AudioManager.playEffect('click'); } catch {}
                        navigation.navigate('Home', { screen: 'Menu' });
                    }}
                >
                    <Image source={require('../assets/icon-arrow.png')} style={styles.leftArrow} />
                </TouchableOpacity>
            </View>

            <View style={styles.main}>
                <View style={styles.darkBackground}>
                    <View style={styles.cardContainer}>
                        {/* Onglets */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'succes' && styles.activeTab]}
                                onPress={() => {
                                    try { AudioManager.playEffect('click'); } catch {}
                                    setActiveTab('succes');
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === 'succes' && styles.activeTabText]}>
                                    SUCCÈS
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
                                onPress={() => {
                                    try { AudioManager.playEffect('click'); } catch {}
                                    setActiveTab('stats');
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
                                    STATS
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ─── Onglet SUCCÈS ─── */}
                        {activeTab === 'succes' && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionHeaderText}>Liste des succès</Text>
                                </View>
                                <ScrollView contentContainerStyle={styles.scrollView}>
                                    {succes}
                                </ScrollView>
                            </>
                        )}

                        {/* ─── Onglet STATS ─── */}
                        {activeTab === 'stats' && (
                            <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.statsScroll} showsVerticalScrollIndicator={false}>
                                {loading || !stats ? (
                                    <ActivityIndicator size="large" color="#f2c94c" style={{ marginTop: 40 }} />
                                ) : (
                                    <>
                                        {/* Record personnel */}
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionHeaderText}>Record personnel</Text>
                                        </View>
                                        <View style={styles.recordContainer}>
                                            <Text style={styles.recordValue}>{stats.bestScore}</Text>
                                        </View>
                                        <Text style={styles.recordLabel}>
                                            jour{stats.bestScore !== 1 ? 's' : ''} de survie
                                        </Text>

                                        {/* Grille de stats */}
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionHeaderText}>Statistiques</Text>
                                        </View>

                                        <View style={styles.statsGrid}>
                                            {renderStatBox('gamepad', stats.totalGames, 'Parties jouées')}
                                            {renderStatBox('bar-chart', stats.avgDays, 'Moyenne jours')}
                                            {renderStatBox('star', `Niv. ${stats.level}`, LEVEL_LABELS[stats.level] ?? `Niv. ${stats.level}`)}
                                            {renderStatBox('bolt', stats.xp, 'XP total')}
                                        </View>
                                    </>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        width: '100%',
        paddingHorizontal: 40,
        paddingTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
    },
    leftArrow: {
        width: '100%',
        height: '100%',
    },
    main: {
        width: '100%',
        height: '90%',
        paddingHorizontal: 36,
        paddingVertical: 30,
    },
    darkBackground: {
        backgroundColor: '#242120',
        width: '100%',
        height: '94%',
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5,
    },

    // ─── Onglets ─────────────────────────────────────────────────────────
    tabContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#554946',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#EFDAB7',
    },
    tabText: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
    },
    activeTabText: {
        color: '#EFDAB7',
        fontFamily: 'ArialRounded',
    },

    // ─── Section header ──────────────────────────────────────────────────
    sectionHeader: {
        marginTop: 20,
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#554946',
    },
    sectionHeaderText: {
        fontSize: 18,
        fontFamily: 'ArialRounded',
        color: '#EFDAB7',
    },

    // ─── Succès scroll ───────────────────────────────────────────────────
    scrollView: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        gap: 10,
        paddingTop: 10,
    },

    // ─── Stats scroll ────────────────────────────────────────────────────
    statsScroll: {
        alignItems: 'center',
        width: '100%',
        paddingBottom: 30,
    },

    // ─── Record ──────────────────────────────────────────────────────────
    recordContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        width: '48%',
        height: 60,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'black',
        backgroundColor: '#EFDAB7',
    },
    recordValue: {
        color: 'black',
        fontSize: 35,
        fontFamily: 'ArialRounded',
    },
    recordLabel: {
        color: '#EFDAB7',
        fontSize: 18,
        fontFamily: 'ArialRounded',
        marginTop: 10,
    },

    // ─── Grille de stats ─────────────────────────────────────────────────
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
        paddingHorizontal: 12,
    },
    statBox: {
        width: '44%',
        backgroundColor: '#242120',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#554946',
        paddingVertical: 16,
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 22,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
    },

    // ─── Barre succès ────────────────────────────────────────────────────
    achievementProgress: {
        width: '80%',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    achievementBarBg: {
        width: '100%',
        height: 14,
        backgroundColor: '#242120',
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#554946',
        overflow: 'hidden',
    },
    achievementBarFill: {
        height: '100%',
        backgroundColor: '#f2c94c',
        borderRadius: 6,
    },
    achievementCount: {
        fontSize: 14,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
    },
});
