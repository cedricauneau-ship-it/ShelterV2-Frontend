import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image, Linking } from "react-native"
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import AudioManager from '../modules/audioManager';
import { DEPLOYED_BACKEND_ADDRESS } from "../modules/global";

const BACKEND_ADDRESS = DEPLOYED_BACKEND_ADDRESS;

type CreditScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}

export default function CreditScreen({ navigation }: CreditScreenProps ) {
   
    const handleNavigate = () => {
        AudioManager.playEffect('click')
        navigation.navigate('Home', { screen: 'Menu' });
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => handleNavigate()}>
                    <Image source={require('../assets/icon-arrow.png')} style={styles.leftArrow} />
                </TouchableOpacity>
            </View>
            <View style={styles.main}>
                <View style={styles.darkBackground}>
                    <View style={styles.cardContainer}>
                        <Text style={styles.title} >CRÉDITS</Text>
                        
                        <View style={styles.nameSection}>
                            <Image source={require('../assets/icon-group.png')} style={[styles.groupIcon]} />
                            <View >
                                <Text style={styles.nameTitle}>Projet réalisé par :</Text>
                            </View>
                            <View style={styles.nameContainer}>
                                <Text style={styles.name}>Cédric Auneau</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => Linking.openURL(`${BACKEND_ADDRESS}/privacy-policy.html`)}>
                            <Text style={styles.link}>Politique de confidentialité</Text>
                        </TouchableOpacity>

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
        paddingHorizontal: 36,
        paddingVertical: 30,
    },
    arrow: {
        width: 75,
        height: 75,
        marginBottom: 30,
    },
    darkBackground:{
        backgroundColor : '#242120',
        width: '100%',
        height: 700,
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor : '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5,
        paddingVertical: 30,
        paddingHorizontal: 35,
        gap: 50
    },
    title : {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 26,
        textAlign: 'center'
    },
    nameSection: {
        justifyContent: 'center',
        alignItems: 'center',
        gap : 20
    },
    groupIcon: {
        width: 50,
        height: 50
    },
    nameTitle: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 20,
    },
    nameContainer:{
        justifyContent: 'center',
        alignItems: 'center',
        gap : 8
    },
    name :{
        color: '#ffe8bfaf',
        fontFamily: 'ArialRounded',
        fontSize: 16,
        textAlign: 'center'
    },
    link: {
        color: '#8B7355',
        fontFamily: 'ArialRounded',
        fontSize: 14,
        textDecorationLine: 'underline',
        textAlign: 'center',
    }



});