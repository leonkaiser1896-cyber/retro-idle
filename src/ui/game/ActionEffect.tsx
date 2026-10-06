import { FloatingText } from "./FloatingText";

interface ActionEffectProps {
  feedback: { id: number; text: string; detail?: string; tone?: "success" | "info" } | null;
}

export function ActionEffect({ feedback }: ActionEffectProps) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`action-effect action-effect-${feedback.tone ?? "success"}`} aria-live="polite">
      <FloatingText key={feedback.id} text={feedback.text} tone={feedback.tone ?? "success"} />
      {feedback.detail && <small>{feedback.detail}</small>}
    </div>
  );
}
