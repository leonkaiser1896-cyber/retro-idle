# Sicherheit und Vertrauensgrenze

## Implementiert

- Der Server besitzt Zustand und Zeit und berechnet Spielaktionen selbst.
- Datenbanksaves und heruntergeladene Dateien sind mit AES-256-GCM verschlüsselt und authentifiziert. Für jede Verschlüsselung wird ein neuer zufälliger Nonce erzeugt.
- Schlüsselmaterial befindet sich ausschließlich im Server-Datenordner; Frontend und Übergabepaket enthalten keinen Schlüssel.
- Authentifizierter Kontext bindet Dateien an Zweck und Zugang. Manipulierte Dateien, andere Schlüssel, fremde Zugänge und unverschlüsselte Saves werden abgelehnt.
- Sicherungen sind 30 Tage gültig und einmal importierbar. Transaktionale Wiederherstellung verhindert wiederholte Nutzung derselben Datei.
- HttpOnly-/SameSite-Strict-Cookie mit zufälligem 256-Bit-Token; auf dem Server wird nur dessen SHA-256-Hash gespeichert. Bei HTTPS wird Secure gesetzt.
- Origin-/Host-Prüfung, eigenes Request-Header, keine freigegebene Cross-Origin-API, Sicherheitsheader und Content-Security-Policy.
- Größenlimits, Request-Timeouts und maximal 300 API-Anfragen pro Minute und IP.
- Aktionen erlauben nur bekannte Typen und ID-Felder; beliebige Zustandsfelder werden abgelehnt. Aktionen pro Zugang werden seriell ausgeführt.
- Save-Validierung prüft Zahlenbereich, IDs, Level und Zeitstempel. Speicherprobleme werden nicht als erfolgreiche Serveraktionen gemeldet.

Die GCM-Tag-Prüfung folgt der [Node.js-Crypto-API](https://nodejs.org/api/crypto.html). SQLite wird über die [integrierte Node.js-API](https://nodejs.org/api/sqlite.html) angesprochen.

## Grenzen und Betrieb

Der Serveradministrator kann den serverseitigen Schlüssel verwenden. Läuft der Server auf dem Rechner eines Spielers, kontrolliert dieser auch den Server und seine Dateien. Für Schutz vor Spielern muss die produktive Instanz auf einem von ihnen nicht administrierbaren Server laufen. Die normale Spielanzeige ist selbstverständlich lesbar; verschlüsselt sind gespeicherte Inhalte und Sicherungsdateien.

Der aktuelle Zugang ist browsergebunden und besitzt noch keine Account-Anmeldung oder Recovery-Funktion. Cookies nicht löschen, solange der Zugang benötigt wird. Nach 30 Tagen Inaktivität läuft der Zugang ab; gespeicherte Spielstände werden nicht automatisch gelöscht. Eine Sicherungsdatei allein ersetzt kein Zugangscookie. Alte lokale Saves bleiben erhalten, werden aber nicht als vertrauenswürdige Serverstände übernommen.

Die lokale Instanz bindet nur 127.0.0.1. Vor öffentlichem Betrieb sind HTTPS-Reverse-Proxy, explizite PUBLIC_ORIGIN, dauerhafte Anmeldung und Betriebssicherung erforderlich. Rate Limits sind ein Basisschutz für einen einzelnen Prozess, kein Schutz vor verteilten Angriffen. Ein externer Penetrationstest und großer Mehrbenutzer-Lasttest wurden nicht durchgeführt.

Auf Windows ersetzt der Dateimodus keine ACL: Den Datenordner ausschließlich für den Serverbenutzer freigeben. Schlüssel und Datenbank gemeinsam und geschützt sichern. Bei fehlendem Schlüssel mit vorhandener Datenbank verweigert der Server den Start statt einen neuen Schlüssel zu erzeugen.
