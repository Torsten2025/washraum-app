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
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "intro"
WIDTH, HEIGHT = 1280, 720
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "de-CH-LeniNeural"

CHAPTERS = [
    {
        "title": "Erst Überblick, dann buchen",
        "kicker": "01  START",
        "accent": "#00A873",
        "cards": [("FARBSTREIFEN", "WM, TR und Tumbler getrennt"), ("KALENDER", "Woche, Monat und Zoom"), ("TAGESDETAILS", "Alle Slots direkt öffnen")],
        "speech": "Hallo und willkommen bei WaschZeit. Nach dem Einloggen landest du direkt in deiner Hausansicht. Oben stehen deine nächsten Buchungen. Direkt darunter zeigt der Kalender drei beschriftete Farbstreifen für Waschmaschinen, Trockenräume und Tumbler. Grün bedeutet frei, Gelb teilweise belegt und Rot voll belegt. Du kannst zwischen Woche und Monat wechseln, den Kalender vergrößern oder verkleinern und einen Tag mit Maus, Tastatur oder Finger öffnen. Dann siehst du alle Zeitfenster und Geräte. Ein persönlicher Vorschlag ist im passenden Tag markiert. Feste Buchungen verwalten die Admins. Sie können nicht überschrieben werden.",
    },
    {
        "title": "Waschmaschine zuerst",
        "kicker": "02  SCHLAU BUCHEN",
        "accent": "#EF6B4D",
        "cards": [("1", "Tagesdetails öffnen"), ("2", "Freie Maschine auswählen"), ("3", "Waschpaket ergänzen")],
        "speech": "In den Tagesdetails siehst du für jedes Zeitfenster, welche Geräte frei, belegt oder bereits von dir gebucht sind. Bei einer freien Waschmaschine wählst du direkt Auswählen. Datum, Zeitfenster und Maschine werden sofort in Schritt eins deines Waschpakets übernommen. Trockenraum und Tumbler bleiben bis dahin bewusst verborgen. Wenn du mehr brauchst, kannst du im selben Zeitfenster bis zu drei Maschinen wählen. Ist bereits eine eigene Waschmaschine gebucht, öffnet Waschpaket ergänzen direkt die passenden Trocknungsoptionen.",
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
        "title": "Freigeben und gezielt informieren",
        "kicker": "06  MITEINANDER",
        "accent": "#EF6B4D",
        "cards": [("FRÜHER FREI", "Nur während deines Slots"), ("ABSAGEN", "Vor Beginn wieder anbieten"), ("E-MAIL", "Nur verifiziert und passend")],
        "speech": "Mindestens ein Tumbler bleibt in jedem Slot frei. Deshalb kann eine zweite Buchung abgelehnt werden, obwohl noch ein Tumbler sichtbar ist. Wenn du während deines gebuchten Slots früher fertig bist, wählst du Früher frei. Vor Beginn kannst du mit Absagen und informieren einen nicht benötigten Termin wieder anbieten. Eine Mail geht nur an Personen im selben Haus, die ihre Adresse bestätigt und passende Hinweise aktiviert haben. In den Einstellungen kannst du die Hinweise auf einen Bereich, einen Wochentag oder ein Zeitfenster begrenzen. So werden Nachrichten nützlich und nicht lästig.",
    },
    {
        "title": "Sauber abschließen",
        "kicker": "07  DANKE",
        "accent": "#2E6688",
        "cards": [("MASCHINEN", "Trommel, Dichtungen und Filter"), ("RÄUME", "Tische, Böden und Abflussbereich"), ("MOPP", "Spülen, auswringen, aufhängen")],
        "speech": "Zum Schluss gehört die Reinigung zu jeder Nutzung, auch zu einem einzelnen Waschgang zwischendurch. Bei der Waschmaschine werden Waschmittelschublade, Trommel, Gummidichtung, Filter und Gehäuse gereinigt. Beim Tumbler sind Trommel, alle vier Filter, der Abflussbereich unter den mittleren Filtern, die Türdichtung und das Gehäuse dran. Im Trockenraum reinigst du Tisch, beide Filter und den Boden. Auch Waschraum, Besen und Wischmopp werden sauber hinterlassen. Den Mopp gut ausspülen, auswringen und zum Trocknen aufhängen. Maßgebend bleibt der offizielle GBMZ-Aushang. Danach kannst du das kurze Quiz ausprobieren. Es ist freundlich gemeint und keine Zugangshürde.",
    },
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


def build_slide(chapter, number, destination):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#F4F8F6")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 96), fill="#10201B")
    draw.text((48, 31), "GBMZ", font=font(30, True), fill="#00CD83")
    draw.text((170, 38), "WASCHPLAN", font=font(18, True), fill="#FFFFFF")
    draw.text((1030, 38), f"KAPITEL {number}/7", font=font(15, True), fill="#BBD0C8")
    draw.rectangle((0, 96, 16, HEIGHT), fill=chapter["accent"])

    draw.text((64, 140), chapter["kicker"], font=font(17, True), fill=chapter["accent"])
    title_lines = wrap(draw, chapter["title"], font(48, True), 1080)
    y = 176
    for line in title_lines:
        draw.text((64, y), line, font=font(48, True), fill="#10201B")
        y += 56

    card_y = 330
    card_width = 350
    for index, (label, detail) in enumerate(chapter["cards"]):
        left = 64 + index * 378
        rounded(draw, (left, card_y, left + card_width, card_y + 230), "#FFFFFF", outline="#D4DFDA", width=2)
        draw.ellipse((left + 24, card_y + 24, left + 66, card_y + 66), fill=chapter["accent"])
        draw.text((left + 39, card_y + 34), str(index + 1), anchor="mm", font=font(18, True), fill="#FFFFFF")
        label_lines = wrap(draw, label, font(19, True), card_width - 48)
        line_y = card_y + 92
        for line in label_lines:
            draw.text((left + 24, line_y), line, font=font(19, True), fill="#10201B")
            line_y += 26
        detail_lines = wrap(draw, detail, font(19), card_width - 48)
        line_y += 10
        for line in detail_lines:
            draw.text((left + 24, line_y), line, font=font(19), fill="#52635D")
            line_y += 27

    draw.text((64, 645), "Gemeinsam planen. Fair nutzen. Einfach wieder freigeben.", font=font(17), fill="#52635D")
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
    chapter_videos, timings = [], []
    try:
        for index, chapter in enumerate(CHAPTERS, 1):
            slide = work / f"slide-{index}.png"
            audio = work / f"audio-{index}.mp3"
            video = work / f"chapter-{index}.mp4"
            build_slide(chapter, index, slide)
            await synthesize(chapter["speech"], audio)
            duration = audio_duration(audio) + 1.25
            timings.append(duration)
            subprocess.run([
                FFMPEG, "-y", "-loop", "1", "-framerate", "30", "-i", str(slide), "-i", str(audio),
                "-vf", "scale=1280:720,zoompan=z='min(zoom+0.00012,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=30,format=yuv420p",
                "-af", "apad=pad_dur=1.25", "-t", f"{duration:.3f}", "-c:v", "libx264", "-preset", "medium",
                "-crf", "25", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(video)
            ], check=True, capture_output=True)
            chapter_videos.append(video)

        concat_file = work / "concat.txt"
        concat_file.write_text("\n".join(f"file '{path.as_posix()}'" for path in chapter_videos), encoding="utf-8")
        final_video = OUTPUT / "waschplan-einfuehrung.mp4"
        subprocess.run([
            FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", "-movflags", "+faststart", str(final_video)
        ], check=True, capture_output=True)
        shutil.copy2(work / "slide-1.png", OUTPUT / "waschplan-einfuehrung-poster.png")

        cue_lines, chapter_start = ["WEBVTT", ""], 0.0
        for chapter, duration in zip(CHAPTERS, timings):
            cues = caption_sentences(chapter["speech"])
            usable = duration - 1.25
            weights = [max(1, len(cue.split())) for cue in cues]
            total_weight = sum(weights)
            cursor = chapter_start
            for cue, weight in zip(cues, weights):
                cue_duration = usable * weight / total_weight
                cue_lines.extend([f"{timestamp(cursor)} --> {timestamp(cursor + cue_duration)}", cue, ""])
                cursor += cue_duration
            chapter_start += duration
        (OUTPUT / "waschplan-einfuehrung-de.vtt").write_text("\n".join(cue_lines), encoding="utf-8")
        print(f"Video: {final_video}")
        print(f"Dauer: {timestamp(sum(timings))}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    configure_ssl_trust()
    asyncio.run(main())
