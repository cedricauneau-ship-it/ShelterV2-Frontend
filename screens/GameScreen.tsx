import { View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity, Alert } from "react-native"
import * as Haptics from 'expo-haptics';
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFetchWithAuth } from '../components/fetchWithAuth';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  FadeIn,
  FadeOut,
  cancelAnimation
} from "react-native-reanimated";
import Gauge from '../components/Gauges';
import AnimatedCard from '../components/AnimatedCard';
import { tutoCards } from "../data/tuto";

import { useSelector, useDispatch } from "react-redux";
import { setGauges, setCurrentCard, setCurrentNumberDays, Card, setFirstGame } from "../reducers/user";
import { RootState } from "../store";

import AudioManager from "../modules/audioManager";
import { getImage } from '../modules/imagesSelector';

import { startGame, endGame } from "../reducers/gameSlice";


type GameScreenProps = {
    navigation: NavigationProp<ParamListBase>;
}

type GameResponse = {
  result: boolean;
  gauges: {
    hunger: number;
    security: number;
    health: number;
    moral: number;
    food: number;
  };
  numberDays: number;
  gameover?: boolean;
  card?: Card;
  death?: {
    type: string;
    title: {
      hook: string;
      phrase: string;
    };
    description: string;
  };
  achievements: [];
};


