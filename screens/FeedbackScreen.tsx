import { View, Text, TouchableOpacity, StyleSheet, TextInput, ImageBackground, KeyboardAvoidingView, Platform } from "react-native";
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { FontAwesome } from "@expo/vector-icons";
import { useState } from "react";
import AudioManager from '../modules/audioManager';
import { useFetchWithAuth } from '../components/fetchWithAuth';

type FeedbackScreenProps = {
    navigation: NavigationProp<ParamListBase>;
};

type Category = 'BUG' | 'IDEA' | 'CONTENT' | 'OTHER';

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
    { key: 'BUG',     label: 'Bug',     icon: 'bug' },
    { key: 'IDEA',    label: 'Idée',    icon: 'lightbulb-o' },
    { key: 'CONTENT', label: 'Contenu', icon: 'file-text-o' },
    { key: 'OTHER',   label: 'Autre',   icon: 'comment-o' },
];

export default function FeedbackScreen({ navigation }: FeedbackScreenProps) {
    const fetchWithAuth = useFetchWithAuth();
    const [category, setCategory] = useState<Category>('BUG');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleBack = () => {
        AudioManager.playEffect('click');
        navigation.goBack();
    };

    const handleSend = async () => {
        if (message.trim().length < 5) {
            setError('Le message doit faire au moins 5 caractères');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetchWithAuth('/feedbacks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, message: message.trim() }),
            });
            const data = await res.json();
            if (data.result) {
                AudioManager.playEffect('click');
                setSent(true);
            } else {
                setError(data.error || 'Erreur inconnue');
            }
        } catch {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleNewFeedback = () => {
        setSent(false);
        setMessage('');
        setCategory('BUG');
        setError('');
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.backButton}>
                        <FontAwesome name={'arrow-left' as any} size={28} color='#ffe7bf' />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Feedback</Text>
                    <View style={styles.backButton} />
                </View>

                <View style={styles.main}>
                    <View style={styles.card}>
                        <View style={styles.cardInner}>
                            {sent ? (
                                /* ─── Confirmation ─── */
                                <View style={styles.sentContainer}>
                                    <FontAwesome name={'check-circle' as any} size={60} color='#4CAF50' />
                                    <Text style={styles.sentTitle}>Merci !</Text>
                                    <Text style={styles.sentText}>
                                        Ton retour a bien été envoyé. Il sera lu avec attention.
                                    </Text>
                                    <TouchableOpacity style={[styles.sendButton, { paddingHorizontal: 40, width: '80%' }]} onPress={handleNewFeedback} activeOpacity={0.8}>
                                        <Text style={styles.sendButtonText}>Envoyer un autre</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleBack} activeOpacity={0.8}>
                                        <Text style={styles.backLink}>Retour au menu</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                /* ─── Formulaire ─── */
                                <>
                                    <Text style={styles.sectionTitle}>Type de retour</Text>

                                    <View style={styles.categoriesRow}>
                                        {CATEGORIES.map(cat => (
                                            <TouchableOpacity
                                                key={cat.key}
                                                style={[
                                                    styles.categoryButton,
                                                    category === cat.key && styles.categoryButtonActive,
                                                ]}
                                                onPress={() => {
                                                    AudioManager.playEffect('click');
                                                    setCategory(cat.key);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <FontAwesome
                                                    name={cat.icon as any}
                                                    size={18}
                                                    color={category === cat.key ? '#242120' : '#8B7355'}
                                                />
                                                <Text style={[
                                                    styles.categoryText,
                                                    category === cat.key && styles.categoryTextActive,
                                                ]}>
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.sectionTitle}>Message</Text>

                                    <TextInput
                                        style={styles.textInput}
                                        value={message}
                                        onChangeText={setMessage}
                                        placeholder="Décris ton bug ou ton idée..."
                                        placeholderTextColor="#554946"
                                        multiline
                                        maxLength={1000}
                                        textAlignVertical="top"
                                    />

                                    <Text style={styles.charCount}>{message.length} / 1000</Text>

                                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                    <TouchableOpacity
                                        style={[styles.sendButton, loading && { opacity: 0.5 }]}
                                        onPress={() => { AudioManager.playEffect('click'); handleSend(); }}
                                        activeOpacity={0.8}
                                        disabled={loading}
                                    >
                                        <FontAwesome name={'paper-plane' as any} size={16} color='#242120' />
                                        <Text style={styles.sendButtonText}>
                                            {loading ? 'Envoi...' : 'Envoyer'}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
    main: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#242120',
        borderRadius: 20,
        padding: 12,
        flex: 1,
        marginBottom: 30,
    },
    cardInner: {
        backgroundColor: '#342c29',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 4,
        paddingVertical: 24,
        paddingHorizontal: 20,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        marginBottom: 12,
        marginTop: 8,
    },

    // ─── Catégories ──────────────────────────────────────────────────────
    categoriesRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    categoryButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#242120',
        borderWidth: 1,
        borderColor: '#554946',
        gap: 4,
    },
    categoryButtonActive: {
        backgroundColor: '#f2c94c',
        borderColor: '#d4a937',
    },
    categoryText: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
    },
    categoryTextActive: {
        color: '#242120',
    },

    // ─── Input ───────────────────────────────────────────────────────────
    textInput: {
        backgroundColor: '#242120',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#554946',
        padding: 14,
        fontSize: 15,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
        minHeight: 180,
        maxHeight: 260,
    },
    charCount: {
        fontSize: 11,
        fontFamily: 'ArialRounded',
        color: '#554946',
        textAlign: 'right',
        marginTop: 4,
    },
    errorText: {
        fontSize: 13,
        fontFamily: 'ArialRounded',
        color: '#cc2222',
        textAlign: 'center',
        marginTop: 8,
    },

    // ─── Bouton envoyer ──────────────────────────────────────────────────
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2c94c',
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 16,
        gap: 8,
    },
    sendButtonText: {
        fontSize: 17,
        fontFamily: 'ArialRounded',
        color: '#242120',
        fontWeight: 'bold',
    },

    // ─── Confirmation ────────────────────────────────────────────────────
    sentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    sentTitle: {
        fontSize: 28,
        fontFamily: 'ArialRounded',
        color: '#ffe7bf',
    },
    sentText: {
        fontSize: 15,
        fontFamily: 'ArialRounded',
        color: '#ffe8bfaf',
        textAlign: 'center',
        lineHeight: 22,
    },
    backLink: {
        fontSize: 14,
        fontFamily: 'ArialRounded',
        color: '#8B7355',
        textDecorationLine: 'underline',
        marginTop: 8,
    },
});
