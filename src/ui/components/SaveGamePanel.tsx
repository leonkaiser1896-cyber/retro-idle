import { useState, type ChangeEvent } from "react";

interface SaveGamePanelProps {
  disabled: boolean;
  onExportSave: () => string | null | Promise<string | null>;
  onImportSave: (json: string) => Promise<boolean>;
  onResetLocalSave: () => Promise<boolean>;
}

export function SaveGamePanel({ disabled, onExportSave, onImportSave, onResetLocalSave }: SaveGamePanelProps) {
  const [message, setMessage] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupMade, setBackupMade] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [importText, setImportText] = useState("");
  const blocked = disabled || busy;

  async function downloadBackup() {
    setBusy(true);
    try {
      const raw = await onExportSave();
      if (!raw) {
        setMessage("Die Sicherung konnte nicht erstellt werden.");
        return;
      }
      setBackupText(raw);
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `retro-idle-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMade(true);
      setMessage("Deine Sicherung wurde zum Download bereitgestellt.");
    } catch {
      setMessage("Sicherung konnte nicht erstellt werden. Prüfe die Serververbindung.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreText() {
    setBusy(true);
    try {
      const ok = await onImportSave(importText);
      setMessage(
        ok ? "Spielstand erfolgreich wiederhergestellt." : "Ungültige Sicherung. Dein Spielstand bleibt erhalten.",
      );
      setArmed(false);
    } catch {
      setMessage("Wiederherstellung fehlgeschlagen. Dein Spielstand bleibt erhalten.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage("Die Datei ist zu groß. Wähle eine Retro-Idle-Sicherung unter 1 MB.");
      return;
    }
    setBusy(true);
    try {
      const ok = await onImportSave(await file.text());
      setMessage(
        ok ? "Spielstand erfolgreich wiederhergestellt." : "Ungültige Sicherung. Dein Spielstand bleibt erhalten.",
      );
      setArmed(false);
    } catch {
      setMessage("Die Datei konnte nicht gelesen werden. Dein Spielstand bleibt erhalten.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    try {
      const ok = await onResetLocalSave();
      setMessage(ok ? "Neues Spiel gestartet." : "Der Spielstand konnte nicht zurückgesetzt werden.");
      setArmed(false);
    } catch {
      setMessage("Neustart fehlgeschlagen. Versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="save-game-panel">
      <div className="save-intro">
        <span className="save-status-dot" />
        <div>
          <h3>Dein Fortschritt bleibt hier.</h3>
          <p>
            Retro Idle speichert deinen Fortschritt verschlüsselt auf dem Server. Sicherungsdateien sind verschlüsselt
            und für diesen Browser-Zugang bestimmt. Sie sind 30 Tage gültig und können einmal wiederhergestellt werden.
          </p>
        </div>
      </div>
      <div className="save-action-card">
        <div>
          <h3>Sicherung herunterladen</h3>
          <p>Sichere deinen aktuellen Spielstand als verschlüsselte Datei.</p>
        </div>
        <button className="primary-button" disabled={blocked} onClick={downloadBackup}>
          Sicherung herunterladen
        </button>
      </div>
      <div className="save-action-card">
        <div>
          <h3>Spielstand wiederherstellen</h3>
          <p>Eine gültige Sicherung ersetzt deinen aktuellen Fortschritt. Lade vorher eine Sicherung herunter.</p>
        </div>
        <input
          aria-label="Spielstand-Datei"
          type="file"
          accept=".json,application/json"
          disabled={blocked || !backupMade}
          onChange={restore}
        />
        {!backupMade && <small>Erstelle zuerst eine Sicherung des aktuellen Spielstands.</small>}
      </div>
      <div className="save-action-card reset-card">
        <div>
          <h3>Neu anfangen</h3>
          <p>Setzt dein Unternehmen auf dem Server zurück. Deine Sicherungsdatei bleibt erhalten.</p>
        </div>
        <button className="danger-button" disabled={blocked || !backupMade} onClick={reset}>
          {armed ? "Ja, neues Spiel starten" : "Neues Spiel"}
        </button>
        {armed && (
          <button className="secondary-button" onClick={() => setArmed(false)}>
            Abbrechen
          </button>
        )}
      </div>
      <details className="save-text-fallback">
        <summary>Sicherung als Text verwenden</summary>
        <p>
          Falls dein Browser den Download nicht unterstützt, kopiere den Sicherungstext in eine Datei. Zum
          Wiederherstellen kannst du ihn hier einfügen.
        </p>
        <label>
          Sicherungstext
          <textarea
            aria-label="Sicherungstext"
            readOnly
            value={backupText}
            placeholder="Erstelle zuerst eine Sicherung."
          />
        </label>
        <label>
          Wiederherstellungstext
          <textarea
            aria-label="Wiederherstellungstext"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          disabled={blocked || !backupMade || !importText.trim()}
          onClick={restoreText}
        >
          Text wiederherstellen
        </button>
      </details>
      {message && (
        <p className="save-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
