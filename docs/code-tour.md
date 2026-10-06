# Code-Rundgang

Diese Auswahl zeigt die wesentlichen technischen Entscheidungen der Arbeitsprobe. Die Pfade beziehen sich auf das Repository und sind direkt anklickbar.

## 1. Spielregeln ohne Oberfläche

[`src/game/actions.ts`](../src/game/actions.ts) führt Käufe und das Einsammeln von Einnahmen aus. Die Funktionen erhalten Zustand, Konfiguration und Zeit als Eingabe. Sie liefern ein Ergebnis mit neuem Zustand oder einem fachlichen Fehler zurück. Dadurch lassen sich die Regeln ohne Browser testen.

[`src/game/economy.ts`](../src/game/economy.ts) berechnet Preise und Produktionsraten; [`src/config/balancePresets.ts`](../src/config/balancePresets.ts) hält das Balancing zentral. Änderungen an Preisen erfordern keine Änderungen an UI-Komponenten.

## 2. Zeit und Offline-Fortschritt

[`src/game/simulation.ts`](../src/game/simulation.ts) berechnet Fortschritt aus einem Zeitintervall. Offline-Einnahmen sind begrenzt. Produzierte Einnahmen landen zunächst in einer Kasse und werden erst durch Einsammeln ausgebbar.

[`tests/game/offlineProgress.test.ts`](../tests/game/offlineProgress.test.ts) und [`tests/game/lazyProgress.test.ts`](../tests/game/lazyProgress.test.ts) prüfen Zeitgrenzen und die Fortschrittsberechnung. Die Tests verwenden vorgegebene Zeitwerte statt Wartezeiten.

## 3. Daten an der Vertrauensgrenze

[`src/game/migrations.ts`](../src/game/migrations.ts) behandelt importierte Daten als unbekannte Eingabe. Save-Version, Zahlen, Objekt-IDs und Zeitstempel werden geprüft. Erlaubte Felder werden ausdrücklich übernommen; zusätzliche Felder werden nicht in den Zustand kopiert.

[`server/saveCipher.ts`](../server/saveCipher.ts) kapselt AES-256-GCM. Zufällige Nonces und authentifizierter Kontext trennen Sicherungsdateien von gespeicherten Serverdaten. Der Schlüssel gehört ausschließlich auf den Server.

## 4. Server als Besitzer des Zustands

[`server/app.ts`](../server/app.ts) nimmt erlaubte Aktionen entgegen. Der Client darf keine Credits, Level oder eigene Zeitwerte als Fortschritt vorgeben. Gleichzeitig eingehende Aktionen desselben Zugangs werden seriell verarbeitet. Snapshots verändern den gespeicherten Zustand nicht.

[`server/store.ts`](../server/store.ts) speichert verschlüsselte Inhalte in SQLite und verwendet parametrisierte SQL-Anweisungen. Der Import einer Sicherung und die Markierung als verbraucht erfolgen atomar.

[`tests/server/security.test.ts`](../tests/server/security.test.ts) prüft manipulierte Dateien, fremde Zugänge, wiederholte Importe, gleichzeitige Käufe und den Erhalt des Spielstands nach einem Serverneustart.

## 5. Darstellung und Rückmeldungen

[`src/app/useGameController.ts`](../src/app/useGameController.ts) verbindet Oberfläche und Host. [`src/ui/game/GameShell.tsx`](../src/ui/game/GameShell.tsx) komponiert Spielansicht und Dialoge. Die Oberfläche fragt den Server einmal pro Sekunde ab und pausiert diese Abfragen bei verstecktem Dokument.

[`src/ui/components/SaveGamePanel.tsx`](../src/ui/components/SaveGamePanel.tsx) bietet Export, Wiederherstellung und Neustart mit vorheriger Sicherung an. Fehler werden verständlich angezeigt.

## Grenzen der Arbeitsprobe

Der Zugang ist derzeit an ein Browser-Cookie gebunden. Dauerhafte Anmeldung, Recovery, öffentliches HTTPS-Hosting und große Mehrbenutzer-Lasttests sind noch offen. Der Stand demonstriert eine lokal lauffähige Codebasis; die [Sicherheitsdokumentation](security.md) beschreibt die Grenzen genauer.

Zum Prüfen: `npm ci`, `npm run check`, `npm run build`. Die GitHub-Workflow-Datei wiederholt diese Prüfungen nach Pushes und Pull Requests.
