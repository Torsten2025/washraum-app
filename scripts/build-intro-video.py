import asyncio
import importlib
import math
import os
import re
import shutil
import ssl
import subprocess
import tempfile
from pathlib import Path

import certifi
import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "intro"
SCENE_IMAGES = OUTPUT / "scenes"
WIDTH, HEIGHT = 1280, 720
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "de-CH-LeniNeural"

CHAPTERS = [
    {
        "title": "Erst Überblick, dann buchen",
        "kicker": "01  START",
        "accent": "#00A873",
        "cards": [("FARBSTREIFEN", "WM, TR und Tumbler getrennt"), ("KALENDER", "Woche oder Monat"), ("TAGESVORSCHAU", "Kurz verweilen und vergrößern")],
        "speech": "Hallo und willkommen bei WaschZeit. Nach dem Einloggen landest du direkt in deiner Hausansicht. Oben stehen deine nächsten Buchungen. Direkt darunter zeigt der Kalender drei beschriftete Farbstreifen für Waschmaschinen, Trockenräume und Tumbler. Grün bedeutet frei, Gelb teilweise belegt und Rot voll belegt. Du kannst zwischen Woche und Monat wechseln. Wenn du mit der Maus kurz auf einem Tag bleibst, öffnet sich eine vergrößerte Tagesansicht mit allen Zeitfenstern und Geräten. Mit der Tastatur erscheint sie beim Fokus und auf dem Smartphone durch Antippen. Ein empfohlener Termin ist im passenden Tag mit Empfohlen und Buchen markiert. Ein Klick darauf öffnet direkt das Zeitfenster und die Waschmaschinenwahl.",
    },
    {
        "title": "Zeit oder Maschine zuerst",
        "kicker": "02  SCHLAU BUCHEN",
        "accent": "#EF6B4D",
        "cards": [("ZEIT ZUERST", "Uhrzeit und Verfügbarkeit"), ("MASCHINE ZUERST", "Bewährte Alternative"), ("DEINE WAHL", "Wird im Konto gespeichert")],
        "speech": "In den Tagesdetails siehst du für jedes Zeitfenster, welche Geräte frei, belegt oder bereits von dir gebucht sind. Standardmäßig steht die Zeit im Mittelpunkt. Du wählst zuerst zwischen sieben, zwölf und siebzehn Uhr und siehst dabei sofort, wie viele Waschmaschinen, Trockenräume und Tumbler zur Auswahl stehen. Danach wählst du eine oder mehrere Waschmaschinen und ergänzt bei Bedarf die Trocknung. Wenn dir eine bestimmte Maschine wichtiger ist, wechselst du zu Maschine zuerst. Beide Wege führen zum gleichen Waschpaket, und die App merkt sich deine Auswahl im Benutzerkonto.",
    },
    {
        "title": "Trocknung Schritt für Schritt",
        "kicker": "03  WASCHPAKET",
        "accent": "#2E6688",
        "cards": [("TROCKENRAUM", "Passend und optional"), ("DAUER", "Kurz bis maximal erlaubt"), ("TUMBLER", "Bei Bedarf ergänzen")],
        "speech": "Erst nach der Waschmaschinenwahl zeigt die App passende Trockenräume. Du kannst den Trockenraum auslassen oder eine verfügbare Dauer wählen. Danach folgt der Tumbler. Auch er ist optional, und die App achtet darauf, dass mindestens ein Tumbler für das Haus frei bleibt. Im letzten Schritt siehst du Datum, Zeitfenster und alle gewählten Bestandteile. Erst mit Waschpaket buchen wird alles gemeinsam gespeichert. Unter Meine Buchungen erscheint es als Paket. Für eine einzelne Nutzung bleibt der nachgeordnete Bereich Einzelnes Gerät separat buchen erhalten.",
    },
    {
        "title": "Die Waschmaschinen fair nutzen",
        "kicker": "04  WASCHEN",
        "accent": "#DCA33C",
        "cards": [("EIN TAG", "Nur ein Zeitfenster"), ("MEHRERE WM", "Im selben Zeitfenster möglich"), ("NÄCHSTER TAG", "Frühestens am Waschtag buchen")],
        "speech": "Für die Waschmaschinen gilt eine einfache Grundregel: Pro Waschtag reservierst du nur ein Zeitfenster. Wenn du zwei oder drei Maschinen brauchst, darfst du sie innerhalb dieses einen Zeitfensters gemeinsam buchen. Ein zweiter Slot am selben Tag ist nicht erlaubt. Einen weiteren zukünftigen Waschtag kannst du frühestens an deinem bereits gebuchten Waschtag reservieren. So bleiben die Termine im Haus besser verteilt. Sonntags sind keine Buchungen möglich. Bei einem Konflikt erklärt die App in normaler Sprache, welche Regel greift und was du stattdessen tun kannst.",
    },
    {
        "title": "Trockenraum passend zum Waschslot",
        "kicker": "05  TROCKNEN",
        "accent": "#00A873",
        "cards": [("07:00", "höchstens bis 21:00"), ("12:00", "höchstens bis morgen 12:00"), ("17:00", "höchstens bis morgen 12:00")],
        "speech": "Der Trockenraum gehört immer zu einer passenden Waschmaschinenbuchung. Wenn du von sieben bis zwölf Uhr wäschst, darfst du den Raum höchstens bis einundzwanzig Uhr nutzen. Beim Slot von zwölf bis siebzehn Uhr endet die maximale Nutzung am nächsten Tag um zwölf Uhr. Das gilt auch für den Abend-Slot von siebzehn bis einundzwanzig Uhr. Im Waschpaket wählst du bewusst eine kürzere oder die maximal mögliche Dauer. Kürzer ist oft besser: Wenn die Wäsche trocken ist, gib den Raum direkt frei. Über Nacht hilft es besonders, am nächsten Morgen vor sieben Uhr abzuhängen.",
    },
    {
        "title": "Tumbler mit Reserve buchen",
        "kicker": "06  TUMBLER",
        "accent": "#EF6B4D",
        "cards": [("EINER BLEIBT FREI", "Reserve fuer das Haus"), ("GLEICHER SLOT", "Passend zur Waschmaschine"), ("FAIR VERTEILT", "Nicht alles blockieren")],
        "speech": "Bei den Tumblern gilt: Am Ende eines Waschslots muss mindestens ein Tumbler frei bleiben. Deshalb kann die App eine weitere Tumblerbuchung ablehnen, obwohl noch ein Gerät sichtbar ist. Der Tumbler gehört zum gleichen Zeitfenster wie deine Waschmaschine. Wenn du keinen Tumbler brauchst, lässt du ihn einfach weg. So bleibt für spontane Fälle im Haus immer eine kleine Reserve. Wenn ein Tumbler oder ein Raum gesperrt ist, zeigt die App das an und verhindert neue Buchungen auf dieser Ressource.",
    },
    {
        "title": "Freigeben, Push antippen, buchen",
        "kicker": "07  HINWEISE",
        "accent": "#DCA33C",
        "cards": [("FRÜHER FREI", "Im laufenden Slot"), ("ABSAGEN", "Vor Beginn informieren"), ("PUSH", "Antippen und buchen")],
        "speech": "Wenn du während deines gebuchten Slots früher fertig bist, wählst du Früher frei. Vor Beginn nutzt du Absagen und informieren. Das normale Löschen entfernt nur deine Buchung und sendet keine Nachricht. Wer Push auf dem Handy aktiviert hat, bekommt eine neutrale Meldung, zum Beispiel: Liliane hat Waschmaschine zwei freigegeben. Die Nachricht geht nicht an die Person, die selbst freigibt. Tippst du auf die Push-Nachricht, öffnet WaschZeit direkt ein Detailfenster. Dort siehst du, wer freigegeben hat, welches Gerät, Datum und Slot betroffen sind, und ob du den Termin buchen willst. Ist der Slot inzwischen schon weg, zeigt die App das sauber an. E-Mail bleibt als Fallback möglich, wenn Adresse und Hinweise passen.",
    },
    {
        "title": "Sauber abschließen",
        "kicker": "08  DANKE",
        "accent": "#2E6688",
        "cards": [("MASCHINEN", "Trommel, Dichtungen und Filter"), ("RÄUME", "Tische, Böden und Abflussbereich"), ("MOPP", "Spülen, auswringen, aufhängen")],
        "speech": "Zum Schluss gehört die Reinigung zu jeder Nutzung, auch zu einem einzelnen Waschgang zwischendurch. Bei der Waschmaschine werden Waschmittelschublade, Trommel, Gummidichtung, Filter und Gehäuse gereinigt. Beim Tumbler sind Trommel, alle vier Filter, der Abflussbereich unter den mittleren Filtern, die Türdichtung und das Gehäuse dran. Im Trockenraum reinigst du Tisch, beide Filter und den Boden. Auch Waschraum, Besen und Wischmopp werden sauber hinterlassen. Den Mopp gut ausspülen, auswringen und zum Trocknen aufhängen. Maßgebend bleibt der offizielle GBMZ-Aushang. Danach kannst du das kurze Quiz ausprobieren. Es ist freundlich gemeint und keine Zugangshürde.",
    },
]


