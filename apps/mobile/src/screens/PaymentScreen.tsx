import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Loading, Screen } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// WebView only exists on native.
let WebViewComponent: React.ComponentType<Record<string, unknown>> | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComponent = require('react-native-webview').WebView;
}

interface OrderInfo {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

function checkoutHtml(order: OrderInfo, email: string, name: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head><body style="background:#faf7ff">
<script>
  var rzp = new Razorpay({
    key: ${JSON.stringify(order.key_id)},
    order_id: ${JSON.stringify(order.order_id)},
    amount: ${JSON.stringify(order.amount)},
    currency: ${JSON.stringify(order.currency)},
    name: 'Nakshtra',
    prefill: { email: ${JSON.stringify(email)}, name: ${JSON.stringify(name)} },
    theme: { color: '#5b2a86' },
    handler: function (resp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', payload: resp }));
    },
    modal: {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismissed' }));
      }
    }
  });
  rzp.on('payment.failed', function (resp) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', payload: resp.error }));
  });
  rzp.open();
</script></body></html>`;
}

export default function PaymentScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Payment'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { purpose, refId } = route.params;
  const { session, profile, t } = useAuth();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'paying' | 'success' | 'failed'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createOrder = useCallback(async () => {
    setState('loading');
    setErrorMsg(null);
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { purpose, ref_id: refId },
    });
    if (error || !data || data.error) {
      setErrorMsg((data && data.error) || error?.message || 'Could not start payment');
      setState('failed');
      return;
    }
    setOrder(data as OrderInfo);
    setState('ready');
  }, [purpose, refId]);

  useEffect(() => {
    void createOrder();
  }, [createOrder]);

  // Web: load checkout.js and open Razorpay modal directly
  const payOnWeb = useCallback(() => {
    if (!order) return;
    setState('paying');
    const open = () => {
      const RazorpayCtor = (window as unknown as Record<string, unknown>).Razorpay as new (
        opts: Record<string, unknown>,
      ) => { open: () => void; on: (ev: string, cb: () => void) => void };
      const rzp = new RazorpayCtor({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Nakshtra',
        prefill: { email: profile?.email ?? '', name: profile?.full_name ?? '' },
        theme: { color: '#5b2a86' },
        handler: () => setState('success'),
        modal: { ondismiss: () => setState('ready') },
      });
      rzp.on('payment.failed', () => setState('failed'));
      rzp.open();
    };
    if ((window as unknown as Record<string, unknown>).Razorpay) {
      open();
    } else {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = open;
      script.onerror = () => {
        setErrorMsg('Failed to load payment gateway');
        setState('failed');
      };
      document.body.appendChild(script);
    }
  }, [order, profile]);

  const onDone = () => navigation.goBack();

  if (state === 'loading') return <Loading />;

  if (state === 'success') {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>✅</Text>
        <Text style={styles.statusText}>{t('paymentSuccess')}</Text>
        <Text style={styles.hint}>Confirmation is processed securely via webhook — status updates shortly.</Text>
        <Button title="OK" onPress={onDone} style={{ marginTop: spacing.lg, minWidth: 160 }} />
      </Screen>
    );
  }

  if (state === 'failed') {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>⚠️</Text>
        <Text style={styles.statusText}>{errorMsg ?? t('paymentFailed')}</Text>
        <Button title={t('retry')} onPress={createOrder} style={{ marginTop: spacing.lg, minWidth: 160 }} />
        <Button title={t('cancel')} variant="outline" onPress={onDone} style={{ marginTop: spacing.sm, minWidth: 160 }} />
      </Screen>
    );
  }

  // Native: embed checkout inside a WebView
  if (Platform.OS !== 'web' && state === 'paying' && order && WebViewComponent) {
    return (
      <WebViewComponent
        source={{ html: checkoutHtml(order, profile?.email ?? '', profile?.full_name ?? ''), baseUrl: 'https://nakshtra.app' }}
        style={{ flex: 1 }}
        javaScriptEnabled
        onMessage={(event: { nativeEvent: { data: string } }) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'success') setState('success');
            else if (msg.type === 'failed') setState('failed');
            else setState('ready');
          } catch {
            setState('ready');
          }
        }}
      />
    );
  }

  return (
    <Screen style={styles.center}>
      <Text style={styles.bigEmoji}>🔒</Text>
      <Text style={styles.statusText}>
        {order ? `₹${(order.amount / 100).toFixed(0)}` : ''}
      </Text>
      <Text style={styles.hint}>
        {purpose === 'question_fast_track'
          ? 'Fast-track your question for a priority expert reply.'
          : 'Confirm your video consultation booking.'}
      </Text>
      <Button
        title={t('payNow')}
        onPress={Platform.OS === 'web' ? payOnWeb : () => setState('paying')}
        style={{ marginTop: spacing.lg, minWidth: 200 }}
      />
      <Button title={t('cancel')} variant="outline" onPress={onDone} style={{ marginTop: spacing.sm, minWidth: 200 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  bigEmoji: { fontSize: 56, marginBottom: spacing.md },
  statusText: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, maxWidth: 320, lineHeight: 20 },
});
