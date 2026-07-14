# Waschplan App

Schlanke Waschraum-Buchungsapp fuer GBMZ Maneggplatz 18.

## GBMZ-Regeln

- Slots: `07:00-12:00`, `12:00-17:00`, `17:00-21:00`.
- Waschmaschinen: pro Waschtag ist nur ein Slot erlaubt; mehrere Waschmaschinen sind nur im gleichen Slot moeglich.
- Der naechste Waschslot kann fruehestens am bestehenden Waschtag reserviert werden.
- Tumbler: Pro Slot bleibt mindestens ein Tumbler frei.
- Trockenraum: Beim `07:00-12:00`-Slot bis maximal `21:00`, beim `12:00-17:00`-Slot bis maximal Folgetag `12:00`, beim `17:00-21:00`-Slot ebenfalls bis maximal Folgetag `12:00`.
- Reinigung: Waschmaschinen, Tumbler, Trockenraeume, Waschkueche, Besen und Wischmop muessen gemaess GBMZ-Aushang sauber hinterlassen werden.

## Feste Buchungen

Admins koennen wiederkehrende feste Buchungen fuer einen Wochentag, Slot und ein konkretes Geraet hinterlegen. Diese Buchungen erscheinen im Plan als geschuetzt und blockieren normale Buchungsversuche serverseitig.

## Lokal starten

```bash
npm install
npm start
```

Dann im Browser oeffnen:

```text
http://localhost:3000
```

## Start-Logins

- Admin: `admin` / `admin123`
- Nutzer: `user` / `user123`

## Registrierung

Neue Bewohner koennen auf der Loginseite selbst ein Konto erstellen. Dafuer ist ein Hauscode erforderlich. Der Standard ist:

```text
GBMZ Maneggplatz 18
```

Der Admin kann den Hauscode in der App aendern. Alternativ kann beim Start `HOUSE_CODE` gesetzt werden.

## E-Mail-Benachrichtigungen

Bewohner koennen eine E-Mail-Adresse hinterlegen und Freigabe-Hinweise aktivieren. Wenn jemand eine eigene Buchung frueher freigibt, erhalten aktive Nutzer mit aktivierter Benachrichtigung eine Mail.

Ohne SMTP-Konfiguration bleibt die App normal nutzbar; es werden dann nur keine E-Mails verschickt. Fuer den Versand werden diese Umgebungsvariablen genutzt:

- `PUBLIC_APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` fuer SMTPS/Port 465, sonst STARTTLS wenn vom Server angeboten)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## Render

Die App ist fuer Render vorbereitet. `render.yaml` richtet einen persistenten Disk unter `/var/data` ein und speichert SQLite dort in `/var/data/washraum.sqlite`.
