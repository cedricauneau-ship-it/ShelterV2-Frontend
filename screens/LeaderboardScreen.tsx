import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector } from "react-redux";
import { useFetchWithAuth } from "../components/fetchWithAuth";
import { RootState } from "../store";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView } from "react-native-gesture-handler";
import { useCallback, useState } from "react";
import AudioManager from '../modules/audioManager';

type LeaderboardScreenProps = {
    navigation: NavigationProp<ParamListBase>;
};

type BestScorePlayer = {
    rank: number;
    username: string;
    bestScore: number;
};

type AvgPlayer = {
    rank: number;
    username: string;
    avgDays: number;
    totalGames: number;
};

type GamesPlayer = {
    rank: number;
    username: string;
    totalGames: number;
};

export default function LeaderboardScreen({ navigation }: LeaderboardScreenProps) {
    const fetchWithAuth = useFetchWithAuth();
    const user = useSelector((state: RootState) => state.user.value);
    const [activeTab, setActiveTab] = useState<'best' | 'average' | 'games'>('best');
    const [bestPlayers, setBestPlayers] = useState<BestScorePlayer[]>([]);
    const [avgPlayers, setAvgPlayers] = useState<AvgPlayer[]>([]);
    const [gamesPlayers, setGamesPlayers] = useState<GamesPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        Promise.all([
            fetchWithAuth('/users/leaderboard', { method: 'GET' }).then(r => r.json()),
            fetchWithAuth('/users/leaderboard-average', { method: 'GET' }).then(r => r.json()),
            fetchWithAuth('/users/leaderboard-games', { method: 'GET' }).then(r => r.json()),
        ])
            .then(([bestData, avgData, gamesData]) => {
                if (bestData.result) setBestPlayers(bestData.leaderboard ?? []);
                if (avgData.result) setAvgPlayers(avgData.leaderboard ?? []);
                if (gamesData.result) setGamesPlayers(gamesData.leaderboard ?? []);
            })
            .catch(err => { if (__DEV__) console.error('[Leaderboard] fetch :', err); })
            .finally(() => setLoading(false));
    }, []));

    const medalsImages = [
        require('../assets/icon-top1.png'),
        require('../assets/icon-top2.png'),
        require('../assets/icon-top3.png'),
    ];

    const renderBestScoreItem = (player: BestScorePlayer, i: number) => {
        const isMe = player.username.trim() === (user.username ?? '').trim();
        return (
            <View key={i} style={[styles.playerItem, isMe && styles.playerItemMe]}>
                <View style={styles.playerRank}>
                    {player.rank <= 3
                        ? <Image source={medalsImages[player.rank - 1]} style={styles.medal} />
                        : <Text style={styles.rankText}>#{player.rank}</Text>
                    }
                    <View style={styles.line} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerUsername} numberOfLines={1}>{player.username}</Text>
                        <Text style={styles.playerScore}>
                            {player.bestScore} <Text style={styles.jours}>jours</Text>
                        </Text>
                    </View>
                </View>
                {isMe && <FontAwesome name='user' size={20} color='#554946' />}
            </View>
        );
    };

    const renderAvgItem = (player: AvgPlayer, i: number) => {
        const isMe = player.username.trim() === (user.username ?? '').trim();
        return (
            <View key={i} style={[styles.playerItem, isMe && styles.playerItemMe]}>
                <View style={styles.playerRank}>
                    {player.rank <= 3
                        ? <Image source={medalsImages[player.rank - 1]} style={styles.medal} />
                        : <Text style={styles.rankText}>#{player.rank}</Text>
                    }
                    <View style={styles.line} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerUsername} numberOfLines={1}>{player.username}</Text>
                        <Text style={styles.playerScore}>
                            {player.avgDays} <Text style={styles.jours}>jours/partie</Text>
                        </Text>
                        <Text style={styles.gamesCount}>{player.totalGames} parties</Text>
                    </View>
                </View>
                {isMe && <FontAwesome name='user' size={20} color='#554946' />}
            </View>
        );
    };

    const renderGamesItem = (player: GamesPlayer, i: number) => {
        const isMe = player.username.trim() === (user.username ?? '').trim();
        return (
            <View key={i} style={[styles.playerItem, isMe && styles.playerItemMe]}>
                <View style={styles.playerRank}>
                    {player.rank <= 3
                        ? <Image source={medalsImages[player.rank - 1]} style={styles.medal} />
                        : <Text style={styles.rankText}>#{player.rank}</Text>
                    }
                    <View style={styles.line} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerUsername} numberOfLines={1}>{player.username}</Text>
                        <Text style={styles.playerScore}>
                            {player.totalGames} <Text style={styles.jours}>parties</Text>
                        </Text>
                    </View>
                </View>
                {isMe && <FontAwesome name='user' size={20} color='#554946' />}
            </View>
        );
    };

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
                        navigation.goBack();
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
                                style={[styles.tab, activeTab === 'best' && styles.activeTab]}
                                onPress={() => {
                                    try { AudioManager.playEffect('click'); } catch {}
                                    setActiveTab('best');
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === 'best' && styles.activeTabText]}>
                                    SCORE
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'average' && styles.activeTab]}
                                onPress={() => {
                                    try { AudioManager.playEffect('click'); } catch {}
                                    setActiveTab('average');
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === 'average' && styles.activeTabText]}>
                                    MOYENNE
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'games' && styles.activeTab]}
                                onPress={() => {
                                    try { AudioManager.playEffect('click'); } catch {}
                                    setActiveTab('games');
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
                                    PARTIES
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Titre */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>
                                {activeTab === 'best' ? 'Top 100 — Meilleur score'
                                    : activeTab === 'average' ? 'Top 100 — Meilleure moyenne'
                                    : 'Top 100 — Parties jouées'}
                            </Text>
                        </View>

                        {activeTab === 'average' && (
                            <Text style={styles.minGamesNote}>Minimum 10 parties pour être classé</Text>
                        )}

                        {/* Liste */}
                        <ScrollView
                            style={styles.listScroll}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {loading ? (
                                <Text style={styles.loadingText}>Chargement...</Text>
                            ) : activeTab === 'best' ? (
                                bestPlayers.length > 0
                                    ? bestPlayers.map(renderBestScoreItem)
                                    : <Text style={styles.emptyText}>Aucun joueur classé</Text>
                            ) : activeTab === 'average' ? (
                                avgPlayers.length > 0
                                    ? avgPlayers.map(renderAvgItem)
                                    : <Text style={styles.emptyText}>Aucun joueur éligible (10 parties min.)</Text>
                            ) : (
                                gamesPlayers.length > 0
                                    ? gamesPlayers.map(renderGamesItem)
                                    : <Text style={styles.emptyText}>Aucun joueur classé</Text>
                            )}
                        </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#EFDAB7',
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
    },
    activeTabText: {
        color: '#EFDAB7',
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
        fontSize: 17,
        fontFamily: 'ArialRounded',
        color: '#EFDAB7',
    },
    minGamesNote: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
        marginTop: 8,
        fontStyle: 'italic',
    },

    // ─── Liste ───────────────────────────────────────────────────────────
    listScroll: {
        flex: 1,
        width: '90%',
        marginTop: 15,
    },
    listContent: {
        gap: 8,
        paddingBottom: 20,
    },
    loadingText: {
        color: '#EFDAB7',
        fontSize: 16,
        fontFamily: 'ArialRounded',
        textAlign: 'center',
        marginTop: 30,
    },
    emptyText: {
        color: '#8B7355',
        fontSize: 14,
        fontFamily: 'ArialRounded',
        textAlign: 'center',
        marginTop: 30,
    },

    // ─── Player item ─────────────────────────────────────────────────────
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#EFDAB7',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    playerItemMe: {
        borderWidth: 2,
        borderColor: '#f2c94c',
    },
    playerRank: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    medal: {
        width: 50,
        height: 50,
    },
    rankText: {
        color: '#554946',
        fontSize: 22,
        fontFamily: 'ArialRounded',
        fontWeight: 'bold',
        width: 50,
        textAlign: 'center',
    },
    line: {
        height: 50,
        width: 1,
        backgroundColor: '#8B7355',
    },
    playerTextContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
    },
    playerUsername: {
        fontFamily: 'ArialRounded',
        color: '#554946',
        fontSize: 14,
        opacity: 0.8,
    },
    playerScore: {
        color: '#554946',
        fontSize: 22,
        fontFamily: 'ArialRounded',
        fontWeight: 'bold',
    },
    jours: {
        color: '#554946',
        fontSize: 14,
        fontFamily: 'ArialRounded',
        fontWeight: 'normal',
    },
    gamesCount: {
        color: '#8B7355',
        fontSize: 11,
        fontFamily: 'ArialRounded',
    },
});
 