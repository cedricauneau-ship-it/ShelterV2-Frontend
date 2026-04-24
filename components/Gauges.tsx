import { StyleSheet, Image, View, ImageSourcePropType } from 'react-native';
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolateColor,
} from "react-native-reanimated";

type GaugeProps = {
  icon: ImageSourcePropType;
  color: string;
  percent: number;
  indicator: number;
  decrease: boolean;
  deathPulse?: boolean;
};

export default function Gauge({ icon, color, percent, indicator, decrease, deathPulse = false } : GaugeProps) {

    const delta = 5;    // to shift the fill bar to the top and avoid to hide it behind the icon
    const newPercent = percent === 0 ? 0 : delta + percent * (100 - delta) / 100;

    const CRITICAL_THRESHOLD = 20;

    const prevPercent = useRef(percent);    // to stock the previous percent (and compare with the current)
    const gaugeAnim = useSharedValue(newPercent);   // hauteur jauge
    const flashAnim = useSharedValue(0);            // flash rouge one-shot
    const blinkAnim = useSharedValue(1);            // clignotement critique continu
    const pulseScale = useSharedValue(1);           // scale pulse animation de mort
    const pulseRed = useSharedValue(0);             // transition vers le rouge

    // Animation pulse de mort
    useEffect(() => {
        if (deathPulse) {
            pulseRed.value = withTiming(1, { duration: 400 });
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.25, { duration: 400 }),
                    withTiming(1, { duration: 400 })
                ), -1, false
            );
        } else {
            cancelAnimation(pulseScale);
            pulseScale.value = withTiming(1, { duration: 150 });
            pulseRed.value = withTiming(0, { duration: 150 });
        }
    }, [deathPulse]);

    // Animation flash rouge qui se déclenche quand la jauge tombe à zero
    useEffect(() => {

        // smooth transition hauteur
        gaugeAnim.value = withTiming(newPercent, {
            duration: 200,
        });

        // flash rouge one-shot si tombe à zéro
        if (percent <= 0 && prevPercent.current > 0) {
            flashAnim.value = 1;
            flashAnim.value = withTiming(0, { duration: 300 });
        }

        // clignotement continu si en zone critique (< 20%)
        if (percent < CRITICAL_THRESHOLD && percent > 0) {
            blinkAnim.value = withRepeat(
                withTiming(0.3, { duration: 600 }),
                -1,
                true
            );
        } else {
            cancelAnimation(blinkAnim);
            blinkAnim.value = withTiming(1, { duration: 200 });
        }

        prevPercent.current = percent;
    }, [percent]);

    const barStyle = useAnimatedStyle(() => ({
        height: `${gaugeAnim.value}%`,
        opacity: blinkAnim.value,
    }));

    const flashStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            flashAnim.value,
            [0, 1],
            ['#554946', 'darkred']
        ),
    }));

    const deathPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const deathBarColorStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            pulseRed.value,
            [0, 1],
            [color, '#cc2222']
        ),
    }));


    // indicator
    let sizeIndicator = 0;
    if(indicator > 0){
        if(indicator <= 10){
            sizeIndicator = 5;
        }else if(indicator <= 20){
            sizeIndicator = 10;
        }
        else{
            sizeIndicator = 15;
        }
    }
   

  return (
    <View style={styles.container}>
        <View style={styles.indicatorContainer}>
        {indicator > 0 && <FontAwesome name={'circle' as any} size={sizeIndicator} color='#ae9273' />}
        </View>
        <Animated.View style={[styles.gaugeGlobalContent, deathPulse ? deathPulseStyle : undefined]}>
            <Animated.View style={[styles.barContainer, flashStyle]}>
                <Animated.View style={[styles.barFill, barStyle, { backgroundColor: color }, deathPulse ? deathBarColorStyle : undefined]} />
            </Animated.View>
            {decrease && <FontAwesome name={'caret-down' as any} style={styles.arrow} size={25} color='#ea4200ff' />}
            <Image source={icon} style={styles.icon} />
        </Animated.View>
        
    </View>
  );
}

const styles = StyleSheet.create({
container: {

    justifyContent: 'center',
    alignItems: 'center',
    gap : 5

},
indicatorContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
},
gaugeGlobalContent:{
    width: 40,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',

},
icon:{
    width: 35,
    height: 35,
    marginTop: -12,

},
barContainer: {
    width: 18,
    height: 70,
    borderTopLeftRadius : 9,
    borderTopRightRadius : 9,
    backgroundColor: '#554946',

    borderColor: '#242120',
    borderWidth: 4,
    justifyContent: 'flex-end',

    overflow : 'hidden'

},
barFill: {
    width: '100%',
    height: '90%',

    backgroundColor: '#8378b7'
},
arrow :{
    position: 'absolute',
    top: 0,
    left : 5
}
});
