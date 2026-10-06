# Übergabe Retro Idle – 2026-10-06

## Geprüfter Stand

Node.js 24.16.0; 108 automatisierte Tests für Spielregeln, Anwendung, Verschlüsselung, Server-API und Persistenz. Strict-Typecheck und Produktionsbuild. npm audit ohne gemeldete Schwachstellen. View-Modell im Lastszenario mit fünf Betrieben auf Level 100 und acht Stunden Fortschritt: 5000 Messungen, p95 etwa 0,08 ms. Das ist eine Rechenzeitmessung, kein Browser-FPS- oder Mehrbenutzer-Lasttest.

Die Oberfläche wurde lokal mit Serverbetrieb und verschlüsseltem Export/Import geprüft. Die erfolgreiche Wiederherstellung ist im Aktionsverlauf sichtbar. Das integrierte Browserwerkzeug bestätigte den Dateidownload nicht als Datei auf der Festplatte; der angezeigte verschlüsselte Sicherungstext und dessen erfolgreicher Import wurden unabhängig geprüft.

Die frühere Integration und unbenutzte UI-/Entwicklungsdateien wurden aus dem aktiven Projekt entfernt. Die vorherige vollständige Quelle ist separat gesichert. Kein Zugriffsschlüssel oder laufender Spielstand gehört in die Quellcode-Übergabe.

## Start

npm ci, npm run build, npm run server. Spiel auf http://127.0.0.1:4174. Der Server bleibt für Spielen und Import nötig. Node.js ab Version 24.

Umgebungswerte stehen in .env.example. Sie werden über Prozess-Umgebungsvariablen gesetzt; die Datei wird nicht automatisch geladen. Beispiel: unter PowerShell $env:PORT='4174'. PUBLIC_ORIGIN muss zum Browser-Ursprung passen. HOST standardmäßig auf Loopback belassen. Im Entwicklungsbetrieb zusätzlich npm run dev starten; dessen lokale API-Weiterleitung zielt auf Port 4174.

## Datensicherung und Rollback

Server anhalten, gesamten server-data-Ordner inklusive save-key.bin und SQLite-Dateien gemeinsam in ein geschütztes Backup kopieren. Schlüsselverlust verhindert das Entschlüsseln bestehender Saves. Für Rollback denselben Ordner gemeinsam wiederherstellen und die passende Codeversion starten. Keine Spielerdaten löschen, um einen Startfehler zu umgehen. Der Datenordner wird vom Übergabe-Werkzeug ausdrücklich nicht mitkopiert.

## Offene Betriebsgrenzen

Der Stand ist lokal lauffähig und als Codebasis übergebbar. Eine öffentliche Instanz wurde nicht eingerichtet. HTTPS, dauerhafte Anmeldung und Zugangswiederherstellung sind für einen öffentlichen Dienst noch einzubauen. Dateien sind derzeit an den Browser-Zugang gebunden, 30 Tage gültig und einmal wiederherstellbar. Bestehende unverschlüsselte lokale Saves werden nicht automatisch in den neuen Modus übertragen.

Weitere Details in docs/security.md und docs/architecture.md. Ein Server, den ein Spieler selbst administriert, kann nicht gegen diesen Administrator geschützt werden.
