# Dataset summary

Generated from `src/data/catalogue/*.json`. All sources fetched and verified on 2026-11-11 (Europe/Berlin).

Legend: ✓ supported (vendor documentation) · ✗ not supported · ◐ only under conditions · ? unknown (not documented in the checked sources) · ⚠ price source contradicts itself. Prices are **net** (zzgl. MwSt.) list prices; promotions are not included.
Nothing here is `tested` yet — all claims are documentation-only until Day 4 test runs exist.

| Plan | Price (net) | XRechnung empfangen | ZUGFeRD empfangen | Eingang technisch prüfen | XRechnung erstellen | ZUGFeRD erstellen | Rechnungsmenge | Original-XML herunterladen | DATEV-Export | Buchhaltung / EÜR | Läuft lokal |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lexware Office S | 7,90 € mtl. | ✓ | ✓ | ✓ | ✗ | ✗ | n/a | ✓ | ? | ✗ | ✗ |
| Lexware Office M | 12,90 € mtl. | ✓ | ✓ | ✓ | ✓ | ✓ | 50.000/Jahr | ✓ | ? | ✗ | ✗ |
| Lexware Office L | 21,90 € mtl. | ✓ | ✓ | ✓ | ✓ | ✓ | 50.000/Jahr | ✓ | ? | ✓ | ✗ |
| Lexware Office XL | 32,90 € mtl. | ✓ | ✓ | ✓ | ✓ | ✓ | 50.000/Jahr | ✓ | ? | ✓ | ✗ |
| sevdesk Kostenlos | 0,00 € mtl. | ✗ | ✗ | ✗ | ✓ | ✓ | 3/Monat | ✗ | ✗ | ✗ | ✗ |
| sevdesk Rechnung | 11,90 € mtl. ⚠<br>9,90 € /Mon. (12 M.) ⚠<br>8,90 € /Mon. (24 M.) ⚠ | ✗ | ✗ | ✗ | ✓ | ✓ | unbegrenzt | ✗ | ✓ | ✗ | ✗ |
| sevdesk Buchhaltung | 25,90 € mtl. ⚠<br>22,90 € /Mon. (12 M.) ⚠<br>19,90 € /Mon. (24 M.) ⚠ | ✓ | ✓ | ✓ | ✓ | ✓ | unbegrenzt | ? | ✓ | ✓ | ✗ |
| sevdesk Buchhaltung Pro | 34,90 € mtl. ⚠<br>30,90 € /Mon. (12 M.) ⚠<br>27,90 € /Mon. (24 M.) ⚠ | ✓ | ✓ | ✓ | ✓ | ✓ | unbegrenzt | ? | ✓ | ✓ | ✗ |
| Quba Desktop | 0,00 € einmalig | ◐ | ✓ | ✓ | ? | ◐ | ? | ? | ? | ? | ✓ |

## Unknowns and conditions

- **lexware-office-s / datev_export** — unknown: Die Preisseite nennt Steuerberater-Zugang und elektronische Pendelakte, aber kein konkretes DATEV-Exportformat.
- **lexware-office-m / datev_export** — unknown: Die Preisseite nennt Steuerberater-Zugang und elektronische Pendelakte, aber kein konkretes DATEV-Exportformat.
- **lexware-office-l / datev_export** — unknown: Die Preisseite nennt Steuerberater-Zugang und elektronische Pendelakte, aber kein konkretes DATEV-Exportformat.
- **lexware-office-xl / datev_export** — unknown: Die Preisseite nennt Steuerberater-Zugang und elektronische Pendelakte, aber kein konkretes DATEV-Exportformat.
- **sevdesk-buchhaltung / raw_xml_export** — unknown: Ob die Original-XML wieder heruntergeladen werden kann, ist auf den geprüften Seiten nicht beschrieben.
- **sevdesk-buchhaltung-pro / raw_xml_export** — unknown: Ob die Original-XML wieder heruntergeladen werden kann, ist auf den geprüften Seiten nicht beschrieben.
- **quba-desktop / receive_xrechnung** — conditional: Für Quba 1.x dokumentiert; für 2.0 nicht ausdrücklich bestätigt – an Tag 4 mit Testdatei prüfen.
- **quba-desktop / send_zugferd** — conditional: Nur wenn bereits eine PDF/A-Rechnung (z. B. aus Word/LibreOffice) vorliegt; erzeugt eine Datei, versendet nichts.
- **quba-desktop / send_xrechnung** — unknown: Erstellung von XRechnung-XML ist für Quba 2.0 nicht dokumentiert.
- **quba-desktop / send_quota** — unknown: Keine Mengenangabe dokumentiert (lokales Programm).
- **quba-desktop / raw_xml_export** — unknown: README zeigt die XML-Ansicht; ein Speichern/Export der XML wird nicht beschrieben.
- **quba-desktop / datev_export** — unknown: Nicht dokumentiert.
- **quba-desktop / bookkeeping_euer** — unknown: Nicht dokumentiert (Anzeige-/Prüfprogramm).

