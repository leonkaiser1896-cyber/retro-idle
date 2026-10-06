import { useCallback, useEffect, useState } from "react";

export type GameFeedbackEvent = "collect" | "buy" | "upgrade" | "manager" | "error";

type ActionFeedbackTone = "success" | "info";
type RecentActionType = "collect" | "buy_generator" | "buy_upgrade" | "hire_manager";

interface GameFeedbackOptions {
  detail?: string;
  targetId?: string;
  text?: string;
}

interface ActionFeedbackState {
  id: number;
  text: string;
  detail?: string;
  tone?: ActionFeedbackTone;
}

interface CollectFeedbackState {
  id: number;
  text: string;
}

interface RecentActionState {
  id: number;
  type: RecentActionType;
  targetId?: string;
}

const FEEDBACK_MESSAGES: Record<
  GameFeedbackEvent,
  { text: string; detail?: string; tone?: ActionFeedbackTone; recentAction?: RecentActionType; collectText?: string }
> = {
  collect: {
    text: "Kasse geleert",
    detail: "Offene Einnahmen eingesammelt",
    tone: "success",
    recentAction: "collect",
    collectText: "Eingesammelt",
  },
  buy: {
    text: "Business gekauft",
    tone: "success",
    recentAction: "buy_generator",
  },
  upgrade: {
    text: "Upgrade aktiv",
    tone: "success",
    recentAction: "buy_upgrade",
  },
  manager: {
    text: "Manager eingestellt",
    tone: "success",
    recentAction: "hire_manager",
  },
  error: {
    text: "Aktion nicht möglich",
    tone: "info",
  },
};

function createFeedbackId() {
  return Date.now();
}

export function useGameFeedback() {
  const [collectFeedback, setCollectFeedback] = useState<CollectFeedbackState | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState | null>(null);
  const [recentAction, setRecentAction] = useState<RecentActionState | null>(null);

  useEffect(() => {
    if (!collectFeedback || typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCollectFeedback(null), 950);
    return () => window.clearTimeout(timeoutId);
  }, [collectFeedback]);

  useEffect(() => {
    if (!actionFeedback || typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setActionFeedback(null), 1450);
    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

  useEffect(() => {
    if (!recentAction || typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setRecentAction(null), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [recentAction]);

  const emitFeedback = useCallback((event: GameFeedbackEvent, options: GameFeedbackOptions = {}) => {
    const id = createFeedbackId();
    const preset = FEEDBACK_MESSAGES[event];

    setActionFeedback({
      id,
      text: options.text ?? preset.text,
      detail: options.detail ?? preset.detail,
      tone: preset.tone,
    });

    if (preset.collectText) {
      setCollectFeedback({ id, text: preset.collectText });
    }

    if (preset.recentAction) {
      setRecentAction({ id, type: preset.recentAction, targetId: options.targetId });
    }
  }, []);

  return {
    actionFeedback,
    collectFeedback,
    emitFeedback,
    recentAction,
  };
}