export default function GameScreen({ navigation }: GameScreenProps ) {

    const fetchWithAuth = useFetchWithAuth();

    const dispatch = useDispatch();

    const user = useSelector((state: RootState) => state.user.value);


    const hapticOn: boolean = user.hapticOn ?? true;

    // Tuto
    const tuto : boolean = user.firstGame;
    const [indexCardTuto, setIndexCardTuto] = useState<number>(0);
    const [tutoHunger, setTutoHunger] = useState<number>(50);
    const [tutoSecurity, setTutoSecurity] = useState<number>(50);
    const [tutoHealth, setTutoHealth] = useState<number>(50);
    const [tutoMoral, setTutoMoral] = useState<number>(50);
    const [tutoFood, setTutoFood] = useState<number>(30);

    const currentCard = user.firstGame ? tutoCards[indexCardTuto] : user.currentCard ;

    const [currentSide, setCurrentSide] = useState<string>('center');
    const [triggerReset, setTriggerReset] = useState<boolean>(false);
    const [gameover, setGameover] = useState<boolean>(false);

    const [showConsequence, setShowConsequence] = useState<boolean>(false);
    const [consequenceText, setConsequenceText] = useState<string | null>(null);

    const [locked, SetLocked] = useState<boolean>(false); // lock interaction during animations times
    const [cardReady, setCardReady] = useState<boolean>(true); // false = carte en chargement (dos visible)

    const [lastResponse, setLastResponse] = useState<GameResponse|null>(null); //used to store data when there is a consequence to display before displaying the next card (or gameover)
        
    const foodBlink = useSharedValue(1);
    const barBlink = useSharedValue(1);
    const shakeOffset = useSharedValue(0); // pour seccouer la carte quand gameover

    // Necessaire pour gérer la transition de musique
    useEffect(() => {
        dispatch(startGame());

        return () => {
            dispatch(endGame());
        };
    }, [dispatch]);

    // Transition de musique
    useFocusEffect(
        useCallback(() => {
            AudioManager.playBackgroundGame();

            return () => {
                AudioManager.pauseBackgroundGame();
            };
        }, [])
    );

    const resetTuto = () => {
        setIndexCardTuto(0);
        setTutoHunger(50);
        setTutoSecurity(50);
        setTutoHealth(50);
        setTutoMoral(50);
        setTutoFood(30);
    }

    const resetGame = () => {
        SetLocked(false);
        setCardReady(true);
        setLastResponse(null);
        setShowConsequence(false);
        setConsequenceText(null);
        setCurrentSide('center');
        setGameover(false);
        setTriggerReset(prev => !prev);
        setIndexCardTuto(0);
    }
    
    useFocusEffect(
        useCallback(() => {
            
            resetGame();
            resetTuto();

             return () => {
                resetGame();
                resetTuto();
            };

        }, [])
    );
    

    // Met à jour le côté où est penchée la carte (right/left/middle)
    const handleSideChange = (side: string) : void => {
        if (side != currentSide) {
            AudioManager.playEffect('scroll');
        }
        setCurrentSide(side)
    }

      // ANIMATION GAMEOVER
    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeOffset.value }],
    }));

    const triggerShake = () => {
        if (hapticOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        shakeOffset.value = withRepeat(
            withTiming(10, { duration: 50 }), // décalage vers la droite
            6, // nombre de répétitions
            true // reverse automatique
        );

        // Reset une fois l'animation finie
        setTimeout(() => {
            shakeOffset.value = withTiming(0, { duration: 50 });
        }, 350);
    };


    // Déclenche le gameover
    const handleGameover = (achievements: [] ) => {
        setTimeout(() => {
            resetGame();
            navigation.navigate('RecapGame', { screen: 'RecapGame', achievements: achievements  });
        }, 1000);
    }

  
    // traite le choix une fois que le swipe est validé
    const handleChoice  = async (side: 'left' | 'right') : Promise<void> => {

        try{
            if(!showConsequence){ // Pas de conséquence à afficher

                SetLocked(true);

                // Vérifie s'il y a une conséquence à afficher AVANT le fetch
                const cons = side === 'right' ? currentCard?.right?.consequence : currentCard?.left?.consequence;

                // Lance le fetch en parallèle
                const fetchPromise = fetchWithAuth(`/games/choice`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ choice: side }),
                }).then(r => r.json());

                // Petit délai pour que le swipe sorte de l'écran, puis affiche le dos (chargement)
                setCardReady(false);
                await new Promise(r => setTimeout(r, 150));
                setTriggerReset(prev => !prev);

                // Attend la réponse réseau (la carte montre son dos avec le loader)
                const data = await fetchPromise;

                if(!data.result){
                    setCardReady(true);
                    handleGameover([]);
                    return;
                }

                setLastResponse(data);
                dispatch(setGauges(data.gauges));

                if(data.gameover || !data.card){
                    setCardReady(true);
                    triggerShake();
                    setTimeout(() => {
                        setGameover(true);
                        setConsequenceText(data.death.description);
                        setShowConsequence(true);
                        setTriggerReset(prev => !prev);
                        SetLocked(false);
                    }, 400);
                    return;
                }

                if (cons) {
                    setConsequenceText(cons);
                    setShowConsequence(true);
                    // La conséquence utilise readyToFlip=true (flip immédiat)
                    setCardReady(true);
                    setTriggerReset(prev => !prev);
                    SetLocked(false);
                    return;
                }

                // Met à jour les données PUIS déclenche le flip vers le front
                dispatch(setCurrentNumberDays(data.numberDays));
                dispatch(setCurrentCard(data.card));
                setCardReady(true); // → AnimatedCard détecte le changement et flip vers le front

                setTimeout(() => {
                    SetLocked(false);
                }, 600); // durée du flip (500ms) + marge
            }
            else{     // Une conséquence a été affichée, on reprend le cours normal

                setConsequenceText(null);

                if(lastResponse && (lastResponse.gameover || !lastResponse.card)){
                    if(lastResponse.death){
                        triggerShake();
                        setTimeout(() => {
                            setGameover(true);
                            setConsequenceText(lastResponse?.death?.description || "");
                            setShowConsequence(true);
                            setTriggerReset(prev => !prev);
                        }, 400);
                    }
                    return;
                }

                SetLocked(true);

                if(lastResponse?.card){
                    dispatch(setCurrentCard(lastResponse.card));
                    dispatch(setCurrentNumberDays(lastResponse.numberDays));
                }

                setShowConsequence(false);
                setTriggerReset(prev => !prev);

                setTimeout(() => {
                    SetLocked(false);
                }, 600);
            }

        } catch (err) {
            if (__DEV__) console.error('[GameScreen] handleChoice error:', err);
            SetLocked(false);
        }
    }

    // Gère l'enchainement du tutoriel - enchainement scripté pour qu'on gère précisément l'affichage
    const handleNextTutoCard = (choice : string) => {

            SetLocked(true);    // On bloque les interractions pour le joueur le temps des animations

            if(indexCardTuto === 0){
                if(choice === 'left'){
                    dispatch(setFirstGame(false)); // on skip le tuto et on enchaine directement sur la partie
                }
                else{
                    setTimeout(() => {
                        setIndexCardTuto(prev => prev + 1); // on passe à la carte tuto suivante
                    }, 100);
                }
            }
            else if(indexCardTuto === 1){

                const hungerDelta = choice === 'left' ? currentCard.left.effect.hunger : currentCard.right.effect.hunger;
                const securityDelta = choice === 'left' ? currentCard.left.effect.security : currentCard.right.effect.security;
                const healthDelta = choice === 'left' ? currentCard.left.effect.health : currentCard.right.effect.health;
                const moralDelta = choice === 'left' ? currentCard.left.effect.moral : currentCard.right.effect.moral;
                const foodDelta = choice === 'left' ? currentCard.left.effect.food : currentCard.right.effect.food;

                setTutoHunger(tutoHunger - hungerDelta);
                setTutoSecurity(tutoSecurity - securityDelta);
                setTutoHealth(tutoHealth - healthDelta);
                setTutoMoral(tutoMoral - moralDelta);
                setTutoFood(tutoFood - foodDelta);
  
                setTimeout(() => {
                    setIndexCardTuto(prev => prev + 1); // on passe à la carte tuto suivante
                }, 100);

            }
            else{
                cancelAnimation(barBlink);
                barBlink.value = 1;
                resetTuto();
                dispatch(setFirstGame(false)); // fin du tuto
            }
            
            setTriggerReset(!triggerReset); // on déclenche le retournement de la carte

            setTimeout(() => {
                SetLocked(false); // On débloque les interractions pour le joueur
            }, 200);


    }

    // On valide le swipe à gauche
    const onSwipeLeft = () => {
        setCurrentSide('left');
        if (hapticOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if(!tuto){
            if(!gameover){
                AudioManager.playEffect('validate');
                handleChoice('left');
            }
            else{
                handleGameover(lastResponse?.achievements || []);
            }
        }
        else{
            handleNextTutoCard('left');
        }

    };

    // On valide le swipe à droite
    const onSwipeRight = () => {
        setCurrentSide('right');
        if (hapticOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if(!tuto){
            if(!gameover){
                AudioManager.playEffect('validate');
                handleChoice('right');
            }
            else{
                handleGameover(lastResponse?.achievements || []);
            }
        }else{
            handleNextTutoCard('right');
        }
    };

    
    // GESTION DE L'AFFICHAGE DES JAUGES
    // On clamp les valeurs entre 0 et 100, et si on est en phase de tuto, on affiche la valeur du tuto
    const hunger = tuto ? tutoHunger : Math.min(Math.max(user.stateOfGauges.hunger, 0), 100);
    const security = tuto ? tutoSecurity : Math.min(Math.max(user.stateOfGauges.security, 0), 100);
    const health = tuto ? tutoHealth : Math.min(Math.max(user.stateOfGauges.health, 0), 100);
    const moral = tuto ? tutoMoral : Math.min(Math.max(user.stateOfGauges.moral, 0), 100);
    const food = tuto ? tutoFood : Math.min(Math.max(user.stateOfGauges.food, 0), 100);

    const deltaFoodGauge = 5;    // on ajoute un petit décalage pour éviter que l'icone maque les valeurs basses de la jauge
    const newPercentFood = food === 0 ? 0 : deltaFoodGauge + food * (100 - deltaFoodGauge) / 100;

    // gestion des rond indicateurs
    const hideIndicators = currentSide === 'center' || showConsequence || locked || lastResponse?.gameover;

    const hungerIndicator = hideIndicators? 0 : (currentSide === 'right' ?  Math.abs(currentCard?.right?.effect.hunger || 0) : Math.abs(currentCard?.left?.effect.hunger || 0));
    const securityIndicator = hideIndicators ? 0 : (currentSide === 'right' ?  Math.abs(currentCard?.right?.effect.security || 0) : Math.abs(currentCard?.left?.effect.security || 0));
    const healthIndicator = hideIndicators ? 0 : (currentSide === 'right' ?  Math.abs(currentCard?.right?.effect.health || 0) : Math.abs(currentCard?.left?.effect.health || 0));
    const moralIndicator = hideIndicators ? 0 : (currentSide === 'right' ?  Math.abs(currentCard?.right?.effect.moral || 0) : Math.abs(currentCard?.left?.effect.moral || 0));

    // Image à afficher sur la carte
    let pool = currentCard.right.trigger || currentCard.left.trigger || currentCard.pool;

    if(pool === 'event'){
        pool = currentCard.right.nextPool || currentCard.left.nextPool || 'event';
    }

    // Récupération de l'image à afficher sur la carte
    const image = currentCard.image ? getImage(currentCard.image) : getImage("");

    // Animation de clignotement quand la jauge de nourriture est vide
    useEffect(() => {
    if (food === 0) {
        foodBlink.value = withRepeat(
        withTiming(0.5, { duration: 1000 }), //met 1s à jouer l'animation
        -1, // boucle à l'infini
        true // mode reverse
        );
    } else {
        foodBlink.value = withTiming(1, { duration: 300 }); // retour à la normale quand la jauge n'est plus vide
    }
    }, [food]);

    const foodBlinkStyle = useAnimatedStyle(() => ({  // style à appliquer sur la jauge pour afficher le clignotement
        opacity: foodBlink.value
    }));

    // Animation de clignotement de la barre de nourriture pendant le tuto
    useEffect(() => {
    if (tuto && indexCardTuto === 2) {
        barBlink.value = withRepeat(
        withTiming(0, { duration: 800 }), //met 1s à jouer l'animation
        -1, // boucle à l'infini
        true // mode reverse
        );
    } else {
        barBlink.value = withTiming(1, { duration: 300 }); // retour à la normale quand la jauge n'est plus vide
    }
    }, [indexCardTuto, tuto]);

    const barBlinkStyle = useAnimatedStyle(() => ({  // style à appliquer sur la jauge pour afficher le clignotement
        opacity: barBlink.value
    }));

    // mise à jour progressive de la jauge de nourriture quand elle est modifiée
    const foodAnim = useSharedValue(newPercentFood);

    useEffect(() => {
        foodAnim.value = withTiming(newPercentFood, {
            duration: 200
        });
    }, [newPercentFood]);

    const foodAnimatedStyle = useAnimatedStyle(() => ({
        width: `${foodAnim.value}%`
    }));

    // Gameover text color based on the cause of the death
     const changeColor = (cause: string) => {
        if (cause === 'hunger') {
            return '#f28f27'
        }
        else if (cause === 'security') {
            return '#378ded'
        }
        else if (cause === 'health') {
            return '#cf5a34'
        }
        else if (cause === 'moral') {
            return '#6b8a48'
        }
    };


    return (
        <ImageBackground source={require('../assets/background.jpg')} resizeMode="cover" style={styles.backgroundImage}>
            <View style={styles.container}>
                <View style={styles.hud}>
                    <TouchableOpacity style={styles.backButton} onPress={() => {
                        Alert.alert(
                            'Quitter la partie ?',
                            'Ta progression sera sauvegardée. Tu pourras reprendre depuis le menu.',
                            [
                                { text: 'Rester', style: 'cancel' },
                                { text: 'Quitter', style: 'destructive', onPress: () => navigation.navigate('Home', { screen: 'Menu' }) },
                            ]
                        );
                    }}>
                        <Image source={require('../assets/icon-arrow.png')} style={styles.leftArrow} />
                    </TouchableOpacity>
                    <Text style={styles.numberDays}>JOUR {user.numberDays}</Text>
                </View>
                <View style={styles.main}>
                    <Animated.View style={[styles.darkBackground, shakeStyle]}>
                        <View style={styles.cardContainer}>
                            {!gameover && (
                            <View style={styles.gaugesContainer}>
                                <Gauge icon={require('../assets/icon-hunger.png')} color='#f28f27' percent={hunger} indicator={hungerIndicator} decrease={food === 0}/>
                                <Gauge icon={require('../assets/icon-security.png')} color='#378ded' percent={security} indicator={securityIndicator} decrease={false}/>
                                <Gauge icon={require('../assets/icon-health.png')} color='#cf5a34' percent={health} indicator={healthIndicator} decrease={false}/>
                                <Gauge icon={require('../assets/icon-moral.png')} color='#6b8a48' percent={moral} indicator={moralIndicator} decrease={false}/>
                            </View>
                            )}
                            <View style={[styles.textContainer, gameover && styles.textContainerGameover]}>

                                {/*GAME*/}
                                {!gameover && cardReady &&
                                    <Animated.Text
                                        key={currentCard?.key}
                                        entering={FadeIn.duration(200)}
                                        style={styles.textEvent}
                                        >
                                        {currentCard?.text}
                                    </Animated.Text>
                                }

                                {/*GAMEOVER*/}
                                {gameover && 
                                <Animated.View 
                                style={styles.gameoverSection}
                                entering={FadeIn.duration(600).delay(1000)}
                                exiting={FadeOut.duration(200)}
                                >
                                    <Image source={require('../assets/icon-skull.png')} resizeMode="contain" style={styles.skullLogo} />
                                    <Text style={styles.textDeath}>
                                        {lastResponse?.death?.description}
                                    </Text>
                                    <Text
                                        style={[styles.deathCause, {color: lastResponse?.death ? changeColor(lastResponse?.death?.type) : '#ffe7bf'}]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {lastResponse?.death?.title?.toUpperCase()}
                                    </Text>
                                </Animated.View>
                                    
                                }
                                

                            </View>
                            <View style={styles.choiceCardContainer} >
                                <View style={styles.cardStack}>
                                    <View style={styles.imageMask}>
                                        <Image
                                        source={require('../assets/backcard_v5.png')}
                                        style={styles.backImage}
                                        />
                                    </View>
                                        <AnimatedCard
                                        image = {image}
                                        isConsequence={showConsequence}
                                        leftChoiceText={showConsequence ? consequenceText : (currentCard?.left?.text || "")}
                                        rightChoiceText={showConsequence ? consequenceText  : (currentCard?.right?.text || "")}
                                        onSwipeLeft={onSwipeLeft}
                                        onSwipeRight={onSwipeRight}
                                        handleSideChange={(side: string) => handleSideChange(side)}
                                        triggerReset={triggerReset}
                                        readyToFlip={cardReady}
                                        />

                                </View>
                            </View>
                        </View>
                    </Animated.View>               
                </View>
                {tuto && 
                <View style={styles.tutorialContainer}>
                    <View style={styles.tutorialContainer}>
                        <Image source={require('../assets/tutorial.png')} style={styles.tutorial} />
                    </View>
                </View>
                }
                <View style={styles.bottomSection}>
                    <View style={styles.foodSection}>
                        <View style={styles.foodGlobalContent}>
                            
                            <View style={[styles.foodBarContainer]}>
                                <Animated.View style={[styles.foodBarFill, foodAnimatedStyle, barBlinkStyle]} />
                            </View>
                            <Animated.Image source={require('../assets/icon-food.png')} style={[styles.foodIcon, foodBlinkStyle]} />
                        </View>

                    </View>
                </View>
            </View>
           
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    tutorialContainer:{
        position: 'absolute',
        top : 45,
        width : '100%',
        alignItems: 'center'

    },
    tutorial:{
        width: 224,
        height: 40,

    },
    backgroundImage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
    },
    container: {
        height: '100%',
        width: '100%'
    },
    hud: {
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
    numberDays: {
        color: '#ffe7bf',
        fontSize: 34,
        fontFamily: 'DaysLater',
        textShadowColor: '#242120',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 2,
    },
    main: {
        width: '100%',
        height: "75%", /*undefinded*/
        paddingHorizontal: 36,
        paddingVertical: 20
    },
    darkBackground:{
        backgroundColor : '#242120',
        width: '100%',
        height: '100%', /*620*/
        borderRadius: 20,
        padding: 12,
    },
    cardContainer: {
        backgroundColor : '#342c29',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderColor: '#554946',
        borderWidth: 5

    },
    gaugesContainer:{
        width: '100%',
        height: '25%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    textContainer:{
        width: '100%',
        height: '25%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    textContainerGameover:{
        height: undefined,
        flex: 1,
    },
    textEvent: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 18,
        textAlign: 'center'
    },
    gameoverSection:{
        flex: 1,
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    textDeath: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 18,
        textAlign: 'center'
    },
    deathCause: {
        color: '#ffe7bf',
        fontFamily: 'ArialRounded',
        fontSize: 24,
        textAlign: 'center'
    },
    skullLogo: {
        width: 80,
        height: 80
    },
    choiceCardContainer:{
        width: '100%',
        height: '55%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 20
    },
    cardStack:{
        backgroundColor: '#242120',
        width: 240,
        height: 240,
        borderRadius: 15,
    },
    imageMask: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 15,
        overflow: 'hidden',
        borderColor: '#242120',
        borderWidth: 4,
    },
    backImage: {
      width: '100%',
      height: '100%'
    },
    bottomSection: {
        width: '100%',
        height: undefined,
        paddingHorizontal: 36
    },
    foodSection: {
        width: '100%',
        height: 80,
        backgroundColor: '#342c29',
        borderColor: '#242120',
        borderWidth: 8,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    foodGlobalContent:{
        width: '90%',
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: 10
    },
    foodIcon:{
        width: 70,
        height: 70,
        marginTop: -15,
        marginRight: -35
    },
    foodBarContainer: {
        width: '100%',
        height: 30,
        borderRadius: 15,
        backgroundColor: '#554946',

        borderColor: '#242120',
        borderWidth: 4,
        overflow: 'hidden'

    },
    foodBarFill: {
        width: '90%',
        height: '100%',
        backgroundColor: '#8378b7'
    }
});