import { useEffect, useRef, type ReactNode } from "react";

interface GameWindowProps {
  title: string;
  eyebrow?: string;
  iconLabel?: string;
  subtitle?: string;
  className?: string;
  variant?: "default" | "primary" | "development";
  onClose?: () => void;
  children: ReactNode;
}

export function GameWindow({
  children,
  className,
  eyebrow,
  iconLabel,
  onClose,
  subtitle,
  title,
  variant = "default",
}: GameWindowProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [title]);
  const classes = ["game-window", `game-window-${variant}`, className].filter(Boolean).join(" ");
  const titleId = `game-window-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      className={classes}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="window-titlebar">
        <div className="window-heading">
          <span className="window-icon" aria-hidden="true">
            {iconLabel ?? title.slice(0, 1)}
          </span>
          <div className="window-title-copy">
            {eyebrow && <span className="window-eyebrow">{eyebrow}</span>}
            <h2 id={titleId}>{title}</h2>
          </div>
        </div>
        <div className="window-controls">
          {variant === "development" && <span className="window-dev-pill">Dev</span>}
          {onClose ? (
            <button className="window-close-button" type="button" aria-label={`${title} schließen`} onClick={onClose}>
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            <span className="window-close-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
      {subtitle && <p className="window-subtitle">{subtitle}</p>}
      {variant === "development" && (
        <p className="window-development-note">
          Nur für Entwicklung und Playtests. Nicht als normales Spieler-Feature gedacht.
        </p>
      )}
      <div className="window-body">{children}</div>
    </section>
  );
}