# Jeder Sprecherabschnitt besitzt eine eigene, inhaltlich passende Szene. Reale
# App-Aufnahmen werden bevorzugt; nur reine Regelhinweise nutzen eine reduzierte
# Erklaergrafik. So bleibt das Bild waehrend der Erklaerung eindeutig.
SCENES = [
    [
        {
            "title": "Direkt in deiner Hausansicht",
            "image": "app-overview.png",
            "points": ["Naechste Buchungen oben", "Kalender direkt darunter"],
            "speech": "Hallo und willkommen bei WaschZeit. Nach dem Einloggen landest du direkt in deiner Hausansicht. Oben stehen deine naechsten Buchungen.",
        },
        {
            "title": "Drei Bereiche auf einen Blick",
            "image": "app-overview.png",
            "points": ["Waschmaschinen", "Trockenraeume", "Tumbler"],
            "speech": "Direkt darunter zeigt der Kalender drei beschriftete Farbstreifen fuer Waschmaschinen, Trockenraeume und Tumbler. Gruen bedeutet frei, Gelb teilweise belegt und Rot voll belegt. Du kannst zwischen Woche und Monat wechseln.",
        },
        {
            "title": "Tag oeffnen und Details sehen",
            "image": "booking-time.png",
            "points": ["Maus: kurz verweilen", "Handy: Tag antippen", "Tastatur: Fokus"],
            "speech": "Wenn du mit der Maus kurz auf einem Tag bleibst, oeffnet sich eine vergroesserte Tagesansicht mit allen Zeitfenstern und Geraeten. Mit der Tastatur erscheint sie beim Fokus und auf dem Smartphone durch Antippen.",
        },
        {
            "title": "Von der Empfehlung ins Waschpaket",
            "image": "booking-time-focused.png",
            "points": ["Empfohlen und Buchen", "Direkt zur Maschinenwahl"],
            "speech": "Ein empfohlener Termin ist im passenden Tag mit Empfohlen und Buchen markiert. Ein Klick darauf oeffnet direkt das Zeitfenster und die Waschmaschinenwahl.",
        },
    ],
    [
        {
            "title": "Zeitfenster zuerst",
            "image": "booking-time-focused.png",
            "points": ["07:00 bis 12:00", "12:00 bis 17:00", "17:00 bis 21:00"],
            "speech": "In den Tagesdetails siehst du fuer jedes Zeitfenster, welche Geraete frei, belegt oder bereits von dir gebucht sind. Standardmaessig steht die Zeit im Mittelpunkt. Du waehlst zuerst zwischen sieben, zwoelf und siebzehn Uhr und siehst dabei sofort, wie viele Waschmaschinen, Trockenraeume und Tumbler zur Auswahl stehen.",
        },
        {
            "title": "Danach die Maschinen",
            "image": "booking-washers-focused.png",
            "points": ["Eine oder mehrere Waschmaschinen", "Trocknung danach optional"],
            "speech": "Danach waehlst du eine oder mehrere Waschmaschinen und ergaenzt bei Bedarf die Trocknung.",
        },
        {
            "title": "Dein bevorzugter Buchungsweg",
            "image": "settings-profile.png",
            "points": ["Zeit zuerst", "Maschine zuerst", "Auswahl wird gespeichert"],
            "speech": "Wenn dir eine bestimmte Maschine wichtiger ist, wechselst du zu Maschine zuerst. Beide Wege fuehren zum gleichen Waschpaket, und die App merkt sich deine Auswahl im Benutzerkonto.",
        },
    ],
    [
        {
            "title": "Trockenraum passend ergaenzen",
            "image": "booking-drying-focused.png",
            "points": ["Optional", "Nur passende Raeume", "Erlaubte Dauer sichtbar"],
            "speech": "Erst nach der Waschmaschinenwahl zeigt die App passende Trockenraeume. Du kannst den Trockenraum auslassen oder eine verfuegbare Dauer waehlen.",
        },
        {
            "title": "Tumbler nur bei Bedarf",
            "image": "booking-tumbler-focused.png",
            "points": ["Optional", "Ein Tumbler bleibt frei"],
            "speech": "Danach folgt der Tumbler. Auch er ist optional, und die App achtet darauf, dass mindestens ein Tumbler fuer das Haus frei bleibt.",
        },
        {
            "title": "Paket pruefen und gemeinsam buchen",
            "image": "booking-tumbler.png",
            "points": ["Datum und Zeitfenster", "Alle Bestandteile", "Gemeinsam speichern"],
            "speech": "Im letzten Schritt siehst du Datum, Zeitfenster und alle gewaehlten Bestandteile. Erst mit Waschpaket buchen wird alles gemeinsam gespeichert.",
        },
        {
            "title": "Danach unter Meine Buchungen",
            "image": "app-overview.png",
            "points": ["Waschpaket erscheint zusammen", "Einzelbuchung bleibt moeglich"],
            "speech": "Unter Meine Buchungen erscheint es als Paket. Fuer eine einzelne Nutzung bleibt der nachgeordnete Bereich Einzelnes Geraet separat buchen erhalten.",
        },
    ],
    [
        {
            "title": "Ein Waschtag, ein Zeitfenster",
            "image": "booking-washers-focused.png",
            "points": ["Nur ein Slot pro Tag", "Mehrere Maschinen im selben Slot"],
            "speech": "Fuer die Waschmaschinen gilt eine einfache Grundregel: Pro Waschtag reservierst du nur ein Zeitfenster. Wenn du zwei oder drei Maschinen brauchst, darfst du sie innerhalb dieses einen Zeitfensters gemeinsam buchen. Ein zweiter Slot am selben Tag ist nicht erlaubt.",
        },
        {
            "title": "Naechsten Waschtag fair planen",
            "image": "booking-time-focused.png",
            "points": ["Erst am bestehenden Waschtag", "Sonntag bleibt Ruhetag"],
            "speech": "Einen weiteren zukuenftigen Waschtag kannst du fruehestens an deinem bereits gebuchten Waschtag reservieren. So bleiben die Termine im Haus besser verteilt. Sonntags sind keine Buchungen moeglich.",
        },
        {
            "title": "Die App erklaert Konflikte",
            "image": "app-overview.png",
            "points": ["Regel wird genannt", "Naechster Schritt bleibt klar"],
            "speech": "Bei einem Konflikt erklaert die App in normaler Sprache, welche Regel greift und was du stattdessen tun kannst.",
        },
    ],
    [
        {
            "title": "Morgens: hoechstens bis 21 Uhr",
            "image": "booking-drying-focused.png",
            "points": ["Waschen 07:00 bis 12:00", "Trockenraum maximal bis 21:00"],
            "speech": "Der Trockenraum gehoert immer zu einer passenden Waschmaschinenbuchung. Wenn du von sieben bis zwoelf Uhr waeschst, darfst du den Raum hoechstens bis einundzwanzig Uhr nutzen.",
        },
        {
            "title": "Spaetere Slots: bis morgen 12 Uhr",
            "image": "booking-drying-focused.png",
            "points": ["12:00 bis 17:00", "17:00 bis 21:00", "Ende am Folgetag 12:00"],
            "speech": "Beim Slot von zwoelf bis siebzehn Uhr endet die maximale Nutzung am naechsten Tag um zwoelf Uhr. Das gilt auch fuer den Abend-Slot von siebzehn bis einundzwanzig Uhr.",
        },
        {
            "title": "Kuerzer waehlen und frueh freigeben",
            "image": "release-dialog.png",
            "points": ["Passende Dauer waehlen", "Bei trockener Waesche freigeben", "Morgens vor 07:00 abhaengen"],
            "speech": "Im Waschpaket waehlst du bewusst eine kuerzere oder die maximal moegliche Dauer. Kuerzer ist oft besser: Wenn die Waesche trocken ist, gib den Raum direkt frei. Ueber Nacht hilft es besonders, am naechsten Morgen vor sieben Uhr abzuhaengen.",
        },
    ],
    [
        {
            "title": "Ein Tumbler bleibt als Reserve frei",
            "image": "booking-tumbler-focused.png",
            "points": ["Nicht beide blockieren", "Ablehnung trotz sichtbarem Geraet moeglich"],
            "speech": "Bei den Tumblern gilt: Am Ende eines Waschslots muss mindestens ein Tumbler frei bleiben. Deshalb kann die App eine weitere Tumblerbuchung ablehnen, obwohl noch ein Geraet sichtbar ist.",
        },
        {
            "title": "Nur im gleichen Waschslot",
            "image": "booking-tumbler.png",
            "points": ["Passend zur Waschmaschine", "Ohne Tumbler einfach fortfahren"],
            "speech": "Der Tumbler gehoert zum gleichen Zeitfenster wie deine Waschmaschine. Wenn du keinen Tumbler brauchst, laesst du ihn einfach weg. So bleibt fuer spontane Faelle im Haus immer eine kleine Reserve.",
        },
        {
            "title": "Gesperrte Geraete sind nicht buchbar",
            "image": "app-overview.png",
            "points": ["Sperrung wird angezeigt", "Neue Buchung wird verhindert"],
            "speech": "Wenn ein Tumbler oder ein Raum gesperrt ist, zeigt die App das an und verhindert neue Buchungen auf dieser Ressource.",
        },
    ],
    [
        {
            "title": "Drei unterschiedliche Aktionen",
            "image": None,
            "points": ["Frueher frei: im laufenden Slot", "Absagen und informieren: vor Beginn", "Loeschen: ohne Nachricht"],
            "speech": "Wenn du waehrend deines gebuchten Slots frueher fertig bist, waehlst du Frueher frei. Vor Beginn nutzt du Absagen und informieren. Das normale Loeschen entfernt nur deine Buchung und sendet keine Nachricht.",
        },
        {
            "title": "Mitteilung mit Name und Termin",
            "image": "message-center.png",
            "points": ["Neutral formuliert", "Nicht an die freigebende Person"],
            "speech": "Wer Push auf dem Handy aktiviert hat, bekommt eine neutrale Meldung, zum Beispiel: Liliane hat Waschmaschine zwei freigegeben. Die Nachricht geht nicht an die Person, die selbst freigibt.",
        },
        {
            "title": "Antippen und direkt entscheiden",
            "image": "release-dialog.png",
            "points": ["Person und Geraet", "Datum und Slot", "Direkt buchen"],
            "speech": "Tippst du auf die Push-Nachricht, oeffnet WaschZeit direkt ein Detailfenster. Dort siehst du, wer freigegeben hat, welches Geraet, Datum und Slot betroffen sind, und ob du den Termin buchen willst. Ist der Slot inzwischen schon weg, zeigt die App das sauber an.",
        },
        {
            "title": "Push schnell, E-Mail als Fallback",
            "image": "settings-notifications.png",
            "points": ["Bereich filtern", "Wochentag waehlen", "Zeitfenster eingrenzen"],
            "speech": "E-Mail bleibt als Fallback moeglich, wenn Adresse und Hinweise passen.",
        },
    ],
    [
        {
            "title": "Waschmaschine reinigen",
            "image": "cleaning-tasks.png",
            "crop": (0.0, 0.0, 0.34, 1.0),
            "points": ["Waschmittelschublade", "Trommel und Dichtung", "Filter und Gehaeuse"],
            "speech": "Zum Schluss gehoert die Reinigung zu jeder Nutzung, auch zu einem einzelnen Waschgang zwischendurch. Bei der Waschmaschine werden Waschmittelschublade, Trommel, Gummidichtung, Filter und Gehaeuse gereinigt.",
        },
        {
            "title": "Tumblerfilter sauber machen",
            "image": "cleaning-tasks.png",
            "crop": (0.33, 0.0, 0.68, 1.0),
            "points": ["Trommel", "Alle vier Filter", "Abflussbereich und Tuerdichtung"],
            "speech": "Beim Tumbler sind Trommel, alle vier Filter, der Abflussbereich unter den mittleren Filtern, die Tuerdichtung und das Gehaeuse dran.",
        },
        {
            "title": "Raum und Wischmopp hinterlassen",
            "image": "cleaning-tasks.png",
            "crop": (0.66, 0.0, 1.0, 1.0),
            "points": ["Tisch, Filter und Boden", "Besen und Waschraum", "Mopp ausspuelen und aufhaengen"],
            "speech": "Im Trockenraum reinigst du Tisch, beide Filter und den Boden. Auch Waschraum, Besen und Wischmopp werden sauber hinterlassen. Den Mopp gut ausspuelen, auswringen und zum Trocknen aufhaengen.",
        },
        {
            "title": "Danach bist du startklar",
            "image": "cleaning-tasks.png",
            "points": ["GBMZ-Aushang bleibt massgebend", "Quiz ist freiwillig"],
            "speech": "Massgebend bleibt der offizielle GBMZ-Aushang. Danach kannst du das kurze Quiz ausprobieren. Es ist freundlich gemeint und keine Zugangshuerde.",
        },
    ],
]


