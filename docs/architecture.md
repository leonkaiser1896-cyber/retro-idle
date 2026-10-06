# Architektur

Die Spielregeln in src/game bestehen aus TypeScript-Funktionen ohne Browser- oder React-Abhängigkeiten. Balancing steht zentral in src/config. Aktionen erzeugen einen neuen Zustand; die Oberfläche erhält abgeleitete View-Modelle.

Das Frontend verwendet ServerGameHost. Es sendet ausschließlich erlaubte Aktionen und fragt Anzeigeinformationen einmal pro Sekunde ab. Bei verstecktem Dokument pausieren diese Abfragen. Der Server berechnet die Werte mit seiner eigenen Uhr. Importierte Credits, Level oder Zeitwerte aus dem Browser werden nicht als Spielaktionen akzeptiert.

GameService lädt, migriert und validiert Zustände und führt Spielregeln aus. ServerStore speichert verschlüsselte Inhalte in SQLite. SaveCipher verwendet einen serverseitigen 256-Bit-Schlüssel, einen zufälligen 96-Bit-Nonce je Verschlüsselung und einen 128-Bit-GCM-Tag. Authentifizierter Kontext trennt Datenbanksaves von Sicherungen und bindet sie an den jeweiligen Zugang.

Serveraktionen werden pro Session seriell verarbeitet. Snapshots berechnen nur die Anzeige und schreiben nicht in die Datenbank. Verschlüsselte Exporte enthalten eine eindeutige Sicherungs-ID und ein Ablaufdatum. Der Import validiert Verschlüsselung und Eigentümer; Wiederherstellung und Verbrauch der Sicherungs-ID erfolgen in einer SQLite-Transaktion ohne asynchrone Unterbrechung.

Save-Schema 3 trennt produzierten, eingesammelten und ausgegebenen Umsatz. Unterstützte ältere Schemas werden in der Spiellogik migriert. Alte unverschlüsselte Browserdateien werden vom Server-Import abgelehnt. StandaloneGameHost und lokale Adapter bleiben als isolierter Testpfad erhalten und werden vom normalen Frontend nicht verwendet.
