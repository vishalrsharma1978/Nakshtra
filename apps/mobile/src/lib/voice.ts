// Voice helpers for the AI astrologer.
// - Speaking: expo-speech (native TTS on iOS/Android, Web Speech synthesis on web).
// - Listening: the browser's Web Speech Recognition API (web only). Native speech
//   recognition needs a custom dev build, so on iOS/Android the mic button is hidden
//   and users can use the keyboard's built-in dictation instead.

import { Platform } from "react-native";
import * as Speech from "expo-speech";

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (Platform.OS !== "web") return null;
  const w = globalThis as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = (): boolean => getRecognitionCtor() !== null;

export interface Listener {
  stop: () => void;
}

/** Starts one dictation session. Calls onText with the transcript, onEnd when finished. */
export function startListening(
  lang: "en" | "hi",
  handlers: {
    onText: (text: string, isFinal: boolean) => void;
    onEnd: () => void;
    onError: (message: string) => void;
  },
): Listener | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let isFinal = false;
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i] as unknown as { isFinal?: boolean } & ArrayLike<{
        transcript: string;
      }>;
      text += r[0].transcript;
      if (r.isFinal) isFinal = true;
    }
    handlers.onText(text, isFinal);
  };
  rec.onerror = (e) => {
    handlers.onError(
      e.error === "not-allowed"
        ? "Microphone permission was denied. Allow it in your browser settings."
        : e.error === "no-speech"
          ? "I didn't hear anything. Please try again."
          : `Voice input error: ${e.error}`,
    );
  };
  rec.onend = handlers.onEnd;
  rec.start();
  return { stop: () => rec.stop() };
}

/** Removes markdown symbols so the voice doesn't read "asterisk asterisk". */
function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(
  text: string,
  lang: "en" | "hi",
  onDone?: () => void,
): void {
  Speech.stop();
  Speech.speak(cleanForSpeech(text), {
    language: lang === "hi" ? "hi-IN" : "en-IN",
    rate: 0.95,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