def configure_ssl_trust():
    if os.name != "nt":
        return
    certificates = [Path(certifi.where()).read_text(encoding="utf-8")]
    seen = set()
    for store in ("ROOT", "CA"):
        for certificate, encoding, _trust in ssl.enum_certificates(store):
            if encoding != "x509_asn" or certificate in seen:
                continue
            seen.add(certificate)
            certificates.append(ssl.DER_cert_to_PEM_cert(certificate))
    bundle = Path(tempfile.gettempdir()) / "waschzeit-windows-ca-bundle.pem"
    bundle.write_text("\n".join(certificates), encoding="ascii")
    os.environ["SSL_CERT_FILE"] = str(bundle)
    communicate_module = importlib.import_module("edge_tts.communicate")
    communicate_module._SSL_CTX = ssl.create_default_context(cafile=str(bundle))


def font(size, bold=False):
    name = "seguisb.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def rounded(draw, box, fill, radius=8, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap(draw, text, used_font, max_width):
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=used_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


GERMAN_WORDS = {
    "Naechste": "Nächste", "naechste": "nächste", "naechsten": "nächsten",
    "Standardmaessig": "Standardmässig",
    "Geraete": "Geräte", "Geraeten": "Geräten", "Geraet": "Gerät",
    "Trockenraeume": "Trockenräume", "Trockenraume": "Trockenräume",
    "Raeume": "Räume", "Spaetere": "Spätere", "ergaenzt": "ergänzt",
    "ergaenzen": "ergänzen", "moegliche": "mögliche", "Zugangshuerde": "Zugangshürde",
    "Gruen": "Grün", "oeffnet": "öffnet", "oeffnen": "öffnen",
    "vergroesserte": "vergrößerte", "persoenlicher": "persönlicher",
    "persoenliche": "persönliche", "fuehrt": "führt", "fuer": "für",
    "waehlst": "wählst", "waehlen": "wählen", "waehlt": "wählt",
    "waehlst": "wählst", "zwoelf": "zwölf", "verfuegbare": "verfügbare",
    "moeglich": "möglich", "gewaehlten": "gewählten", "zukuenftigen": "zukünftigen",
    "fruehestens": "frühestens", "erklaert": "erklärt", "gehoert": "gehört",
    "waeschst": "wäschst", "hoechstens": "höchstens", "kuerzere": "kürzere",
    "Kuerzer": "Kürzer", "kuerzer": "kürzer", "Waesche": "Wäsche",
    "Ueber": "Über", "abzuhaengen": "abzuhängen", "laesst": "lässt",
    "Faelle": "Fälle", "waehrend": "während", "frueher": "früher",
    "Frueher": "Früher", "Loeschen": "Löschen", "Tuerdichtung": "Türdichtung",
    "Gehaeuse": "Gehäuse", "spuelen": "spülen", "ausspuelen": "ausspülen",
    "aufhaengen": "aufhängen", "Erklaergrafik": "Erklärgrafik",
}


