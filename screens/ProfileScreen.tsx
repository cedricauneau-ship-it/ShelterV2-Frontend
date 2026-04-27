import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, ActivityIndicator, TextInput, Modal } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { useCallback, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import AudioManager from '../modules/audioManager';
import { useFetchWithAuth } from '../components/fetchWithAuth';
import { updateUsername } from '../reducers/user';

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
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.user.value);
    const [cardsByLevel, setCardsByLevel] = useState<Record<string, ProfileCard[]>>({});
    const [playerLevel, setPlayerLevel] = useState(1);
    const [unlockedAchievements, setUnlockedAchievements] = useState(0);
    const [totalAchievements, setTotalAchievements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rank, setRank] = useState<number | null>(null);
    const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [editError, setEditError] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            Promise.all([
                fetchWithAuth('/users/profile-cards', { method: 'GET' }).then(r => r.json()),
                fetchWithAuth('/users/rank', { method: 'GET' }).then(r => r.json()),
            ])
                .then(([cardsData, rankData]) => {
                    if (cardsData.result) {
                        setCardsByLevel(cardsData.cardsByLevel ?? {});
                        setPlayerLevel(cardsData.level ?? 1);
                        setUnlockedAchievements(cardsData.unlockedAchievements ?? 0);
                        setTotalAchievements(cardsData.totalAchievements ?? 0);
                    }
                    if (rankData.result) {
                        setRank(rankData.rank);
                        setTotalPlayers(rankData.totalPlayers);
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

    const openEditModal = () => {
        AudioManager.playEffect('click');
        // Pré-remplir avec le nom actuel (sans le #tag)
        const current = user.username ?? '';
        const hashIndex = current.lastIndexOf('#');
        setNewName(hashIndex > 0 ? current.slice(0, hashIndex) : current);
        setEditError('');
        setEditModalVisible(true);
    };

    const handleSaveUsername = async () => {
        if (!newName.trim()) return;
        setEditLoading(true);
        setEditError('');
        try {
            const res = await fetchWithAuth('/users/username', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newName.trim() }),
            });
            const data = await res.json();
            if (data.result) {
                dispatch(updateUsername(data.username));
                setEditModalVisible(false);
            } else {
                setEditError(data.error || 'Erreur inconnue');
            }
        } catch {
            setEditError('Erreur de connexion');
        } finally {
            setEditLoading(false);
        }
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
                        <View style={styles.usernameRow}>
                            <Text style={styles.username}>{user.username}</Text>
                            <TouchableOpacity onPress={openEditModal} activeOpacity={0.7} style={styles.editButton}>
                                <FontAwesome name={'pencil' as any} size={16} color='#f2c94c' />
                            </TouchableOpacity>
                        </View>
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

                        {/* Compteurs */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <FontAwesome name={'gamepad' as any} size={18} color='#f2c94c' />
                                <Text style={styles.statValue}>{user.totalGames ?? 0}</Text>
                                <Text style={styles.statLabel}>Parties</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <FontAwesome name={'sort-amount-asc' as any} size={18} color='#f2c94c' />
                                <Text style={styles.statValue}>
                                    {rank !== null && totalPlayers !== null ? `${rank} / ${totalPlayers}` : '—'}
                                </Text>
                                <Text style={styles.statLabel}>Classement</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <FontAwesome name={'trophy' as any} size={18} color='#f2c94c' />
                                <Text style={styles.statValue}>{unlockedAchievements} / {totalAchievements}</Text>
                                <Text style={styles.statLabel}>Succès</Text>
                            </View>
                        </View>
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

            {/* Modal édition username */}
            <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Changer de nom</Text>
                        <Text style={styles.modalTag}>
                            Le tag {user.username?.slice(user.username.lastIndexOf('#')) ?? ''} reste inchangé
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Nouveau nom"
                            placeholderTextColor="#554946"
                            maxLength={20}
                            autoFocus
                        />
                        {editError ? <Text style={styles.modalError}>{editError}</Text> : null}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => { AudioManager.playEffect('click'); setEditModalVisible(false); }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSave, editLoading && { opacity: 0.5 }]}
                                onPress={() => { AudioManager.playEffect('click'); handleSaveUsername(); }}
                                activeOpacity={0.8}
                                disabled={editLoading}
                            >
                                <Text style={styles.modalSaveText}>{editLoading ? '...' : 'Valider'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#554946',
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

    // ─── Username edit ───────────────────────────────────────────────────
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    editButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2a2520',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#554946',
    },

    // ─── Modal ───────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    modalContent: {
        backgroundColor: '#342c29',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#554946',
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        marginBottom: 6,
    },
    modalTag: {
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
        marginBottom: 16,
    },
    modalInput: {
        width: '100%',
        backgroundColor: '#242120',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#554946',
        padding: 14,
        fontSize: 18,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        textAlign: 'center',
    },
    modalError: {
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#cc2222',
        marginTop: 8,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        width: '100%',
    },
    modalCancel: {
        flex: 1,
        backgroundColor: '#242120',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#554946',
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
    },
    modalSave: {
        flex: 1,
        backgroundColor: '#f2c94c',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#1a1715',
    },
});
