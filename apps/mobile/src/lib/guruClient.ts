// One entry point for asking the guru a question.
//   - "builtin" (default): the offline engine in @nakshtra/shared answers from the user's
//     kundli on-device. No server, no API key, no cost, works offline.
//   - "ai": the OpenAI-backed Supabase function. If it is not configured or fails, we
//     transparently fall back to the built-in guru so the user always gets an answer.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  answerQuestion,
  summarizeKundliForAi,
  type GuruAnswer,
  type GuruContext,
  type GuruLanguage,
} from "@nakshtra/shared";
import { supabase } from "./supabase";

export type GuruMode = "builtin" | "ai";

const MODE_KEY = "nakshtra.guru.mode";

export async function loadGuruMode(): Promise<GuruMode> {
  try {
    const v = await AsyncStorage.getItem(MODE_KEY);
    return v === "ai" ? "ai" : "builtin";
  } catch {
    return "builtin";
  }
}

export async function saveGuruMode(mode: GuruMode): Promise<void> {
  try {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } catch {
    /* non-fatal */
  }
}

export interface GuruTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GuruReply extends GuruAnswer {
  /** Which engine actually produced the answer */
  source: "builtin" | "ai";
}

export async function askGuru(args: {
  question: string;
  history: GuruTurn[];
  ctx: GuruContext | null;
  lang: GuruLanguage;
  mode: GuruMode;
}): Promise<GuruReply> {
  const { question, history, ctx, lang, mode } = args;

  if (mode === "ai") {
    try {
      const kundli = ctx
        ? summarizeKundliForAi(ctx.input, ctx.kundli, {
            name: ctx.name,
            now: ctx.now,
          })
        : "";
      const { data, error } = await supabase.functions.invoke("ai-astrologer", {
        body: { messages: history.slice(-12), kundli, language: lang },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return {
        intent: "unknown",
        text: data.reply as string,
        suggestExpert: Boolean(data.suggestExpert),
        source: "ai",
      };
    } catch {
      // Fall through to the built-in guru
    }
  }

  return { ...answerQuestion(question, ctx, lang), source: "builtin" };
}