def german_text(value):
    result = value
    for source, target in GERMAN_WORDS.items():
        result = re.sub(rf"\b{source}\b", target, result)
    return result


def scene_source(scene):
    source = Image.open(SCENE_IMAGES / scene["image"]).convert("RGB")
    if scene.get("crop"):
        left, top, right, bottom = scene["crop"]
        source = source.crop((
            round(source.width * left), round(source.height * top),
            round(source.width * right), round(source.height * bottom),
        ))
    return source


def draw_scene_image(canvas, draw, scene, box, accent):
    left, top, right, bottom = box
    rounded(draw, box, "#E4ECE8", radius=14)
    inner_box = (left + 12, top + 12, right - 12, bottom - 12)
    if scene.get("image"):
        source = scene_source(scene)
        fitted = ImageOps.contain(
            source,
            (inner_box[2] - inner_box[0], inner_box[3] - inner_box[1]),
            method=Image.Resampling.LANCZOS,
        )
        x = inner_box[0] + (inner_box[2] - inner_box[0] - fitted.width) // 2
        y = inner_box[1] + (inner_box[3] - inner_box[1] - fitted.height) // 2
        canvas.paste(fitted, (x, y))
        draw.rounded_rectangle((x, y, x + fitted.width, y + fitted.height), radius=8, outline="#B7C7C0", width=2)
        return

    # Fuer reine Bedienregeln zeigt die Szene die tatsaechlichen drei Aktionen
    # als grosse App-Schaltflaechen statt eines beliebigen Symbolbildes.
    action_top = top + 58
    for index, point in enumerate(scene["points"]):
        item_top = action_top + index * 126
        rounded(draw, (left + 56, item_top, right - 56, item_top + 94), "#FFFFFF", radius=9, outline="#C9D6D1", width=2)
        draw.ellipse((left + 78, item_top + 24, left + 124, item_top + 70), fill=accent)
        draw.text((left + 101, item_top + 47), str(index + 1), anchor="mm", font=font(18, True), fill="#FFFFFF")
        point_lines = wrap(draw, german_text(point), font(22, True), right - left - 250)
        line_y = item_top + 23
        for line in point_lines[:2]:
            draw.text((left + 148, line_y), line, font=font(22, True), fill="#10201B")
            line_y += 28


