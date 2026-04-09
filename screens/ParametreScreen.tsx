import { View, Text, StyleSheet, ImageBackground, Image, TouchableOpacity, Modal, Switch } from "react-native"
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { useState, useEffect } from "react";
import { useFetchWithAuth } from "../components/fetchWithAuth";
import { useSelector, useDispatch } from "react-redux";
import { updateBestScore } from "../reducers/user";
import { FontAwesome } from "@expo/vector-icons";

import AudioManager from '../modules/audioManager';
import { updateSettings } from "../reducers/user";

type ParametreScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}


export default function ParametreScreen({ navigation }: ParametreScreenProps ) {
    const fetchWithAuth = useFetchWithAuth();
    const user = useSelector((state: string) => state.user.value);

    const [volume, setVolume] = useState(user.volume);
    const [soundEnabled, setSoundEnabled] = useState(user.soundOn);
    const [soundClicEnabled, setSoundClicEnabled] = useState(user.btnSoundOn);
    const [modalVisible, setModalVisible] = useState(false);
    const [resetConfirmationModal, setResetConfirmationModal] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
        setVolume(user.volume);
        setSoundEnabled(user.soundOn);
        setSoundClicEnabled(user.btnSoundOn);
    }, [user]);


    const handleVolumeChange = (value: number) => {
        setVolume(value);
        AudioManager.setMusicVolume(value); // modifie le volume de la musique
        dispatch(updateSettings({ volume: value }));
    };

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        AudioManager.setMusicMuted(!newState);
        dispatch(updateSettings({ soundOn: newState }));
    };

    const toggleSoundClic = () => {
        const newState = !soundClicEnabled;
        setSoundClicEnabled(newState);
        AudioManager.setEffectsMuted(!newState);
        dispatch(updateSettings({ btnSoundOn: newState }));
    };

    const handleSaveSettings = () => {
        // Sauvegarde en arrière-plan
        fetchWithAuth(`/users/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume, soundOn: soundEnabled, btnSoundOn: soundClicEnabled }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.result) {
                dispatch(updateSettings({
                    volume: data.settings.volume,
                    soundOn: data.settings.soundOn,
                    btnSoundOn: data.settings.btnSoundOn,
                }));
            }
        })
        .catch(err => console.error('Erreur PUT /settings :', err));

        // Navigation immédiate
        navigation.navigate('Home', { screen: 'Home' });
    };

    const handleResetAccount = () => {
        fetchWithAuth(`/users/reset`, {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === true) {
                dispatch(updateBestScore(data.bestScore));
                setResetConfirmationModal(true);
                return;
            }
        })
        .catch(error => {
            console.error('Erreur lors de la réinitialisation du compte :', error);
        });
    };



    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => {AudioManager.playEffect('click'); handleSaveSettings();}}>
                    <Image source={require('../assets/icon-arrow.png')} style={styles.leftArrow} />
                </TouchableOpacity>
            </View>
            <View style={styles.main}>
                <View style={styles.darkBackground}>
                    <View style={styles.cardContainer}>
                        <View style={styles.setupContainer}>
                            <Text style={styles.title} >PARAMÈTRES</Text>
                            <Text style={styles.text}>Volume : {volume}</Text>
                            <Slider
                                value={volume}
                                onValueChange={handleVolumeChange}
                                maximumValue={100}
                                minimumValue={0}
                                step={2}
                                minimumTrackTintColor="#388FF0"
                                maximumTrackTintColor="#524743"
                                thumbTintColor="#FFE8BF"
                                style={styles.volumeSlider}
                            />
                            <View style={styles.settingRow}>
                                <Text style={styles.text}>Musique</Text>
                                <Switch
                                    value={soundEnabled}
                                    onValueChange={toggleSound}
                                    thumbColor="#FFE8BF"
                                    trackColor={{ false: '#D05A34', true: '#74954E' }}
                                    ios_backgroundColor="#D05A34"
                                />
                            </View>
                            <View style={styles.settingRow}>
                                <Text style={styles.text}>Bruitage</Text>
                                <Switch
                                    value={soundClicEnabled}
                                    onValueChange={toggleSoundClic}
                                    thumbColor="#FFE8BF"
                                    trackColor={{ false: '#D05A34', true: '#74954E' }}
                                    ios_backgroundColor="#D05A34"
                                />
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => {AudioManager.playEffect('click'); setModalVisible(true);}}>
                            <View style={styles.btnContainer}>
                                <Text style={styles.btnText}>réinitialisation</Text>
                                <Text style={styles.btnText}>du compte</Text>
                            </View>
                        </TouchableOpacity>
                        <Modal
                        visible={modalVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setModalVisible(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalBackground}>
                                    <View style={styles.modalContainer}>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.modalText}>Voulez-vous vraiment réinitialiser votre compte ?</Text>
                                            <FontAwesome name={'warning' as any} size={50} color='#ffe7bf' />
                                            <Text style={styles.modalText2}>Cette action est irréversible.</Text>
                                        </View>
                                        
                                        <View style={styles.modalBtns}>
                                            <TouchableOpacity onPress={() => {AudioManager.playEffect('click'); setModalVisible(false);}}>
                                                <View style={styles.btnContainerNo}>
                                                    <Text style={styles.modalBtnText}>Non</Text>
                                                </View>
                                            </TouchableOpacity>   
                                            <TouchableOpacity onPress={() => {AudioManager.playEffect('click'); handleResetAccount(); setModalVisible(false);}}>
                                                <View style={styles.btnContainerYes}>
                                                    <Text style={styles.modalBtnText}>Oui</Text>
                                                </View>
                                            </TouchableOpacity>    
                                        </View> 
                                    </View>   
                                </View>
                            </View>
                        </Modal>
                        <Modal
                        visible={resetConfirmationModal}
                        transparent
                        >
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }}>
                            <View style={styles.confirmModal}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: "#ffe7bf" , fontFamily: "ArialRounded"}}>
                                Compte réinitialisé avec succès
                            </Text>
                            <TouchableOpacity style={styles.btnContainerYes} onPress={() => setResetConfirmationModal(false)}>
                                <Text style={styles.modalBtnText }>OK</Text>
                            </TouchableOpacity>
                            </View>
                        </View>
                        </Modal>
                    </View>
                </View>
            </View>    
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        height: undefined,
        width : '100%',
        paddingHorizontal: 40,
        paddingTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40
    },
    leftArrow:{
        width: '100%',
        height: '100%'
    },
    main: {
        width: '100%',
        height: undefined,
        paddingHorizontal: 36,
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 40
    },
    arrow: {
        width: 75,
        height: 75,
        marginBottom: 30,
    },
    darkBackground:{
        backgroundColor : '#242120',
        width: '100%',
        height: '88%',
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor : '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5
    },
    title : {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 26,
        textAlign: 'center',
        marginBottom: 5
    },
    setupContainer: {
        justifyContent: 'center',
        alignItems: 'stretch',
        width: '80%',
        paddingTop :20
    },
    volumeSlider: {
        width: '100%',
        height: 40,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    text: {
        color: '#FFE8BF',
        fontSize: 22,
        marginBottom: 15,
        marginTop: 25,
        fontFamily: 'ArialRounded',
    },
    btnContainer: {
        width: 210,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#242120',
        borderColor: 'black',
        borderWidth: 1.5,
        borderRadius: 12,
        marginBottom: 25,
    },
    btnText: {
        color: '#FFE8BF',
        fontSize: 18,
        fontFamily: 'ArialRounded',
        textTransform: 'uppercase',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackground: {
        width: 350,
        height: 350,
        padding: 10,
        backgroundColor: '#242120',
        borderRadius: 20,
    },
    modalContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor : '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5,

    },
    textContainer:{
        height: '65%',
        padding: 30,
        justifyContent: 'center',
        alignItems: 'center',
        gap : 20
    },
    modalBtns: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '90%',
        height: '30%',
    },
    modalText: {
        color: '#FFE8BF',
        fontSize: 20,
        fontFamily: 'ArialRounded',
        textAlign: 'center',
    },
    modalText2: {
        color: '#FFE8BF',
        fontSize: 17,
        fontFamily: 'ArialRounded',
        textAlign: 'center',
    },
    btnContainerYes: {
        width: 130,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#74954E',
        borderRadius: 12,
    },
    btnContainerNo: {
        width: 130,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D05A34',
        borderRadius: 12,
    },
    modalBtnText: {
        color: '#FFE8BF',
        fontSize: 20,
        textTransform: 'uppercase',
        fontFamily: 'ArialRounded',
    },
    confirmModal :{
        backgroundColor: '#242120',
        padding: 20,
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#554946',
        gap : 20
    },
});