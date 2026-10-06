# Balancing Report

## Active Profile

- Active Web-App profile: `webDefault`

## Vergleich: fastPlaytest vs webDefault

| Profil | Workshop | Logistics | Club | Company | Höchste Stufe im längsten Lauf | Warnungen |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| fastPlaytest | 11m 24s | 25m 21s | 41m 42s | 1h 20m | company | 0 |
| webDefault | 13m 7s | 48m 51s | 4h 4m | 1d 5h | company | 0 |

## Company-Erreichbarkeit

- `fastPlaytest`: Company bei 1h 20m. Bewertung: OK für Feature- und UI-Tests, weil dieses Profil absichtlich schnell ist.
- `webDefault`: Company bei 1d 5h. Bewertung: OK; Ziel ist nicht vor 8h und ideal etwa 24-72h.

## Profile Purpose

- `fastPlaytest`: schnelles Feature- und UI-Testing; Company darf innerhalb weniger Stunden erreichbar sein.
- `webDefault`: Web-MVP-Default; Company sollte nicht nach 8 Stunden, sondern eher nach 24 bis 72 Stunden sinnvoller Auto-Progression erreichbar sein.

## Profile: Fast Playtest (`fastPlaytest`)

Fast UI and feature-testing curve. Company can be reached within a few hours.

### Simulationsannahmen

- Simulation nutzt ausschließlich den bestehenden TypeScript-Core.
- Keine Browser- oder UI-Economy-Regeln werden verwendet.
- Passive Simulation kauft nichts automatisch.
- `generatedRevenue` ist insgesamt produzierte Einnahme, `pendingRevenue` ist offene Kasse, `collectedCredits` ist insgesamt eingesammelt, `spendableCredits` ist aktuell kaufbares Guthaben.
- Progression Simulation kauft automatisch nach Priorität: günstigster sinnvoller Generator, dann Upgrades, dann Manager.
- Collect-Strategie der Auto-Progression: vor jedem Kaufversuch wird gesammelt; wenn nicht genug `spendableCredits` vorhanden sind, wird maximal 30 Sekunden gewartet und dann erneut gesammelt.
- Auto-Progression kauft ausschließlich mit eingesammelten `credits`; `pendingRevenue` ist nicht spendable.
- Offline-Cap kommt aus der aktiven Config.

### Config Validation

- Status: valid

### Passive Simulation

| Zeitraum | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec | Generator-Level | Upgrades | Manager | Business-Stufe |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| 10 Minuten | 60 | 60 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 30 Minuten | 180 | 180 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 1 Stunde | 360 | 360 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 8 Stunden | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 24 Stunden | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 7 Tage | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |

### Auto-Progression

| Zeitraum | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec | Generator-Level | Upgrades | Manager | Business-Stufe |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| 10 Minuten | 574.9 | 0 | 574.9 | 52.73 | 1.6 | kiosk:16, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 30 Minuten | 41,246 | 0 | 41,246 | 420 | 118.2 | kiosk:39, workshop:21, logistics:5, club:0, company:0 | better_shelves, tool_contracts | kiosk_manager, workshop_manager | logistics |
| 1 Stunde | 2,295,699 | 0 | 2,295,699 | 43,937 | 2,709 | kiosk:66, workshop:44, logistics:27, club:10, company:0 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager | club |
| 8 Stunden | 1,566,819,695 | 0 | 1,566,819,695 | 4,455,060 | 84,358 | kiosk:111, workshop:85, logistics:65, club:45, company:27 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager, company_manager | company |
| 24 Stunden | 7,274,063,263 | 0 | 7,274,063,263 | 67,669,319 | 108,233 | kiosk:122, workshop:94, logistics:74, club:54, company:35 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager, company_manager | company |
| 7 Tage | 75,308,102,383 | 0 | 75,308,102,383 | 1,415,545,763 | 143,802 | kiosk:139, workshop:109, logistics:88, club:66, company:47 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager, company_manager | company |

### Ungefähre Erreichbarkeit

| Business | Erreichbarkeit |
| --- | ---: |
| Kleine Werkstatt | 11m 24s |
| Lieferfirma | 25m 21s |
| Club / Eventlocation | 41m 42s |
| Unternehmenszentrale | 1h 20m |

### Offline-Cap Simulation

