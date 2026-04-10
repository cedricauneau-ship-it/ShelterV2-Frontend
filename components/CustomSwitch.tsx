import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useEffect } from 'react';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColorOn?: string;
  trackColorOff?: string;
  thumbColor?: string;
  trackWidth?: number;
  trackHeight?: number;
};

export default function CustomSwitch({
  value,
  onValueChange,
  trackColorOn = '#74954E',
  trackColorOff = '#D05A34',
  thumbColor = '#FFE8BF',
  trackWidth = 60,
  trackHeight = 30,
}: Props) {
  const thumbSize = trackHeight - 8;
  const travel = trackWidth - thumbSize - 8;
  const thumbTop = (trackHeight - thumbSize) / 2;

  const thumbX = useSharedValue(value ? travel : 0);
  const trackOpacity = useSharedValue(value ? 1 : 0);

  // Sync si value change depuis l'extérieur (ex: useEffect dans l'écran parent)
  useEffect(() => {
    thumbX.value = withTiming(value ? travel : 0, { duration: 200 });
    trackOpacity.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const trackOnStyle = useAnimatedStyle(() => ({
    opacity: trackOpacity.value,
  }));

  return (
    <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.8}>
      <View style={[styles.track, { width: trackWidth, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: trackColorOff }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: trackHeight / 2, backgroundColor: trackColorOn }, trackOnStyle]} />
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              top: thumbTop,
              left: thumbTop,
            },
            thumbStyle,
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