def build_slide(chapter, scene, chapter_number, scene_number, destination):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#F4F8F6")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 82), fill="#10201B")
    draw.text((42, 24), "Wasch", font=font(25, True), fill="#FFFFFF")
    draw.text((116, 24), "Zeit", font=font(25, True), fill="#00CD83")
    draw.text((1030, 31), f"KAPITEL {chapter_number}/{len(CHAPTERS)}", font=font(15, True), fill="#BBD0C8")
    draw.rectangle((0, 82, 12, HEIGHT), fill=chapter["accent"])

    image_box = (34, 108, 878, 654)
    draw_scene_image(image, draw, scene, image_box, chapter["accent"])

    panel = (906, 108, 1248, 654)
    rounded(draw, panel, "#FFFFFF", radius=12, outline="#D4DFDA", width=2)
    draw.text((932, 136), german_text(chapter["kicker"]), font=font(14, True), fill=chapter["accent"])
    draw.text((932, 163), f"SZENE {scene_number}/{len(SCENES[chapter_number - 1])}", font=font(12, True), fill="#71817B")

    title_lines = wrap(draw, german_text(scene["title"]), font(31, True), 286)
    y = 202
    for line in title_lines[:4]:
        draw.text((932, y), line, font=font(31, True), fill="#10201B")
        y += 38
    y += 18

    for point in scene["points"]:
        point_lines = wrap(draw, german_text(point), font(17, True), 246)
        draw.ellipse((932, y + 6, 944, y + 18), fill=chapter["accent"])
        line_y = y
        for line in point_lines[:3]:
            draw.text((960, line_y), line, font=font(17, True), fill="#42534D")
            line_y += 24
        y = line_y + 16

    draw.text((42, 681), "Gemeinsam planen. Fair nutzen. Einfach wieder freigeben.", font=font(15), fill="#52635D")
    image.save(destination, quality=95)


