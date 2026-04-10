import { View, StyleSheet, PanResponder } from 'react-native';
import { useRef } from 'react';

type Props = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  trackHeight?: number;
  thumbSize?: number;
};

export default function CustomSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  trackHeight = 10,
  thumbSize = 24,
}: Props) {
  const trackWidth = useRef(0);

  const clamp = (val: number) => Math.max(minimumValue, Math.min(maximumValue, val));

  const getValueFromX = (x: number): number => {
    const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
    const raw = minimumValue + ratio * (maximumValue - minimumValue);
    const stepped = Math.round(raw / step) * step;
    return clamp(stepped);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onValueChange(getValueFromX(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        onValueChange(getValueFromX(e.nativeEvent.locationX));
      },
    })
  ).current;

  const fillRatio = (value - minimumValue) / (maximumValue - minimumValue);
  const containerHeight = Math.max(trackHeight, thumbSize) + 16;
  const thumbTop = (containerHeight - thumbSize) / 2;

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      {/* Track background */}
      <View style={[styles.track, { height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: maximumTrackTintColor }]}>
        {/* Track fill */}
        <View
          style={[
            styles.fill,
            {
              width: `${fillRatio * 100}%`,
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
      </View>

      {/* Thumb — centré verticalement */}
      <View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbTintColor,
            top: thumbTop,
            left: `${fillRatio * 100}%`,
            marginLeft: -(thumbSize / 2),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
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
