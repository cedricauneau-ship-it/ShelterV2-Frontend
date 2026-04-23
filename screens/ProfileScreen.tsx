import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, ActivityIndicator } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector } from "react-redux";
import { useCallback, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import AudioManager from '../modules/audioManager';
import { useFetchWithAuth } from '../components/fetchWithAuth';

type ProfileScreenProps = {
    navigation: NavigationProp<ParamListBase>;
};

type ProfileCard = {
    id: string;
    key: string;
    pool: string;
    text: string;
    image: string;
    requiredLevel: number;
};

// Labels des niveaux (miroir du backend)
const LEVEL_LABELS: Record<number, string> = {
    2: 'Survivant',
    3: 'Débrouillard',
    4: 'Explorateur',
    5: 'Vétéran',
    6: 'Aguerri',
    7: 'Chef de camp',
    8: 'Légende',
    9: 'Indomptable',
};

// Traduction des pools pour l'affichage
const POOL_LABELS: Record<string, string> = {
    encounter: 'Rencontre',
    event: 'Événement',
};

const getXpPercent = (levelProgress: any): number => {
    if (!levelProgress) return 0;
    if (!levelProgress.xpForNextLevel) return 100;
    const range = levelProgress.xpForNextLevel - levelProgress.xpForCurrentLevel;
    if (range <= 0) return 100;
    const progress = levelProgress.currentXp - levelProgress.xpForCurrentLevel;
    return Math.min(100, Math.max(0, (progress / range) * 100));
};

// Nombre de cartes par niveau verrouillé (placeholder)
const LOCKED_CARD_COUNT = 3;

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
    const fetchWithAuth = useFetchWithAuth();
    const user = useSelector((state: any) => state.user.value);
    const [cardsByLevel, setCardsByLevel] = useState<Record<string, ProfileCard[]>>({});
    const [playerLevel, setPlayerLevel] = useState(1);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchWithAuth('/users/profile-cards', { method: 'GET' })
                .then(res => res.json())
                .then(data => {
                    if (data.result) {
                        setCardsByLevel(data.cardsByLevel ?? {});
                        setPlayerLevel(data.level ?? 1);
                    }
                })
                .catch(err => { if (__DEV__) console.error('[ProfileScreen] fetch :', err); })
                .finally(() => setLoading(false));
        }, [])
    );

    const handleBack = () => {
        AudioManager.playEffect('click');
        navigation.goBack();
    };

    // Tous les niveaux de 2 à 9
    const allLevels = [2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.backButton}>
                    <FontAwesome name={'arrow-left' as any} size={28} color='#ffe7bf' />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profil</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Infos joueur */}
                <View style={styles.profileCard}>
                    <View style={styles.profileInner}>
                        <FontAwesome name={'user-circle' as any} size={60} color='#f2c94c' />
                        <Text style={styles.username}>{user.username}</Text>
                        <Text style={styles.levelLabel}>
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
                </View>

                {/* Séparateur */}
                <View style={styles.separator} />

                {/* Titre de section */}
                <Text style={styles.sectionTitle}>Cartes par niveau</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#f2c94c" style={{ marginTop: 30 }} />
                ) : (
                    allLevels.map(level => {
                        const isUnlocked = level <= playerLevel;
                        const cards = cardsByLevel[String(level)] ?? [];

                        return (
                            <View key={level} style={styles.levelGroup}>
                                {/* En-tête du niveau */}
                                <View style={styles.levelHeader}>
                                    <FontAwesome
                                        name={isUnlocked ? 'star' as any : 'lock' as any}
                                        size={16}
                                        color={isUnlocked ? '#f2c94c' : '#554946'}
                                    />
                                    <Text style={[
                                        styles.levelGroupTitle,
                                        !isUnlocked && styles.levelGroupTitleLocked
                                    ]}>
                                        Niveau {level} — {LEVEL_LABELS[level] ?? `Niv. ${level}`}
                                    </Text>
                                </View>

                                {isUnlocked ? (
                                    /* ─── Cartes débloquées ─── */
                                    cards.length > 0 ? cards.map(card => (
                                        <View key={card.id} style={styles.cardItem}>
                                            <View style={styles.cardRow}>
                                                <View style={styles.poolBadge}>
                                                    <Text style={styles.poolBadgeText}>
                                                        {POOL_LABELS[card.pool] ?? card.pool}
                                                    </Text>
                                                </View>
                                                <Text style={styles.cardText} numberOfLines={2}>
                                                    {card.text}
                                                </Text>
                                            </View>
                                        </View>
                                    )) : (
                                        <Text style={styles.emptyLevelText}>Aucune carte spéciale</Text>
                                    )
                                ) : (
                                    /* ─── Cartes verrouillées ─── */
                                    Array.from({ length: cards.length || LOCKED_CARD_COUNT }).map((_, i) => (
                                        <View key={`locked-${level}-${i}`} style={styles.lockedCardItem}>
                                            <View style={styles.lockedOverlay}>
                                                <FontAwesome name={'lock' as any} size={20} color='#554946' />
                                            </View>
                                            <View style={styles.cardRow}>
                                                <View style={styles.lockedPoolBadge}>
                                                    <Text style={styles.lockedPoolBadgeText}>???</Text>
                                                </View>
                                                <Text style={styles.lockedCardText} numberOfLines={2}>
                                                    Carte verrouillée
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        );
                    })
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        width: '100%',
        height: 80,
        paddingHorizontal: 20,
        paddingTop: 35,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 30,
    },

    // ─── Carte profil ────────────────────────────────────────────────────
    profileCard: {
        backgroundColor: '#242120',
        borderRadius: 20,
        padding: 12,
    },
    profileInner: {
        backgroundColor: '#342c29',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 4,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 8,
    },
    username: {
        fontSize: 22,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        marginTop: 8,
    },
    levelLabel: {
        fontSize: 15,
        fontFamily: 'ArialRounded',
        color: '#f2c94c',
    },
    xpBarContainer: {
        width: '100%',
        height: 12,
        backgroundColor: '#242120',
        borderRadius: 6,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#554946',
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#f2c94c',
        borderRadius: 5,
    },
    xpText: {
        fontSize: 12,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
    },

    // ─── Séparateur ──────────────────────────────────────────────────────
    separator: {
        height: 2,
        backgroundColor: '#554946',
        marginVertical: 20,
        borderRadius: 1,
    },

    // ─── Section cartes ──────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        textAlign: 'center',
        marginBottom: 16,
    },
    levelGroup: {
        marginBottom: 20,
    },
    levelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    levelGroupTitle: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#f2c94c',
    },
    levelGroupTitleLocked: {
        color: '#554946',
    },
    emptyLevelText: {
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
        fontStyle: 'italic',
        marginLeft: 4,
    },

    // ─── Carte débloquée ─────────────────────────────────────────────────
    cardItem: {
        backgroundColor: '#2a2322',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3d3331',
        padding: 12,
        marginBottom: 8,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    poolBadge: {
        backgroundColor: '#554946',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    poolBadgeText: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#f2c94c',
    },
    cardText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfcf',
        lineHeight: 18,
    },

    // ─── Carte verrouillée ───────────────────────────────────────────────
    lockedCardItem: {
        backgroundColor: '#1e1b1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2524',
        padding: 12,
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    lockedPoolBadge: {
        backgroundColor: '#2a2524',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        opacity: 0.4,
    },
    lockedPoolBadgeText: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#554946',
    },
    lockedCardText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#55494640',
        lineHeight: 18,
    },
});
