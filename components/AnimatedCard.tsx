import React from "react";
import { StyleSheet, View, Text, Image, ActivityIndicator, Dimensions } from "react-native";
import { useState, useEffect, useRef } from 'react';
import { ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  interpolate,
  withSpring,
  useAnimatedReaction,
  runOnJS,
  cancelAnimation,
  Layout,
  FadeIn,
  FadeOut,
  LinearTransition
} from "react-native-reanimated";
import { ViewStyle } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AudioManager from '../modules/audioManager';

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.25;
const SHOW_TEXT_THRESHOLD = 5;

type SwipeCardProps = {
  image: ImageSourcePropType;
  isConsequence: boolean;
  leftChoiceText: string;
  rightChoiceText: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  handleSideChange: (side: string) => void;
  triggerReset: boolean;
  readyToFlip?: boolean; // false = reste sur le dos (chargement), true = flip vers le front
  isDeath?: boolean;       // animation de mort (overlay rouge + skull)
  deathText?: string | null; // texte de mort à afficher dans la carte (endgame)
};


export default function AnimatedCard({ image, isConsequence, leftChoiceText, rightChoiceText, onSwipeLeft, onSwipeRight, handleSideChange, triggerReset, readyToFlip = true, isDeath = false, deathText = null }: SwipeCardProps) {

  const [isFlipped, setIsFlipped] = useState(true);     // whether the card is on the front side or the back side
  const flipRotation = useSharedValue(180); // 0 = front, 180 = back
  const loadingPulse = useSharedValue(1);   // pulse sur le dos pendant le chargement

  const translateX = useSharedValue(0);
  const swipeRotation = useSharedValue(0);

  const waitingForData = useRef(false); // true = on a reset, on attend readyToFlip

  // ─── Death animation shared values ──────────────────────────────────────
  const deathOverlay = useSharedValue(0);   // 0 = transparent, 1 = full overlay
  const skullScale = useSharedValue(0);
  const skullOpacity = useSharedValue(0);
  const borderRed = useSharedValue(0);      // 0 = normal, 1 = red
  const redPulse = useSharedValue(0);       // subtle pulsing glow

  useEffect(() => {
    if (isDeath) {
      // Séquence d'animation de mort
      borderRed.value = withTiming(1, { duration: 600 });
      deathOverlay.value = withTiming(1, { duration: 800 });
      skullOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
      skullScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 80 }));
      redPulse.value = withDelay(1000, withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ), -1, false
      ));
    } else {
      deathOverlay.value = 0;
      skullScale.value = 0;
      skullOpacity.value = 0;
      borderRed.value = 0;
      cancelAnimation(redPulse);
      redPulse.value = 0;
    }
  }, [isDeath]);

  const deathOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(deathOverlay.value, [0, 1], [0, 0.85]),
  }));

  const deathSkullStyle = useAnimatedStyle(() => ({
    opacity: skullOpacity.value,
    transform: [{ scale: skullScale.value }],
  }));

  const deathBorderStyle = useAnimatedStyle(() => ({
    opacity: borderRed.value,
  }));

  const deathPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(redPulse.value, [0, 1], [0, 0.15]),
  }));

  const resetToBack = () => {
    setIsFlipped(true);
    setSwipeSide('center');
    flipRotation.value = 180;
    translateX.value = 0;
    swipeRotation.value = 0;
  };

  const reset = () => {
    resetToBack();

    if (readyToFlip) {
      // Comportement classique (tuto, conséquence) : flip immédiat après délai
      waitingForData.current = false;
      setTimeout(() => {
        flip();
      }, 200);
    } else {
      // Mode chargement : on reste sur le dos, on attend readyToFlip
      waitingForData.current = true;
      // Lancer le pulse de chargement
      loadingPulse.value = withRepeat(
        withTiming(0.5, { duration: 600 }),
        -1,
        true
      );
    }
  };

  useEffect(() => {
    reset();
  }, [triggerReset]);

  // Quand les données arrivent (readyToFlip passe à true), on flip
  useEffect(() => {
    if (readyToFlip && waitingForData.current) {
      waitingForData.current = false;
      // Stopper le pulse
      cancelAnimation(loadingPulse);
      loadingPulse.value = withTiming(1, { duration: 150 });
      // Flip vers le front
      setTimeout(() => {
        flip();
      }, 100);
    }
  }, [readyToFlip]);

  // Style de pulse pour le chargement (opacité qui pulse sur le dos)
  const loadingPulseStyle = useAnimatedStyle(() => ({
    opacity: loadingPulse.value,
  }));

  // FLIP ANIMATION
  const flip = () => {
    flipRotation.value = withTiming(flipRotation.value === 0 ? 180 : 0, { duration: 500 }); // Rotation from 0 to 180 in 500ms
  };

  const frontAnimatedStyle = useAnimatedStyle((): ViewStyle => {
    return {
      transform: [
        {
          rotateY: `${interpolate(flipRotation.value, [0, 180], [0, 180])}deg`,
        },
      ],
      backfaceVisibility: "hidden",
      // Fix Android : backfaceVisibility non fiable, on force l'opacité
      opacity: flipRotation.value > 90 ? 0 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle((): ViewStyle => {
    return {
      transform: [
        {
          rotateY: `${interpolate(flipRotation.value, [0, 180], [180, 360])}deg`,
        },
      ],
      backfaceVisibility: "hidden",
      opacity: flipRotation.value < 90 ? 0 : 1,
      position: "absolute",
      top: 0,
      left: 0,
    };
  });

  // Update IsFlipped each time flipRotation is change
  useAnimatedReaction(
  () => flipRotation.value,
  (currentRotation, previousRotation) => {
    if (previousRotation !== currentRotation) {
      runOnJS(setIsFlipped)(currentRotation !== 0);
    }
  }
);
  // SWIPE ANIMATION
  const panGesture = Gesture.Pan()
  .enabled(!isFlipped)    // allow swipe only if the card is on the front side
  .onUpdate((event) => {      // Update translate and rotation values in real time with the data of event
    translateX.value = event.translationX;
    swipeRotation.value = event.translationX / 20;
  })
  .onEnd(() => {

    const toRight = translateX.value > 0;     // bool that is true if the card has been swipping at right

    if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {     // Threshold to validate the gesture 
      translateX.value = withSpring(toRight ? width : -width, {});

      if (toRight && onSwipeRight) runOnJS(onSwipeRight)();
      else if (!toRight && onSwipeLeft) runOnJS(onSwipeLeft)(); 
      
    } else {
      translateX.value = withSpring(0);
      swipeRotation.value = withSpring(0);
    }
  });

  // create animated style with the values of the swipe
  const swipeAnimatedStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${swipeRotation.value}deg` },
    ],
  }));


// get the information of the swipe side
const [swipeSide, setSwipeSide] = useState<'left' | 'right' | 'center'>('center');

useAnimatedReaction(
  () => translateX.value,
  (current) => {
    runOnJS(setSwipeSide)(Math.abs(current) > SHOW_TEXT_THRESHOLD || isConsequence? (current > 0 ? 'right' : 'left') : 'center');
    runOnJS(handleSideChange)(swipeSide);
  }
);


  // Détermine le mode d'affichage de la face avant
  const renderFront = () => {
    // Mode texte de mort (endgame) — fond sombre avec le deathText
    if (deathText) {
      return (
        <Animated.View style={[styles.front, styles.deathTextCard, frontAnimatedStyle, swipeAnimatedStyle]}>
          <Text style={styles.deathTextContent}>{deathText}</Text>
        </Animated.View>
      );
    }

    // Mode conséquence
    if (isConsequence) {
      return (
        <Animated.View style={[styles.consequence, styles.front, frontAnimatedStyle, swipeAnimatedStyle]}>
          <Text style={styles.textConsequence}>{rightChoiceText}</Text>
        </Animated.View>
      );
    }

    // Mode normal (image + choix) — avec overlay de mort si isDeath
    return (
      <Animated.View style={[styles.card, styles.front, frontAnimatedStyle, swipeAnimatedStyle]}>
        <View style={styles.imageMask}>
          <Image source={image} style={styles.illustration} resizeMode="cover" />
        </View>

        {/* Overlay de mort : fond sombre + bordure rouge + skull */}
        {isDeath && (
          <>
            <Animated.View style={[styles.deathBorderOverlay, deathBorderStyle]} />
            <Animated.View style={[styles.deathOverlay, deathOverlayStyle]} />
            <Animated.View style={[styles.deathRedPulse, deathPulseStyle]} />
            <Animated.View style={[styles.deathSkullContainer, deathSkullStyle]}>
              <Image
                source={require('../assets/icon-skull.png')}
                resizeMode="contain"
                style={styles.deathSkullIcon}
              />
            </Animated.View>
          </>
        )}

        {/* Texte de choix (caché pendant l'animation de mort) */}
        {!isDeath && (
          <Animated.View
            layout={LinearTransition.duration(100)}
            style={[styles.textSection, { paddingVertical: swipeSide === 'center' ? 0 : 16 }]}
          >
            {swipeSide !== 'center' && (
              <Animated.Text
                key={swipeSide}
                entering={FadeIn.duration(150)}
                style={[
                  styles.textChoice,
                  { textAlign: swipeSide === 'right' ? 'left' : 'right' },
                ]}
              >
                {swipeSide === 'right' ? rightChoiceText : leftChoiceText}
              </Animated.Text>
            )}
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  return (
    <GestureDetector gesture={panGesture}>
        <View style={styles.container}>
          {renderFront()}

          <Animated.View style={[styles.card, styles.back, backAnimatedStyle]}>
            <Animated.Image
              source={require('../assets/backcard_v5.png')}
              style={[styles.backImage, loadingPulseStyle]}
            />
            {!readyToFlip && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#ffe7bf" />
              </View>
            )}
          </Animated.View>
        </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
    container: {
        width: 240,
        height: 240,
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        backgroundColor: '#ffe7bf',
        width: 240,
        height: 240,
        borderRadius: 15,
        borderColor: '#242120',
        borderWidth: 4,
        overflow: 'hidden'
    },
    consequence:{
        backgroundColor: '#ffe7bf',
        width: 240,
        height: 240,
        borderRadius: 15,
        borderColor: '#242120',
        borderWidth: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    front: {
        backgroundColor: "#ffe7bf",
        overflow: 'hidden',
    },
    imageMask: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",

    },
    illustration: {
      width: '100%',
      height: '100%'
    },
    back: {
        backgroundColor: "#242120",
        justifyContent: 'center',
        alignItems: 'center',
    },
    backImage: {
      width: '100%',
      height: '100%'
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioactiveIcon: {
        width: 150,
        height: 150
    },
    textSection: {
        width: '100%',
        /*height: '35%',*/
        flexShrink: 1,
       /* backgroundColor: '#ae9273',*/
        backgroundColor: '#2421208e',
        padding: 18

    },
    textChoice: {
        fontFamily: 'ArialRounded',
        fontSize : 18,
        /*color: '#242120',*/
        color: '#f1dec8ff',
        flexWrap: 'wrap'
    },
    textConsequence: {
        fontFamily: 'ArialRounded',
        fontSize : 18,
        textAlign: 'center',
        fontStyle: 'italic',
        color: '#242120',
        flexWrap: 'wrap'
    },
    text: {
        fontSize: 22,
        color: "#242120",
    },

    // ─── Death animation ─────────────────────────────────────────────────
    deathBorderOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 15,
        borderColor: '#6b1c1c',
        borderWidth: 4,
        zIndex: 5,
    },
    deathOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1a0a0a',
        zIndex: 2,
    },
    deathRedPulse: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#8B0000',
        zIndex: 3,
    },
    deathSkullContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 4,
    },
    deathSkullIcon: {
        width: 90,
        height: 90,
    },

    // ─── Death text card (endgame) ───────────────────────────────────────
    deathTextCard: {
        backgroundColor: '#1e1715',
        width: 240,
        height: 240,
        borderRadius: 15,
        borderColor: '#6b1c1c',
        borderWidth: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deathTextContent: {
        fontFamily: 'ArialRounded',
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
        color: '#ffe7bfdd',
        lineHeight: 22,
    },
});
