import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { JITSI_BASE_URL } from '@nakshtra/shared';
import { Button, Screen } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// WebView only exists on native; web uses an iframe instead.
let WebViewComponent: React.ComponentType<Record<string, unknown>> | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComponent = require('react-native-webview').WebView;
}

export default function VideoCallScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCall'>>();
  const { room, title } = route.params;
  const url = `${JITSI_BASE_URL}/nakshtra-${room}#config.prejoinConfig.enabled=true`;

  if (Platform.OS === 'web') {
    return (
      <Screen style={styles.webWrap}>
        <Text style={styles.title}>📹 {title ?? 'Video Consultation'}</Text>
        <View style={styles.iframeWrap}>
          {React.createElement('iframe', {
            src: url,
            style: { width: '100%', height: '100%', border: 'none', borderRadius: 12 },
            allow: 'camera; microphone; fullscreen; display-capture',
          })}
        </View>
        <Button title="Open in new tab" variant="outline" onPress={() => Linking.openURL(url)} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  if (!WebViewComponent) {
    return (
      <Screen style={styles.center}>
        <Button title="Open video call" onPress={() => Linking.openURL(url)} />
      </Screen>
    );
  }

  return (
    <WebViewComponent
      source={{ uri: url }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      mediaCapturePermissionGrantType="grant"
    />
  );
}

const styles = StyleSheet.create({
  webWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  iframeWrap: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
