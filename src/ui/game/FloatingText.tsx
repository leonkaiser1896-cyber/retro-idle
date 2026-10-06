interface FloatingTextProps {
  text: string;
  tone?: "success" | "warning" | "info";
}

export function FloatingText({ text, tone = "success" }: FloatingTextProps) {
  return <span className={`floating-text floating-text-${tone}`}>{text}</span>;
}
