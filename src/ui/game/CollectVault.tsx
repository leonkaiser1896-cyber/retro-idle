import type { GameViewModel } from "../../app/GameService";
import { CollectSparkEffect } from "../../assets/effects";
import { GameIcon } from "../../assets/icons";
import { formatCredits, formatRate } from "../formatters";
import { FloatingText } from "./FloatingText";

interface CollectVaultProps {
  view: GameViewModel;
  disabled?: boolean;
  collectFeedback: { id: number; text: string } | null;
  onCollect: () => void;
}

export function CollectVault({ collectFeedback, disabled = false, onCollect, view }: CollectVaultProps) {
  const buttonState = view.collectButtonState;
  const canCollect = buttonState.enabled && !disabled;
  const fillPercent = view.collectFillPercent;
  const classes = [
    "collect-vault",
    view.collectableAmount > 0 ? "has-collectable" : "",
    collectFeedback ? "collect-flash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label="Tresor">
      <div className="vault-header">
        <div>
          <span>Kasse / Tresor</span>
          <strong>{formatCredits(view.pendingRevenue, { compact: false })}</strong>
        </div>
        <div>
          <span>Bereit zum Abholen</span>
          <strong>{formatCredits(view.collectableAmount, { compact: false })}</strong>
        </div>
      </div>

      <div className="vault-visual">
        <CollectSparkEffect />
        <div className="vault-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="vault-chamber" aria-hidden="true">
          <span className="vault-liquid" style={{ height: `${fillPercent}%` }} />
          <span className="vault-liquid-shine" />
        </div>
        <div className="vault-coin-stack" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="vault-door" aria-hidden="true">
          <span className="vault-rim" />
          <span className="vault-handle" />
          <span className="vault-bolt vault-bolt-a" />
          <span className="vault-bolt vault-bolt-b" />
          <span className="vault-bolt vault-bolt-c" />
          <span className="vault-bolt vault-bolt-d" />
          <i />
        </div>
        <div
          className="vault-fill"
          role="progressbar"
          aria-label="Kassenfüllstand"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fillPercent)}
        >
          <span style={{ width: `${fillPercent}%` }} />
        </div>
        {collectFeedback && <FloatingText key={collectFeedback.id} text={collectFeedback.text} />}
      </div>

      <div className="vault-meta">
        <span>Produktion: {formatRate(view.incomePerSecond)}</span>
        <span>Füllstand: {fillPercent.toFixed(0)}%</span>
      </div>

      <button className="primary-button vault-button" type="button" disabled={!canCollect} onClick={onCollect}>
        <GameIcon name="collect" />
        {buttonState.label}
      </button>
      {buttonState.disabledReason && <small className="button-reason">{buttonState.disabledReason}</small>}
      <p className="vault-tip">
        Deine Betriebe verdienen automatisch. Sammle die Einnahmen ein, um sie zu investieren.
      </p>
    </section>
  );
}
