// Loads branding images (eye logo + royal frames) as data URIs so they can be
// embedded in the self-contained kundli PDF/HTML on every platform.

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

const LOGO = require('../../assets/branding/logo-small.png');
const KING_FRAME = require('../../assets/branding/king-frame.jpg');
const QUEEN_FRAME = require('../../assets/branding/queen-frame.jpg');

export interface BrandAssets {
  logo: string;
  kingFrame: string;
  queenFrame: string;
}

async function toDataUri(moduleRef: number, mime: string): Promise<string> {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  if (Platform.OS === 'web') {
    // Fetch the bundled URL and convert to a data URI so the print window is self-contained
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(asset.localUri ?? asset.uri, {
    encoding: 'base64',
  });
  return `data:${mime};base64,${base64}`;
}

let cached: BrandAssets | null = null;

export async function loadBrandAssets(): Promise<BrandAssets> {
  if (cached) return cached;
  const [logo, kingFrame, queenFrame] = await Promise.all([
    toDataUri(LOGO, 'image/png'),
    toDataUri(KING_FRAME, 'image/jpeg'),
    toDataUri(QUEEN_FRAME, 'image/jpeg'),
  ]);
  cached = { logo, kingFrame, queenFrame };
  return cached;
}