## Price conflicts and promotions

- ⚠ Tarifkarte zeigt diesen Listenpreis; die Vergleichstabelle derselben Seite nennt abweichende 'ab'-Preise (Rechnung 12,90 €, Buchhaltung 25,90 €, Pro 34,90 € bei 24 Monaten). Manuell klären.
- Promo (not applied in totals): 50 % Rabatt für 3 Monate (Aktion auf der Preisseite) — plans: lexware-office-s, lexware-office-m, lexware-office-l, lexware-office-xl
- Promo (not applied in totals): Aktionspreis 'Black Cyber Deal' (Dauer und Bedingungen nicht angegeben) — plans: sevdesk-rechnung, sevdesk-buchhaltung, sevdesk-buchhaltung-pro

## Sources

- `src-lexware-preise` — [Lexware Office Preise & Produktvergleich zu den Versionen](https://office.lexware.de/preise/) — Lexware (Haufe Group); published n/a; verified 2026-11-11; method webfetch+raw_html. Preise S/M/L/XL pro Monat zzgl. MwSt., monatlich kündbar, 'Keine Extrakosten'. Aktion: 50 % Rabatt für 3 Monate (Bedingungen nicht angegeben). Versionsvergleich (Häkchen aus dem HTML derselben URL gelesen): E-Rechnung erfassen S–XL; E-Rechnungen erstellen/übermitteln (ZUGFeRD, XRechnung) M–XL; EÜR ab L; Public API nur XL; Steuerberater-Zugang S–XL.
- `src-lexware-help-erfassen` — [So einfach erfasst du E-Rechnungen in Lexware Office](https://help.lexware.de/de-form/articles/548951-so-einfach-erfasst-du-e-rechnungen-in-lexware-office) — Lexware Office Help Center; published 2026-09-04; verified 2026-11-11; method webfetch. Empfang: EN-16931-XML inkl. XRechnung 3.0.1 (CII und UBL) und ZUGFeRD ab 2.0; ältere Versionen werden abgelehnt; Validierung beim Upload; Original-XML über Symbol <> herunterladbar.
- `src-lexware-help-versenden` — [E-Rechnungen versenden und empfangen](https://help.lexware.de/de-form/articles/547942-e-rechnungen-versenden-und-empfangen) — Lexware Office Help Center; published 2026-08-28; verified 2026-11-11; method webfetch. Versand per E-Mail aus Lexware Office oder eigenem Mailprogramm; Anhang als PDF (ZUGFeRD) oder XML (XRechnung); empfangene XML wird unverändert gespeichert.
- `src-lexware-fair-usage` — [Fair Usage Policy](https://help.lexware.de/de-form/articles/548714-fair-usage-policy) — Lexware Office Help Center; published 2026-07-28; verified 2026-11-11; method webfetch. Höchstgrenzen je Kundenkonto: bis 50.000 Belege (Ein-/Ausgang) pro Kalenderjahr; bis 20 Ausgangsbelege je Minute.
- `src-sevdesk-preise` — [sevdesk Kosten im Überblick | Alle Preise & Tarife](https://sevdesk.de/preise/) — sevdesk; published n/a; verified 2026-11-11; method webfetch+raw_html. Tarife Kostenlos/Rechnung/Buchhaltung/Buchhaltung Pro; Laufzeiten 1/12/24 Monate; Preise zzgl. MwSt. Listenpreise auf den Tarifkarten: monatlich 11,90/25,90/34,90 €, jährlich 9,90/22,90/30,90 €, 24 Monate 8,90/19,90/27,90 € pro Monat. Aktionspreise 4,45/9,95/13,95 € ('Black Cyber Deal', Dauer/Bedingungen nicht angegeben). WIDERSPRUCH: Vergleichstabelle derselben Seite nennt 'ab' 12,90/25,90/34,90 € (24 Monate). Vergleichstabelle (HTML): Empfang von E-Rechnungen nicht in 'Rechnung', ja in Buchhaltung/Pro; DATEV-Export in allen kostenpflichtigen Tarifen; REST-API nur Pro.
- `src-sevdesk-e-rechnung` — [E-Rechnung Software | sevdesk](https://sevdesk.de/e-rechnung-software/) — sevdesk; published n/a; verified 2026-11-11; method webfetch. Erstellen in ZUGFeRD oder XRechnung (EN 16931); Empfang: Upload als XRechnung oder ZUGFeRD, automatische Validierung; Versionen/Profile nicht angegeben. Nach 14-Tage-Test 'kostenlos im Free Tarif'.
- `src-sevdesk-affiliate` — [Werde sevdesk Affiliate-Partner!](https://sevdesk.de/affiliate-partner-werden/) — sevdesk; published n/a; verified 2026-11-11; method webfetch. Programm über Awin; bis zu 30 € (Rechnung), 95 € (Buchhaltung), 200 € (Buchhaltung Pro) Provision.
- `src-awin-lexware` — [Awin | Lexware Office DE Partnerprogramm](https://ui.awin.com/merchant-profile/13787/commission-groups) — Awin; published n/a; verified 2026-11-11; method webfetch. Attributionszeitraum 60 Tage; Sale ab 55 € (Standard für alle Publisher); Auszahlung nach spätestens 3 Monaten, Bedingung: keine Kündigung.
- `src-quba-readme` — [Mustang Quba 2.0.0 – README](https://raw.githubusercontent.com/ZUGFeRD/quba-viewer/master/README.md) — ZUGFeRD / Mustangproject (GitHub); published n/a; verified 2026-11-11; method webfetch. Kostenfreie Desktop-App (Windows, macOS, Linux), Apache License 2.0; erstellt ZUGFeRD aus einer PDF(/A-3)-Rechnung plus Formulardaten und prüft eigene/fremde E-Rechnungen, XML-Ansicht. Hinweis: Download-Links im README zeigen noch auf OpenIndex Quba 1.3.2.
- `src-quba-releases` — [Releases · ZUGFeRD/quba-viewer](https://github.com/ZUGFeRD/quba-viewer/releases) — ZUGFeRD / Mustangproject (GitHub); published 2026-10-15; verified 2026-11-11; method webfetch. 2.0.0 (15.10.2026): Offline-Validierung, Erstellung von Factur-X/ZUGFeRD wenn eine PDF/A-Basisdatei vorhanden ist. 1.5.0-Notiz: Reader für XRechnung, Factur-X/ZUGFeRD, CII, UBL.
- `src-quba-home` — [Quba-Viewer – Quba E-Invoice Viewer](https://quba-viewer.org/) — Quba / Mustangproject; published n/a; verified 2026-11-11; method webfetch. 'Open-source / Kostenlos / Cross-Platform'; Quba 2.0 am 15.10.2026 veröffentlicht.

## Affiliate programmes (commercial metadata, never used for ranking)

- lexware-office via Awin: **not_applied** — Sale: ab 55 € (Standard für alle Publisher); 60 Tage Attribution; Auszahlung nach spätestens 3 Monaten, wenn keine Kündigung erfolgt. (source `src-awin-lexware`)
- sevdesk via Awin: **not_applied** — Bis zu 30 € (Rechnung), 95 € (Buchhaltung), 200 € (Buchhaltung Pro); abhängig von Tarif und Laufzeit. (source `src-sevdesk-affiliate`)
