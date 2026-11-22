import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export type GuruState = "idle" | "listening" | "thinking" | "speaking";

// Transparent-background line art of the meditating priest (409x750).
const GURU_IMAGE = require("../../assets/branding/guru.png");
const ASPECT = 409 / 750;

/**
 * Meditating priest (guru). The artwork floats gently on a parchment disc, and the
 * aura around it glows green while listening, purple while thinking and amber while
 * speaking, so the user can tell what the guru is doing.
 */
export default function GuruAvatar({
  state,
  size = 150,
}: {
  state: GuruState;
  size?: number;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const aura = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  useEffect(() => {
    const speed = state === "idle" ? 1800 : state === "listening" ? 700 : 450;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(aura, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(aura, {
          toValue: 0,
          duration: speed,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [aura, state]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const auraScale = aura.interpolate({
    inputRange: [0, 1],
    outputRange: state === "idle" ? [1, 1.04] : [1, 1.14],
  });
  const auraOpacity = aura.interpolate({
    inputRange: [0, 1],
    outputRange: state === "idle" ? [0.3, 0.5] : [0.45, 0.95],
  });
  const auraColor =
    state === "listening"
      ? "#4caf50"
      : state === "thinking"
        ? "#ce93d8"
        : colors.primary;

  const imgHeight = size * 0.92;
  const imgWidth = imgHeight * ASPECT;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.aura,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: auraColor,
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />
      <View
        style={[
          styles.disc,
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: (size * 0.92) / 2,
          },
        ]}
      >
        <Animated.Image
          source={GURU_IMAGE}
          resizeMode="contain"
          style={{
            width: imgWidth,
            height: imgHeight * 0.98,
            transform: [{ translateY }],
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  aura: { position: "absolute" },
  disc: {
    backgroundColor: "#fff3d6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff3c4",
  },
});
