const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'public', 'assets', 'intro', 'media');
const screenshotDirectory = path.join(root, 'artifacts', 'e2e-screenshots');

function loadBrowserCatalog() {
  const windowObject = {};
  const context = { window: windowObject };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public', 'intro-content.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public', 'intro-media.js'), 'utf8'), context);
  return windowObject.WaschZeitIntroMedia;
}

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require('playwright-core');
  }
}

function systemBrowserPath() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  for (const python of ['python', 'python3', 'py']) {
    const args = python === 'py'
      ? ['-3', '-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']
      : ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'];
    const result = spawnSync(python, args, { encoding: 'utf8' });
    const candidate = String(result.stdout || '').trim();
    if (result.status === 0 && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('FFmpeg fehlt. Setze FFMPEG_PATH oder installiere das Python-Paket imageio-ffmpeg.');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} fehlgeschlagen (${result.status}).\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sourceTab(view) {
  if (/apartment|account|role|responsibility|confirmation/.test(view)) return 'people';
  if (/equipment|logbook/.test(view)) return 'house';
  if (/recurring/.test(view)) return 'fixed';
  if (/analytics/.test(view)) return 'analytics';
  if (/backup|maintenance|pilot|system-status/.test(view)) return 'system';
  return 'overview';
}

function sourceImage(media, chapter) {
  const language = media.language;
  if (media.role === 'resident') {
    const localized = path.join(screenshotDirectory, `media-source-resident-${language}-plan.png`);
    if (fs.existsSync(localized)) return localized;
  } else {
    const tab = sourceTab(chapter.visual?.view || 'overview');
    const prefix = media.role === 'house_admin' ? 'house-admin' : 'superadmin';
    const roleImage = path.join(screenshotDirectory, `media-source-${prefix}-${language}-${tab}.png`);
    if (fs.existsSync(roleImage)) return roleImage;
    const roleFallback = path.join(screenshotDirectory, `media-source-${prefix}-${language}-house.png`);
    if (fs.existsSync(roleFallback)) return roleFallback;
  }
  return path.join(root, 'public', 'assets', 'intro', 'scenes', 'app-overview.png');
}

function roleAccent(role) {
  if (role === 'superadmin') return ['#ff6b4a', '#2d5b78'];
  if (role === 'house_admin') return ['#e8b33f', '#00a876'];
  return ['#00a876', '#ff7557'];
}

function imageDataUrl(filename) {
  const extension = path.extname(filename).toLowerCase() === '.jpg' ? 'jpeg' : 'png';
  return `data:image/${extension};base64,${fs.readFileSync(filename).toString('base64')}`;
}

async function renderSlide(page, media, chapter, chapterIndex, filename) {
  const [accent, accentTwo] = roleAccent(media.role);
  const chapterLabel = media.language === 'en' ? 'Chapter' : 'Kapitel';
  const ofLabel = media.language === 'en' ? 'of' : 'von';
  const source = imageDataUrl(sourceImage(media, chapter));
  await page.setContent(`<!doctype html><html lang="${media.language}"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{height:100%;margin:0}body{background:#eaf0ee;color:#10211c;font-family:Arial,Helvetica,sans-serif;letter-spacing:0;overflow:hidden}
    .screen{height:720px;position:relative;width:1280px}.screen:before{background-image:linear-gradient(90deg,rgba(8,23,18,.96) 0 43%,rgba(8,23,18,.28) 72%,rgba(8,23,18,.08)),url('${source}');background-position:center;background-size:cover;content:"";inset:0;position:absolute}
    .stripe{background:linear-gradient(90deg,${accent},${accentTwo});height:8px;left:0;position:absolute;right:0;top:0}.content{color:#fff;display:flex;flex-direction:column;height:100%;justify-content:center;padding:66px 64px;position:relative;width:560px}
    .brand{align-items:center;display:flex;font-size:27px;font-weight:800;gap:11px;margin-bottom:56px}.mark{background:${accent};border-radius:4px;height:28px;position:relative;width:28px}.mark:after{background:${accentTwo};content:"";height:8px;left:5px;position:absolute;right:5px;top:10px}
    .role{color:${accent};font-size:17px;font-weight:800;margin:0 0 12px;text-transform:uppercase}.count{color:rgba(255,255,255,.68);font-size:17px;font-weight:700;margin-bottom:18px}.title{font-size:47px;line-height:1.05;margin:0 0 20px;max-width:500px}.caption{color:rgba(255,255,255,.84);font-size:25px;line-height:1.38;margin:0;max-width:500px}.footer{align-items:center;bottom:38px;color:rgba(255,255,255,.65);display:flex;font-size:15px;font-weight:700;justify-content:space-between;left:64px;position:absolute;width:432px}.progress{background:rgba(255,255,255,.2);height:5px;width:240px}.progress i{background:${accent};display:block;height:100%;width:${Math.round(((chapterIndex + 1) / media.chapters.length) * 100)}%}
  </style></head><body><main class="screen"><div class="stripe"></div><section class="content"><div class="brand"><span class="mark"></span>WaschZeit</div><p class="role">${escapeHtml(media.roleLabel)}</p><div class="count">${chapterLabel} ${chapterIndex + 1} ${ofLabel} ${media.chapters.length}</div><h1 class="title">${escapeHtml(chapter.title)}</h1><p class="caption">${escapeHtml(chapter.caption)}</p><div class="footer"><span>${escapeHtml(media.languageLabel)}</span><span class="progress"><i></i></span></div></section></main></body></html>`);
  await page.screenshot({ path: filename, fullPage: false, animations: 'disabled' });
}

function waveDuration(filename) {
  const buffer = fs.readFileSync(filename);
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') byteRate = buffer.readUInt32LE(offset + 16);
    if (id === 'data') {
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || !dataSize) throw new Error(`Ungueltige WAV-Datei: ${filename}`);
  return dataSize / byteRate;
}

function synthesizeNarration(items, tempDirectory) {
  const input = path.join(tempDirectory, 'speech.json');
  const script = path.join(tempDirectory, 'speech.ps1');
  fs.writeFileSync(input, JSON.stringify(items), 'utf8');
  fs.writeFileSync(script, `param([string]$InputFile)\nAdd-Type -AssemblyName System.Speech\n$items = Get-Content -Raw -Encoding UTF8 -LiteralPath $InputFile | ConvertFrom-Json\nforeach ($item in $items) {\n  $voice = New-Object System.Speech.Synthesis.SpeechSynthesizer\n  $voice.SelectVoice([string]$item.voice)\n  $voice.Rate = 1\n  $voice.Volume = 100\n  $voice.SetOutputToWaveFile([string]$item.output)\n  $voice.Speak([string]$item.text)\n  $voice.Dispose()\n}\n`, 'utf8');
  run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-InputFile', input]);
}

function timestamp(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const secs = Math.floor((milliseconds % 60000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function captionChunks(text, maxWords = 11) {
  const words = String(text).trim().split(/\s+/);
  const chunkCount = Math.max(1, Math.ceil(words.length / maxWords));
  const balancedSize = Math.ceil(words.length / chunkCount);
  const chunks = [];
  for (let index = 0; index < words.length; index += balancedSize) {
    chunks.push(words.slice(index, index + balancedSize).join(' '));
  }
  return chunks;
}

function buildVtt(media) {
  const cues = ['WEBVTT', ''];
  for (const chapter of media.chapters) {
    const chunks = captionChunks(chapter.transcript);
    const available = Math.max(1, chapter.duration - 1);
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0);
    let cursor = chapter.startTime + 0.35;
    for (const chunk of chunks) {
      const fraction = chunk.split(/\s+/).length / totalWords;
      const cueDuration = available * fraction;
      const end = Math.min(chapter.startTime + chapter.duration - 0.15, cursor + cueDuration);
      cues.push(`${timestamp(cursor)} --> ${timestamp(end)}`, chunk, '');
      cursor = end;
    }
  }
  return `${cues.join('\n')}\n`;
}

function buildTranscript(media) {
  const lines = [media.title, `${media.roleLabel} | ${media.languageLabel}`, ''];
  media.chapters.forEach((chapter, index) => {
    lines.push(`${index + 1}. ${chapter.title} [${timestamp(chapter.startTime)}]`, chapter.transcript, '');
  });
  return `${lines.join('\n')}\n`;
}

function mediaOutputPath(publicPath) {
  return path.join(root, 'public', ...publicPath.split('/').filter(Boolean));
}

async function generatePackage(browser, ffmpeg, media) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `waschzeit-${media.id}-`));
  const page = await browser.newPage({ viewport: { width: media.width, height: media.height } });
  const voice = media.language === 'en' ? 'Microsoft Zira Desktop' : 'Microsoft Hedda Desktop';
  try {
    const slides = [];
    const wavFiles = [];
    for (const [index, chapter] of media.chapters.entries()) {
      const slide = path.join(tempDirectory, `slide-${String(index).padStart(2, '0')}.png`);
      const wav = path.join(tempDirectory, `voice-${String(index).padStart(2, '0')}.wav`);
      await renderSlide(page, media, chapter, index, slide);
      slides.push(slide);
      wavFiles.push(wav);
    }
    synthesizeNarration(media.chapters.map((chapter, index) => ({
      voice,
      text: chapter.transcript,
      output: wavFiles[index]
    })), tempDirectory);

    const segments = [];
    for (const [index, chapter] of media.chapters.entries()) {
      const spokenDuration = waveDuration(wavFiles[index]);
      if (spokenDuration > chapter.duration - 0.5) {
        throw new Error(`${media.id}/${chapter.id}: Vertonung ${spokenDuration.toFixed(1)} s ist laenger als Kapitel ${chapter.duration} s.`);
      }
      const segment = path.join(tempDirectory, `segment-${String(index).padStart(2, '0')}.mp4`);
      run(ffmpeg, [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-loop', '1', '-framerate', '2', '-i', slides[index], '-i', wavFiles[index],
        '-t', String(chapter.duration), '-vf', `scale=${media.width}:${media.height}:force_original_aspect_ratio=decrease,pad=${media.width}:${media.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
        '-af', 'apad', '-c:v', 'libx264', '-profile:v', 'high', '-level', '3.1', '-preset', 'veryfast', '-tune', 'stillimage', '-crf', '30',
        '-r', '2', '-g', '120', '-keyint_min', '120', '-sc_threshold', '0', '-c:a', 'aac', '-b:a', '48k', '-ar', '24000', '-ac', '1', '-movflags', '+faststart', segment
      ]);
      segments.push(segment);
    }

    const concatFile = path.join(tempDirectory, 'segments.txt');
    fs.writeFileSync(concatFile, segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join('\n'), 'utf8');
    const videoPath = mediaOutputPath(media.video);
    const captionsPath = mediaOutputPath(media.captions);
    const posterPath = mediaOutputPath(media.poster);
    const transcriptPath = mediaOutputPath(media.transcript);
    fs.mkdirSync(path.dirname(videoPath), { recursive: true });
    run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', '-movflags', '+faststart', videoPath]);
    fs.copyFileSync(slides[0], posterPath);
    fs.writeFileSync(captionsPath, buildVtt(media), 'utf8');
    fs.writeFileSync(transcriptPath, buildTranscript(media), 'utf8');
    return {
      id: media.id,
      role: media.role,
      language: media.language,
      duration: media.duration,
      chapters: media.chapters.length,
      width: media.width,
      height: media.height,
      video: media.video,
      captions: media.captions,
      poster: media.poster,
      transcript: media.transcript,
      bytes: fs.statSync(videoPath).size
    };
  } finally {
    await page.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const mediaCatalog = loadBrowserCatalog();
  const ffmpeg = resolveFfmpeg();
  const playwright = await loadPlaywright();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || systemBrowserPath();
  const browser = await playwright.chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  fs.mkdirSync(outputDirectory, { recursive: true });
  const manifest = [];
  try {
    for (const media of mediaCatalog.packages) {
      process.stdout.write(`Erzeuge ${media.id} ... `);
      const result = await generatePackage(browser, ffmpeg, media);
      manifest.push(result);
      console.log(`${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify({ version: mediaCatalog.version, packages: manifest }, null, 2)}\n`, 'utf8');
  console.log(`Medienpakete erstellt: ${manifest.length}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
