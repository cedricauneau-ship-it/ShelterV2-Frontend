import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image, Alert, TextInput, Share, ScrollView, ActivityIndicator } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { useState, useCallback } from "react";
import { FontAwesome } from "@expo/vector-icons";

import AudioManager from '../modules/audioManager';
import AdManager from '../modules/adManager';
import { useFetchWithAuth } from '../components/fetchWithAuth';
import { setPremium, setReferralCode } from "../reducers/user";
import { RootState } from "../store";

const PREMIUM_SKU = 'shelter_remove_ads'; // ID du produit sur Google Play Console

type ShopScreenProps = {
    navigation: NavigationProp<ParamListBase>;
};

type ReferralData = {
    isPremium: boolean;
    referralCode: string | null;
    hasReferrer: boolean;
    referrals: { username: string; games: number; qualified: boolean }[];
    totalReferees: number;
    qualifiedReferees: number;
    requiredReferees: number;
    requiredGamesPerReferee: number;
    canUnlockPremium: boolean;
};

export default function ShopScreen({ navigation }: ShopScreenProps) {
    const fetchWithAuth = useFetchWithAuth();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.user.value);

    const [referralInput, setReferralInput] = useState('');
    const [referralInfo, setReferralInfo] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    // Charger les infos de parrainage au focus
    useFocusEffect(
        useCallback(() => {
            loadReferralInfo();
        }, [])
    );

    const loadReferralInfo = async () => {
        try {
            setLoading(true);

            // Générer le code parrain si pas encore fait
            if (!user.referralCode) {
                const codeRes = await fetchWithAuth('/users/referral', { method: 'GET' });
                const codeData = await codeRes.json();
                if (codeData.result && codeData.referralCode) {
                    dispatch(setReferralCode(codeData.referralCode));
                }
            }

            // Charger les infos de parrainage
            const res = await fetchWithAuth('/users/referral/info', { method: 'GET' });
            const data = await res.json();
            if (data.result) {
                setReferralInfo(data);
                if (data.isPremium && !user.isPremium) {
                    dispatch(setPremium(true));
                    AdManager.setPremium(true);
                }
            }
        } catch (err) {
            if (__DEV__) console.error('[ShopScreen] loadReferralInfo:', err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Achat premium ──────────────────────────────────────────────────────

    const handlePurchase = async () => {
        let RNIap: any = null;

        try {
            // Chargement dynamique — n'échoue pas au build, seulement à l'exécution si absent
            RNIap = require('react-native-iap');
        } catch {
            Alert.alert('Indisponible', 'L\'achat in-app n\'est pas disponible dans cette version.');
            return;
        }

        try {
            setPurchasing(true);
            await RNIap.initConnection();
            const products = await RNIap.getProducts({ skus: [PREMIUM_SKU] });

            if (products.length === 0) {
                Alert.alert('Erreur', 'Produit introuvable sur le store.');
                return;
            }

            const purchase = await RNIap.requestPurchase({ sku: PREMIUM_SKU });

            // Envoyer le token au backend pour activation
            const res = await fetchWithAuth('/users/premium/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseToken: purchase.purchaseToken }),
            });
            const data = await res.json();

            if (data.result) {
                dispatch(setPremium(true));
                AdManager.setPremium(true);
                await RNIap.finishTransaction({ purchase });
                Alert.alert('Merci !', 'Les publicités ont été supprimées. Profite du jeu !');
            }
        } catch (err: any) {
            if (err?.code !== 'E_USER_CANCELLED') {
                if (__DEV__) console.error('[ShopScreen] purchase error:', err);
                Alert.alert('Erreur', 'L\'achat a échoué. Réessaie plus tard.');
            }
        } finally {
            setPurchasing(false);
            try { RNIap?.endConnection(); } catch {}
        }
    };

    // ─── Appliquer un code parrain ──────────────────────────────────────────

    const handleApplyReferral = async () => {
        const code = referralInput.trim().toUpperCase();
        if (!code) return;

        try {
            AudioManager.playEffect('click');
            const res = await fetchWithAuth('/users/referral/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (data.result) {
                Alert.alert('Parrain ajouté !', `Tu as été parrainé par ${data.referrerUsername}.`);
                setReferralInput('');
                loadReferralInfo();
            } else {
                Alert.alert('Erreur', data.error || 'Code invalide.');
            }
        } catch {
            Alert.alert('Erreur', 'Impossible d\'appliquer le code.');
        }
    };

    // ─── Partager son code / lien ───────────────────────────────────────────

    const handleShare = async () => {
        const code = user.referralCode || referralInfo?.referralCode;
        if (!code) return;

        AudioManager.playEffect('click');
        const message = `Rejoins-moi sur Shelter ! Utilise mon code parrain ${code} ou clique ici : https://shelter-game.app/invite/${code}`;

        try {
            await Share.share({ message });
        } catch {}
    };

    const handleBack = () => {
        AudioManager.playEffect('click');
        navigation.navigate('Home', { screen: 'Menu' });
    };

    // ─── Progression parrainage ─────────────────────────────────────────────

    const referralCode = user.referralCode || referralInfo?.referralCode || '...';
    const qualifiedReferees = referralInfo?.qualifiedReferees ?? 0;
    const requiredReferees = referralInfo?.requiredReferees ?? 5;
    const requiredGamesPerReferee = referralInfo?.requiredGamesPerReferee ?? 25;

    const qualifiedProgress = Math.min(qualifiedReferees / requiredReferees, 1);

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Image source={require('../assets/icon-arrow.png')} style={styles.leftArrow} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.darkBackground}>
                    <View style={styles.cardContainer}>
                        <Text style={styles.title}>BOUTIQUE</Text>

                        {/* ─── Section Premium ──────────────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                <FontAwesome name="star" size={18} color="#f2c94c" /> SUPPRIMER LES PUBS
                            </Text>

                            {user.isPremium ? (
                                <View style={styles.premiumBadge}>
                                    <FontAwesome name="check-circle" size={24} color="#6b8a48" />
                                    <Text style={styles.premiumText}>Premium activé</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.buyButton}
                                    onPress={handlePurchase}
                                    disabled={purchasing}
                                    activeOpacity={0.8}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color="#242120" />
                                    ) : (
                                        <Text style={styles.buyButtonText}>Acheter — 2,99 €</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* ─── Séparateur ───────────────────────────────────── */}
                        <View style={styles.separator} />

                        {/* ─── Section Parrainage ───────────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                <FontAwesome name="users" size={16} color="#ffe7bf" /> PARRAINAGE
                            </Text>

                            <Text style={styles.description}>
                                Invite 5 amis qui jouent chacun 25 parties et débloque le premium gratuitement !
                            </Text>

                            {/* Code parrain */}
                            <View style={styles.codeSection}>
                                <Text style={styles.codeLabel}>Ton code parrain :</Text>
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>{referralCode}</Text>
                                </View>
                                <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
                                    <FontAwesome name="share-alt" size={16} color="#242120" />
                                    <Text style={styles.shareButtonText}> Partager</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Barre de progression globale */}
                            <View style={styles.progressSection}>
                                <Text style={styles.progressLabel}>
                                    Filleuls qualifiés : {qualifiedReferees}/{requiredReferees}
                                </Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${qualifiedProgress * 100}%`, backgroundColor: '#6b8a48' }]} />
                                </View>
                            </View>

                            {/* Liste des filleuls avec progression individuelle */}
                            {referralInfo && referralInfo.referrals.length > 0 && (
                                <View style={styles.referralsList}>
                                    <Text style={styles.referralsTitle}>Tes filleuls :</Text>
                                    {referralInfo.referrals.map((r, i) => {
                                        const progress = Math.min(r.games / requiredGamesPerReferee, 1);
                                        return (
                                            <View key={i} style={styles.referralItem}>
                                                <View style={styles.referralRow}>
                                                    <Text style={styles.referralName}>
                                                        {r.qualified ? '✓ ' : ''}{r.username}
                                                    </Text>
                                                    <Text style={[styles.referralGames, r.qualified && { color: '#6b8a48' }]}>
                                                        {r.games}/{requiredGamesPerReferee}
                                                    </Text>
                                                </View>
                                                <View style={styles.referralProgressBar}>
                                                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: r.qualified ? '#6b8a48' : '#378ded' }]} />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Saisir un code parrain */}
                            {!referralInfo?.hasReferrer && (
                                <View style={styles.applySection}>
                                    <Text style={styles.codeLabel}>Tu as un code parrain ?</Text>
                                    <View style={styles.inputRow}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="CODE-XXXX"
                                            placeholderTextColor="#554946"
                                            value={referralInput}
                                            onChangeText={setReferralInput}
                                            autoCapitalize="characters"
                                            maxLength={12}
                                        />
                                        <TouchableOpacity style={styles.applyButton} onPress={handleApplyReferral} activeOpacity={0.8}>
                                            <Text style={styles.applyButtonText}>OK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 36,
        paddingVertical: 20,
        paddingBottom: 60,
    },
    darkBackground: {
        backgroundColor: '#242120',
        width: '100%',
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#342c29',
        width: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5,
        paddingVertical: 25,
        paddingHorizontal: 20,
        gap: 20,
    },
    title: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 26,
        textAlign: 'center',
    },

    // ─── Sections ────────────────────────────────────────────────────────
    section: {
        width: '100%',
        gap: 12,
        alignItems: 'center',
    },
    sectionTitle: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 18,
        textAlign: 'center',
    },
    description: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    separator: {
        width: '80%',
        height: 2,
        backgroundColor: '#554946',
        borderRadius: 1,
    },

    // ─── Premium ─────────────────────────────────────────────────────────
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2a3a20',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    premiumText: {
        color: '#6b8a48',
        fontFamily: 'ArialRounded',
        fontSize: 16,
    },
    buyButton: {
        backgroundColor: '#f2c94c',
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d4a937',
        minWidth: 200,
        alignItems: 'center',
    },
    buyButtonText: {
        color: '#242120',
        fontFamily: 'ArialRounded',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // ─── Code parrain ────────────────────────────────────────────────────
    codeSection: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    codeLabel: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 13,
    },
    codeBox: {
        backgroundColor: '#242120',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#554946',
    },
    codeText: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 22,
        letterSpacing: 3,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe7bf',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    shareButtonText: {
        color: '#242120',
        fontFamily: 'ArialRounded',
        fontSize: 14,
    },

    // ─── Progression ─────────────────────────────────────────────────────
    progressSection: {
        width: '100%',
        gap: 6,
        marginTop: 4,
    },
    progressLabel: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 12,
    },
    progressBar: {
        width: '100%',
        height: 14,
        backgroundColor: '#242120',
        borderRadius: 7,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#554946',
    },
    progressFill: {
        height: '100%',
        borderRadius: 7,
    },

    // ─── Liste filleuls ──────────────────────────────────────────────────
    referralsList: {
        width: '100%',
        gap: 6,
        marginTop: 4,
    },
    referralsTitle: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 14,
    },
    referralItem: {
        gap: 4,
    },
    referralRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    referralProgressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#242120',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#554946',
    },
    referralName: {
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 13,
    },
    referralGames: {
        color: '#6b8a48',
        fontFamily: 'ArialRounded',
        fontSize: 13,
    },

    // ─── Saisie code parrain ─────────────────────────────────────────────
    applySection: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    input: {
        flex: 1,
        backgroundColor: '#242120',
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#554946',
        letterSpacing: 2,
        textAlign: 'center',
    },
    applyButton: {
        backgroundColor: '#ffe7bf',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#242120',
        fontFamily: 'ArialRounded',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