| Zeitraum | Applied | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Stunde offline | 1h 0m | 16,560 | 16,560 | 0 | 0 | 4.6 |
| 8 Stunden offline | 8h 0m | 132,480 | 132,480 | 0 | 0 | 4.6 |
| 24 Stunden offline | 8h 0m | 132,480 | 132,480 | 0 | 0 | 4.6 |

### Auffälligkeiten

- Keine automatischen Warnungen.

### Empfehlungen

- Keine unmittelbaren Anpassungen nötig. Als nächstes echte Playtest-Daten sammeln.

## Profile: Web Default (`webDefault`)

Default Web MVP curve. Company should require roughly 24 to 72 hours of meaningful auto progression.

### Simulationsannahmen

- Simulation nutzt ausschließlich den bestehenden TypeScript-Core.
- Keine Browser- oder UI-Economy-Regeln werden verwendet.
- Passive Simulation kauft nichts automatisch.
- `generatedRevenue` ist insgesamt produzierte Einnahme, `pendingRevenue` ist offene Kasse, `collectedCredits` ist insgesamt eingesammelt, `spendableCredits` ist aktuell kaufbares Guthaben.
- Progression Simulation kauft automatisch nach Priorität: günstigster sinnvoller Generator, dann Upgrades, dann Manager.
- Collect-Strategie der Auto-Progression: vor jedem Kaufversuch wird gesammelt; wenn nicht genug `spendableCredits` vorhanden sind, wird maximal 30 Sekunden gewartet und dann erneut gesammelt.
- Auto-Progression kauft ausschließlich mit eingesammelten `credits`; `pendingRevenue` ist nicht spendable.
- Offline-Cap kommt aus der aktiven Config.

### Config Validation

- Status: valid

### Passive Simulation

| Zeitraum | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec | Generator-Level | Upgrades | Manager | Business-Stufe |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| 10 Minuten | 60 | 60 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 30 Minuten | 180 | 180 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 1 Stunde | 360 | 360 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 8 Stunden | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 24 Stunden | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 7 Tage | 2,880 | 2,880 | 0 | 25 | 0.1 | kiosk:1, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |

### Auto-Progression

| Zeitraum | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec | Generator-Level | Upgrades | Manager | Business-Stufe |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| 10 Minuten | 574.9 | 0 | 574.9 | 52.73 | 1.6 | kiosk:16, workshop:0, logistics:0, club:0, company:0 | - | - | kiosk |
| 30 Minuten | 12,341 | 0 | 12,341 | 274.58 | 17.4 | kiosk:33, workshop:12, logistics:0, club:0, company:0 | better_shelves | kiosk_manager | workshop |
| 1 Stunde | 86,076 | 0 | 86,076 | 864.36 | 63.5 | kiosk:46, workshop:21, logistics:3, club:0, company:0 | better_shelves, tool_contracts | kiosk_manager, workshop_manager | logistics |
| 8 Stunden | 12,258,391 | 0 | 12,258,391 | 228,209 | 836.5 | kiosk:79, workshop:48, logistics:27, club:6, company:0 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager | club |
| 24 Stunden | 85,393,393 | 0 | 85,393,393 | 267,718 | 1,565 | kiosk:92, workshop:59, logistics:37, club:16, company:0 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager | club |
| 7 Tage | 5,705,043,282 | 0 | 5,705,043,282 | 210,027,381 | 15,925 | kiosk:121, workshop:82, logistics:58, club:34, company:16 | better_shelves, tool_contracts, route_planning, brand_presence | kiosk_manager, workshop_manager, logistics_manager, club_manager, company_manager | company |

### Ungefähre Erreichbarkeit

| Business | Erreichbarkeit |
| --- | ---: |
| Kleine Werkstatt | 13m 7s |
| Lieferfirma | 48m 51s |
| Club / Eventlocation | 4h 4m |
| Unternehmenszentrale | 1d 5h |

### Offline-Cap Simulation

| Zeitraum | Applied | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Stunde offline | 1h 0m | 13,320 | 13,320 | 0 | 0 | 3.7 |
| 8 Stunden offline | 8h 0m | 106,560 | 106,560 | 0 | 0 | 3.7 |
| 24 Stunden offline | 8h 0m | 106,560 | 106,560 | 0 | 0 | 3.7 |

### Auffälligkeiten

- Keine automatischen Warnungen.

### Empfehlungen

- Keine unmittelbaren Anpassungen nötig. Als nächstes echte Playtest-Daten sammeln.
