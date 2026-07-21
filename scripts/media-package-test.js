const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadMediaCatalog() {
  const windowObject = {};
  const context = { window: windowObject };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public', 'intro-content.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public', 'intro-media.js'), 'utf8'), context);
  return windowObject.WaschZeitIntroMedia;
}

function localPath(publicPath) {
  return path.join(root, 'public', ...publicPath.split('/').filter(Boolean));
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function mp4Metadata(filename) {
  const buffer = fs.readFileSync(filename);
  for (const marker of ['ftyp', 'moov', 'mdat', 'avc1', 'mp4a']) {
    assert.ok(buffer.includes(Buffer.from(marker)), `${path.basename(filename)}: MP4-Marker ${marker} fehlt`);
  }
  const mvhd = buffer.indexOf(Buffer.from('mvhd'));
  assert.ok(mvhd >= 0, `${path.basename(filename)}: mvhd fehlt`);
  const version = buffer[mvhd + 4];
  const timescaleOffset = version === 1 ? mvhd + 24 : mvhd + 16;
  const durationOffset = version === 1 ? mvhd + 28 : mvhd + 20;
  const timescale = buffer.readUInt32BE(timescaleOffset);
  const duration = version === 1
    ? Number(buffer.readBigUInt64BE(durationOffset))
    : buffer.readUInt32BE(durationOffset);

  let searchFrom = 0;
  let width = 0;
  let height = 0;
  while (searchFrom < buffer.length) {
    const avc1 = buffer.indexOf(Buffer.from('avc1'), searchFrom);
    if (avc1 < 0) break;
    const candidateWidth = buffer.readUInt16BE(avc1 + 28);
    const candidateHeight = buffer.readUInt16BE(avc1 + 30);
    if (candidateWidth >= 320 && candidateHeight >= 180) {
      width = candidateWidth;
      height = candidateHeight;
      break;
    }
    searchFrom = avc1 + 4;
  }
  return { duration: duration / timescale, width, height, bytes: buffer.length };
}

function parseTimestamp(value) {
  const match = String(value).match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  assert.ok(match, `Ungueltiger VTT-Zeitwert: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function parseVtt(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  assert.ok(source.startsWith('WEBVTT\n'), `${path.basename(filename)}: WEBVTT-Kopf fehlt`);
  const cues = [];
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/);
    if (!match) continue;
    const text = [];
    for (let cursor = index + 1; cursor < lines.length && lines[cursor].trim(); cursor += 1) text.push(lines[cursor].trim());
    cues.push({ start: parseTimestamp(match[1]), end: parseTimestamp(match[2]), text: text.join(' ') });
  }
  return cues;
}

const catalog = loadMediaCatalog();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'assets', 'intro', 'media', 'manifest.json'), 'utf8'));
assert.equal(catalog.packages.length, 6);
assert.equal(manifest.packages.length, 6);
assert.deepEqual([...new Set(catalog.packages.map((item) => `${item.role}/${item.language}`))].sort(), [
  'house_admin/de', 'house_admin/en', 'resident/de', 'resident/en', 'superadmin/de', 'superadmin/en'
]);

let videoBytes = 0;
let offlineBytes = 0;
for (const media of catalog.packages) {
  const manifestEntry = manifest.packages.find((item) => item.id === media.id);
  assert.ok(manifestEntry, `${media.id}: Manifesteintrag fehlt`);
  assert.equal(manifestEntry.duration, media.duration);
  assert.equal(manifestEntry.chapters, media.chapters.length);
  for (const asset of ['video', 'captions', 'poster', 'transcript']) {
    assert.ok(fs.existsSync(localPath(media[asset])), `${media.id}: ${asset} fehlt`);
  }

  const video = mp4Metadata(localPath(media.video));
  assert.equal(video.width, 1280, `${media.id}: Videobreite`);
  assert.equal(video.height, 720, `${media.id}: Videohoehe`);
  assert.ok(Math.abs(video.duration - media.duration) < 0.15, `${media.id}: Laufzeit ${video.duration} statt ${media.duration}`);
  assert.ok(video.bytes > 500000 && video.bytes < 3 * 1024 * 1024, `${media.id}: unerwartete Videogroesse ${video.bytes}`);
  videoBytes += video.bytes;

  const poster = fs.readFileSync(localPath(media.poster));
  assert.equal(poster.toString('hex', 1, 4), '504e47', `${media.id}: Poster ist kein PNG`);
  assert.equal(poster.readUInt32BE(16), 1280, `${media.id}: Posterbreite`);
  assert.equal(poster.readUInt32BE(20), 720, `${media.id}: Posterhoehe`);
  offlineBytes += poster.length + fs.statSync(localPath(media.captions)).size + fs.statSync(localPath(media.transcript)).size;

  const cues = parseVtt(localPath(media.captions));
  assert.ok(cues.length >= media.chapters.length * 2, `${media.id}: zu wenige Untertitel`);
  let previousEnd = -1;
  for (const cue of cues) {
    assert.ok(cue.start >= previousEnd, `${media.id}: ueberlappende VTT-Cues`);
    assert.ok(cue.end > cue.start, `${media.id}: ungueltige Cue-Dauer`);
    assert.ok(cue.end <= media.duration + 0.01, `${media.id}: Cue nach Videoende`);
    previousEnd = cue.end;
  }
  const captionText = normalize(cues.map((cue) => cue.text).join(' '));
  const transcriptText = normalize(fs.readFileSync(localPath(media.transcript), 'utf8'));
  for (const chapter of media.chapters) {
    assert.ok(captionText.includes(normalize(chapter.transcript)), `${media.id}/${chapter.id}: Untertitel unvollstaendig`);
    assert.ok(transcriptText.includes(normalize(chapter.transcript)), `${media.id}/${chapter.id}: Transkript unvollstaendig`);
  }
}

assert.ok(videoBytes < 15 * 1024 * 1024, `Alle Videos sind mit ${videoBytes} Bytes zu gross`);
assert.ok(offlineBytes < 5 * 1024 * 1024, `Offline-Metadaten sind mit ${offlineBytes} Bytes zu gross`);

const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
assert.ok(indexHtml.includes('/intro-media.js?v=__WASCHZEIT_RELEASE__'));
assert.ok(indexHtml.includes('id="recordedIntroSource"'));
assert.ok(indexHtml.includes('id="recordedIntroTrack"'));
assert.ok(indexHtml.includes('id="recordedIntroChapters"'));
assert.ok(appSource.includes('WaschZeitIntroMedia?.get(currentIntroRole(), language)'));
assert.ok(appSource.includes('seekRecordedIntroChapter'));
assert.ok(serviceWorker.includes("requestUrl.pathname.endsWith('.mp4')"), 'MP4 darf nicht in den PWA-Laufzeitcache');
for (const media of catalog.packages) {
  assert.ok(serviceWorker.includes(media.poster), `${media.id}: Poster fehlt im PWA-Shellcache`);
  assert.ok(serviceWorker.includes(media.captions), `${media.id}: VTT fehlt im PWA-Shellcache`);
  assert.ok(serviceWorker.includes(media.transcript), `${media.id}: Transkript fehlt im PWA-Shellcache`);
  assert.ok(!serviceWorker.includes(media.video), `${media.id}: MP4 darf nicht vorab gecacht werden`);
}

console.log(JSON.stringify({
  ok: true,
  packages: catalog.packages.length,
  durations: Object.fromEntries(catalog.packages.map((item) => [item.id, item.duration])),
  videoBytes,
  offlineBytes
}));