async def synthesize(text, destination):
    communicate = edge_tts.Communicate(text, VOICE, rate="+4%", pitch="+0Hz")
    await communicate.save(str(destination))


def audio_duration(path):
    result = subprocess.run([FFMPEG, "-i", str(path), "-f", "null", "-"], capture_output=True, text=True)
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not match:
        raise RuntimeError(f"Audiodauer nicht gefunden: {path}")
    return int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))


def timestamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{millis:03}"


def caption_sentences(text):
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    cues = []
    for sentence in sentences:
        words = sentence.split()
        if len(words) <= 13:
            cues.append(sentence)
            continue
        midpoint = math.ceil(len(words) / 2)
        cues.extend([" ".join(words[:midpoint]), " ".join(words[midpoint:])])
    return cues


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="waschplan-video-"))
    scene_videos, timings = [], []
    pause = 0.55
    try:
        scene_index = 0
        for chapter_number, (chapter, scenes) in enumerate(zip(CHAPTERS, SCENES), 1):
            for scene_number, scene in enumerate(scenes, 1):
                scene_index += 1
                slide = work / f"slide-{scene_index:02}.png"
                audio = work / f"audio-{scene_index:02}.mp3"
                video = work / f"scene-{scene_index:02}.mp4"
                build_slide(chapter, scene, chapter_number, scene_number, slide)
                speech = german_text(scene["speech"])
                await synthesize(speech, audio)
                duration = audio_duration(audio) + pause
                timings.append({"duration": duration, "speech": speech})
                subprocess.run([
                    FFMPEG, "-y", "-loop", "1", "-framerate", "30", "-i", str(slide), "-i", str(audio),
                    "-vf", "scale=1280:720,zoompan=z='min(zoom+0.00010,1.018)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=30,format=yuv420p",
                    "-af", f"apad=pad_dur={pause}", "-t", f"{duration:.3f}", "-c:v", "libx264", "-preset", "medium",
                    "-crf", "24", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(video)
                ], check=True, capture_output=True)
                scene_videos.append(video)

        concat_file = work / "concat.txt"
        concat_file.write_text("\n".join(f"file '{path.as_posix()}'" for path in scene_videos), encoding="utf-8")
        final_video = OUTPUT / "waschplan-einfuehrung.mp4"
        subprocess.run([
            FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", "-movflags", "+faststart", str(final_video)
        ], check=True, capture_output=True)
        shutil.copy2(work / "slide-01.png", OUTPUT / "waschplan-einfuehrung-poster.png")

        cue_lines, scene_start = ["WEBVTT", ""], 0.0
        for timing in timings:
            cues = caption_sentences(timing["speech"])
            usable = timing["duration"] - pause
            weights = [max(1, len(cue.split())) for cue in cues]
            total_weight = sum(weights)
            cursor = scene_start
            for cue, weight in zip(cues, weights):
                cue_duration = usable * weight / total_weight
                cue_lines.extend([f"{timestamp(cursor)} --> {timestamp(cursor + cue_duration)}", cue, ""])
                cursor += cue_duration
            scene_start += timing["duration"]
        (OUTPUT / "waschplan-einfuehrung-de.vtt").write_text("\n".join(cue_lines), encoding="utf-8")
        print(f"Video: {final_video}")
        print(f"Dauer: {timestamp(sum(timing['duration'] for timing in timings))}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    configure_ssl_trust()
    asyncio.run(main())
