'use strict';
// Offline media authoring. Real local app, disposable synthetic DB, no mocked UI/API.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash,createECDH,randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const net=require('node:net');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');
const narration = require('./intro-film-narration');
const root = path.resolve(__dirname, '..');
const work = process.env.INTRO_WORK_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'wz-films-'));
const models = process.env.PIPER_MODELS;
const python = process.env.PIPER_PYTHON;
const ffmpeg = process.env.FFMPEG_PATH;
const probe = process.argv.includes('--probe');
assert(models && python && ffmpeg, 'Set PIPER_MODELS, PIPER_PYTHON and FFMPEG_PATH (authoring dependencies only).');
fs.mkdirSync(work, { recursive: true });
const out = path.join(root, 'public/assets/intro/media');
const pause = ms => new Promise(r => setTimeout(r, ms));
const run = (exe, args) => {
  const result = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 8e6 });
  if (result.status !== 0) throw new Error(`${path.basename(exe)}: ${result.stderr || result.stdout}`);
  return result;
};
function wavDuration(file) {
  const b = fs.readFileSync(file); let rate, size;
  for (let i = 12; i + 8 <= b.length;) { const n = b.readUInt32LE(i + 4); const id = b.toString('ascii', i, i + 4); if (id === 'fmt ') rate = b.readUInt32LE(i + 16); if (id === 'data') { size = n; break; } i += 8 + n + n % 2; }
  assert(rate && size); return size / rate;
}
function stamp(t) { return new Date(Math.round(t * 1000)).toISOString().slice(11, 23); }
const windowObject = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'public/intro-content.js'), 'utf8'), { window: windowObject });
const intros = JSON.parse(JSON.stringify(windowObject.WaschZeitIntroCatalog.introductions));
function german(text) { return text.replace(/fuer/g,'für').replace(/Fuer/g,'Für').replace(/ueber/g,'über').replace(/Ueber/g,'Über').replace(/persoenlich/g,'persönlich').replace(/Persoenlich/g,'Persönlich').replace(/Geraet/g,'Gerät').replace(/Raeum/g,'Räum').replace(/raeum/g,'räum').replace(/Stoerung/g,'Störung').replace(/pruef/g,'prüf').replace(/Pruef/g,'Prüf').replace(/Frueher/g,'Früher').replace(/frueh/g,'früh').replace(/Haeuser/g,'Häuser').replace(/aender/g,'änder').replace(/zurueck/g,'zurück').replace(/auswaehlen/g,'auswählen').replace(/Naechst/g,'Nächst').replace(/naechst/g,'nächst'); }
const speech = [];
for (const role of Object.keys(intros)) for (const lang of ['de', 'en']) {
  if(lang==='de')for(const key of ['title','description'])intros[role][lang][key]=german(intros[role][lang][key]);
  intros[role][lang].chapters.forEach((ch, i) => {
    if(lang==='de')for(const key of ['title','description'])ch[key]=german(ch[key]);
    if(role==='resident'&&i===8)ch.title=lang==='de'?'Kalenderabo und Hilfe':'Calendar subscription and help';
    if(role==='resident'&&i===5)ch.title=lang==='de'?'Freiwillige E-Mail und Geräte-Push':'Optional email and device push';
    if(role==='superadmin'&&i===7)ch.title=lang==='de'?'Produktionssperre respektieren':'Respect the production restriction';
    ch.sentences = narration[role][i][lang === 'de' ? 0 : 1];
    ch.transcript = ch.tts = ch.sentences.join(' ');
    ch.caption = ch.sentences[0];
    ch.audioFiles = ch.sentences.map((text, j) => {
      const output = path.join(work, `${role}-${lang}-${i}-${j}-${createHash('sha256').update(text).digest('hex').slice(0,8)}.wav`);
      speech.push({ language: lang, text, output }); return output;
    });
  });
}
fs.writeFileSync(path.join(work, 'speech.json'), JSON.stringify(speech));
run(python, [path.join(__dirname, 'intro-film-speech.py'), path.join(work, 'speech.json'), models]);
const password = 'Film-only-Local-2026!';
let base;
const env = Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, { NODE_ENV: 'development', APP_ENV: 'development', HOST: '127.0.0.1', DB_PATH: path.join(work, `film-${Date.now()}.sqlite`), SEED_ADMIN_NAME: 'demo-system', SEED_ADMIN_PASSWORD: password, SESSION_SECRET: 'synthetic-local-film-session-secret-2026', EMAIL_ENABLED: 'false', PUSH_ENABLED: 'false', BACKUP_ENABLED: 'false', AUTO_BACKUP: 'false' });
env.INTRO_SYNTHETIC_CLOCK='true';
env.PUSH_ENABLED='true';
let server, browser, db;
async function api(route, body, cookie = '') {
  const res = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'Idempotency-Key':randomBytes(24).toString('hex') }, body: JSON.stringify(body) });
  const result = await res.json(); assert(res.ok, `${route}: ${res.status} ${JSON.stringify(result)}`);
  return { ...result, cookie: res.headers.get('set-cookie')?.split(';')[0] || cookie };
}
async function click(page, selector) {
  const el = typeof selector === 'string' ? page.locator(selector).first() : selector.first();
  await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox();
  if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 }); await page.evaluate(({x,y})=>{let cue=document.getElementById('film-pointer');if(!cue){cue=document.createElement('div');cue.id='film-pointer';cue.style.cssText='position:fixed;width:26px;height:26px;border:3px solid #04ab78;border-radius:50%;box-shadow:0 0 0 4px #ffffffb0;pointer-events:none;z-index:2147483647;transition:left .22s,top .22s';document.body.append(cue);}cue.style.left=(x-13)+'px';cue.style.top=(y-13)+'px';}, {x:b.x+b.width/2,y:b.y+b.height/2}); }
  await pause(250); await el.click(); await pause(500);
}
async function focus(page, selector) { const el = page.locator(selector).first(); await el.scrollIntoViewIfNeeded(); await el.hover(); await pause(500); }
async function settings(page, tab) {
  if (await page.locator('#settingsOverlay').isHidden()) { await click(page, '#accountMenuButton'); await click(page, '#openSettingsButton'); }
  await click(page, `[data-settings-target="${tab}"]`);
}
async function section(page, tab) {
  if (await page.locator('#adminSectionNav').isHidden()) await click(page, '#adminViewButton');
  await click(page, `[data-admin-target="${tab}"]`);
}
async function clean(page, lang) {
  await page.goto(base + '/index.html');
  await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
  await page.evaluate(l => { WZ_I18N.setLanguage(l); closeSettings(); }, lang);
  if (await page.locator('#dismissWhatsNewButton').isVisible()) await page.locator('#dismissWhatsNewButton').click();
  await page.evaluate(() => window.scrollTo(0, 0)); await pause(500);
}
async function actions(page, role, index, lang, fixture) {
  const en = lang === 'en';
  if (role === 'resident') {
    if (index === 0) {
      await page.locator('#accessCardForm [name=password]').fill(password);
      await page.locator('#accessCardForm [name=passwordConfirmation]').fill(password);
      await click(page, '#accessCardForm button[type="submit"]'); await page.waitForURL(/\/index\.html/);
      await page.waitForFunction(()=>typeof currentUser!=='undefined'&&currentUser);
      await page.locator('#settingsOverlay').waitFor({state:'visible'}); await focus(page, '#settingsLoginIdentifier');
    }
    if (index === 1) { await click(page, '#monthViewButton'); await click(page, '#weekViewButton'); await focus(page, '#bookingDate'); }
    if (index === 2) {
      await page.locator('#bookingDate').fill(fixture.date); await page.locator('#bookingDate').press('Tab'); await pause(500);
      await click(page, '[data-booking-mode="time"]');
      await click(page, '[data-flow-time]:not([disabled])'); await click(page, '[data-flow-washer]:not([disabled])');
      await click(page, page.getByRole('button', { name: /Weiter zum Trockenraum|Continue to drying room/i }));
      await click(page, '[data-flow-drying="none"]');
      await click(page, page.getByRole('button', { name: /Weiter zum Tumbler|Continue to dryer|Continue to tumbler/i }));
      await click(page, '[data-flow-tumbler="none"]');
      await click(page, page.getByRole('button', { name: /Waschpaket prü|Waschpaket prue|Review.*package/i }));
      await click(page, page.getByRole('button', { name: /^(Waschpaket buchen|Book laundry package)$/i }));
      await focus(page, '#myBookings');
    }
    if (index === 3) { await focus(page, '#myBookings'); const cancel = page.locator('#myBookings').getByRole('button', { name: /Paket absagen|Cancel package/ }).first(); await click(page, cancel); }
    if (index === 4) { await focus(page, '#myBookings'); await click(page,page.locator('#myBookings').getByRole('button',{name:/Früher frei|Frueher frei|Release early/})); await focus(page,'#statusText'); }
    if (index === 5) {
      await settings(page, 'profile'); await focus(page, '#notificationEmail'); await click(page, '[data-i18n="settings.saveProfile"]');
      await click(page, '[data-settings-target="notifications"]'); await page.locator('#notificationResourceType').selectOption('washer'); await click(page, '[data-i18n="settings.saveNotifications"]');
      await click(page, '[data-settings-target="device"]'); await click(page, '#enablePushButton'); await focus(page, '#pushStatusText');
    }
    if (index === 6) {
      await click(page, '#reportIssueButton'); await page.locator('#reportIssueSubject').fill(en ? 'Display flickers (demo)' : 'Anzeige flackert (Demo)');
      await page.locator('#reportIssueDescription').fill(en ? 'The display flickers when the machine starts.' : 'Die Anzeige flackert beim Start.');
      await click(page, '#reportIssueForm button[type="submit"]'); await click(page,'#reportIssueButton'); await focus(page, '#ownMaintenanceCases');
    }
    if (index === 7) {
      await settings(page, 'profile'); await click(page, '#openHouseholdQr');
      const issued=page.waitForResponse(r=>r.url().endsWith('/api/me/device-code')&&r.request().method()==='POST');
      await click(page, '#createDeviceCodeButton'); const pair=await (await issued).json(); await focus(page, '#devicePairingPanel'); await pause(1000);
      await page.goto(pair.loginUrl); await page.locator('[data-language-picker]').selectOption(lang);
      await page.locator('#deviceLoginForm [name=password]').fill(password); await page.locator('#deviceLoginForm [name=passwordConfirmation]').fill(password);
      await click(page,'#deviceLoginForm button[type="submit"]');
      await page.waitForURL('**/index.html'); await page.waitForFunction(()=>typeof currentUser!=='undefined'&&currentUser);
      await page.evaluate(()=>closeSettings()); await settings(page,'profile'); await focus(page,'#settingsLoginIdentifier');
    }
    if (index === 8) { await settings(page, 'device'); await focus(page, '#calendarFeedCard'); await click(page, '#createCalendarFeedButton'); await click(page, '#copyCalendarFeedButton'); await focus(page, '#openCalendarFeedButton'); await click(page, '[data-settings-target="help"]'); }
    return;
  }
  if (role === 'house_admin') {
    const tab = ['overview','overview','people','people','house','logbook','logbook','fixed','analytics','people','overview'][index];
    await section(page, tab);
    if (index === 2) {
      await click(page, '#adminSectionPeople details summary'); await page.locator('#apartmentLabelInput').fill(en ? 'Demo apartment 20' : 'Demo-Wohnung 20');
      await page.locator('#apartmentDisplayNameInput').fill(en ? 'Demo household' : 'Demo-Haushalt'); await click(page, '#apartmentForm button[type="submit"]'); await focus(page, '#apartmentInvitationResult');
    } else if (index === 3) {
      const row = page.locator('#apartmentList .user-admin-item').filter({ hasText: 'Demo 01' });
      await click(page, row.getByRole('button', { name: /Weitere Person per QR-Karte|Add a person with a QR card/ })); await focus(page, '#apartmentInvitationResult');
    } else if (index === 4) { await focus(page, '#equipmentManagementPanel'); }
    else if (index === 5) {
      await page.locator('#maintenanceStatusFilter').selectOption('new');
      const item=page.locator('#maintenanceCaseList .maintenance-case').first();
      await click(page,item.locator('.maintenance-reports summary')); await item.locator('textarea').fill(en?'Demo: check display.':'Demo: Anzeige prüfen.');
      await item.locator('input[value=block]').check(); await click(page,item.locator('button[type=submit]'));
    }
    else if (index === 6) {
      await page.locator('#maintenanceStatusFilter').selectOption('in_progress'); const item=page.locator('#maintenanceCaseList .maintenance-case').first();
      await item.locator('.maintenance-step-field select').selectOption('repair'); await item.locator('textarea').fill(en?'Demo: display connector secured.':'Demo: Anschluss der Anzeige befestigt.'); await click(page,item.locator('button[type=submit]'));
      await item.locator('.maintenance-step-field select').selectOption('test'); await item.locator('.maintenance-test-field select').selectOption('true'); await item.locator('textarea').fill(en?'Demo: test run successful; display stable.':'Demo: Probelauf erfolgreich, Anzeige stabil.'); await click(page,item.locator('button[type=submit]')); await page.locator('#maintenanceStatusFilter').selectOption('done'); await focus(page,'#maintenanceCaseList');
    }
    else if (index === 7) { await click(page, '#adminSectionFixed details summary'); await page.locator('#fixedBookingLabel').fill(en ? 'Demo series' : 'Demo-Serie'); await page.locator('#fixedBookingInterval').fill('2'); await focus(page, '#fixedBookingPreview'); }
    else if (index === 8) await focus(page, '#adminSectionAnalytics');
    else if (index === 9) { await page.locator('#adminPeopleSearch').fill('Demo'); await focus(page, '#userList'); }
    else await focus(page, '#adminSectionOverview');
    return;
  }
  const tab = ['overview','house','house','people','system','system','system','system','system','overview'][index];
  await section(page, tab);
  if (index === 1) { const opts = await page.locator('#houseSelect option').evaluateAll(es => es.map(e=>e.value)); if (opts.length > 1) { await page.locator('#houseSelect').selectOption(opts[1]); await pause(800); await page.locator('#houseSelect').selectOption(opts[0]); await pause(500); } }
  else if (index === 2) { await click(page, '#equipmentManagementViewButton'); await click(page, '#houseManagementViewButton'); }
  else if (index === 3) { await page.locator('#adminPeopleSearch').fill('Demo'); await focus(page, '#apartmentList'); }
  else if (index === 4) await focus(page, '#superadminPermissionOperation');
  else if (index === 5) await focus(page, '#backupOperation');
  else if (index === 6) await focus(page, '#maintenanceOperation');
  else if (index === 7) await focus(page, '#adminSystemResponsibilityTitle');
  else if (index === 8) { await focus(page, '#adminSystemNotificationTitle'); await click(page,'.audit-panel summary'); await focus(page,'#auditLog'); }
  else await focus(page, '#adminSectionOverview');
}
async function record(page, action, dir, minimum) {
  fs.mkdirSync(dir, { recursive: true }); const frames = []; const start = Date.now();
  const cdp=await page.context().newCDPSession(page);
  const first=path.join(dir,'00000.jpg');await page.screenshot({path:first,type:'jpeg',quality:85});frames.push({file:first,at:0});
  cdp.on('Page.screencastFrame',event=>{const file=path.join(dir,`${String(frames.length).padStart(5,'0')}.jpg`);const at=(Date.now()-start)/1000;fs.writeFileSync(file,Buffer.from(event.data,'base64'));frames.push({file,at});cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:1280,maxHeight:720,everyNthFrame:1});
  let error;
  try { await action(); await pause(Math.max(500, minimum * 1000 - (Date.now()-start))); } catch(e) { error=e; } finally { await cdp.send('Page.stopScreencast');await cdp.detach(); }
  if (error) throw error;
  const duration = Math.ceil(((Date.now()-start)/1000)*25)/25;
  fs.writeFileSync(path.join(dir, 'frames.txt'), frames.map((f,i)=>`file '${f.file.replaceAll('\\','/')}'\nduration ${i+1<frames.length ? frames[i+1].at-f.at : duration-f.at}`).join('\n')+`\nfile '${frames.at(-1).file.replaceAll('\\','/')}'\n`);
  return duration;
}
async function main() {
  const listener=net.createServer();await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
  const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));base=`http://127.0.0.1:${port}`;env.PORT=String(port);env.PUBLIC_APP_URL=base;
  assert(!fs.existsSync(env.DB_PATH),'Recording database must be new.');
  server = spawn(process.execPath, ['--require',path.join(__dirname,'intro-film-clock.cjs'),'server.js'], { cwd: root, env, stdio: 'ignore' });
  let ready=false;for(let i=0;i<100;i++){assert(server.exitCode===null,'Own recording server exited.');try{if(fs.existsSync(env.DB_PATH)&&(await fetch(base+'/api/health')).ok){ready=true;break;}}catch{} await pause(100); }
  assert(ready&&server.exitCode===null&&fs.existsSync(env.DB_PATH),'Own isolated server must be running before login.');
  const admin = await api('/api/login',{username:'demo-system',password});
  db = new Database(env.DB_PATH);
  db.prepare("UPDATE houses SET name='Demohaus '||id").run();
  db.prepare("UPDATE apartments SET label='Demo '||printf('%02d',id), display_name='Demo-Haushalt '||id").run();
  const house = db.prepare('SELECT house_id FROM users WHERE username=?').get('demo-system').house_id;
  if(db.prepare('SELECT COUNT(*) n FROM houses').get().n===1) db.prepare("INSERT INTO houses(name,code) VALUES('Demohaus 2','FILMDEMO2')").run();
  const card = await api('/api/admin/apartments/access-card',{label:'Demo 01',displayName:'Demo-Haushalt'},admin.cookie);
  const resident = await api('/api/access-cards/activate',{accessId:card.accessCard.accessId,activationCode:card.accessCard.activationCode,password,passwordConfirmation:password});
  const row=db.prepare('SELECT * FROM users WHERE username=?').get(card.accessCard.accessId);
  db.prepare("INSERT INTO users(username,password_hash,role,house_id,active) VALUES('demo-house-admin',?,'admin',?,1)").run(row.password_hash,house);
  const ha=db.prepare("SELECT id FROM users WHERE username='demo-house-admin'").get().id;
  db.prepare("INSERT INTO user_house_roles(user_id,house_id,role) VALUES(?,?,'house_admin')").run(ha,house);
  const exe=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  browser=await chromium.launch({headless:true,executablePath:exe}); const manifest=[];
  for(const role of ['resident','house_admin','superadmin']) for(const lang of ['de','en']) {
    if(probe && (role!=='resident'||lang!=='de'))continue;
    if(process.env.INTRO_ONLY && !process.env.INTRO_ONLY.split(',').some(item=>item===role||item===`${role}-${lang}`))continue;
    const intro=intros[role][lang]; const id=role.replace('_','-')+'-'+lang; const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    await context.addInitScript(l=>document.addEventListener('DOMContentLoaded',()=>{const tag=document.createElement('div');tag.textContent=l==='de'?'DEMO · lokale Übungsdaten · keine persönliche Zugangskarte':'DEMO · local practice data · not your personal access card';tag.style.cssText='position:fixed;bottom:4px;left:4px;background:#12392ee8;color:white;font:12px Arial;padding:5px 9px;border-radius:5px;z-index:2147483646;pointer-events:none';document.body.append(tag);}),lang);
    const curve=createECDH('prime256v1');curve.generateKeys();
    await context.addInitScript(payload=>{
      const sub={toJSON:()=>payload,endpoint:payload.endpoint,unsubscribe:async()=>{sessionStorage.removeItem('film-push');return true;}};
      Object.defineProperty(Notification,'permission',{get:()=>sessionStorage.getItem('film-push')?'granted':'default'});
      Notification.requestPermission=async()=>{sessionStorage.setItem('film-push','yes');return 'granted';};
      PushManager.prototype.getSubscription=async()=>sessionStorage.getItem('film-push')?sub:null;
      PushManager.prototype.subscribe=async()=>{sessionStorage.setItem('film-push','yes');return sub;};
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__filmClipboard=text;}}});
    },{endpoint:'https://push.example.invalid/LOCAL-DEMO-NO-SEND/'+id,keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}});
    const page=await context.newPage();page.on('dialog',d=>d.accept().catch(()=>{})); page.setDefaultTimeout(5000); await page.clock.install({time:new Date('2026-11-23T09:30:00Z')});
    await page.goto(base+'/login.html'); await page.locator('[data-language-picker]').selectOption(lang);
    await page.locator('#loginForm [name=email]').fill(role==='resident'?card.accessCard.accessId:role==='house_admin'?'demo-house-admin':'demo-system');
    await page.locator('#loginForm [name=password]').fill(password); await page.locator('#loginForm button[type="submit"]').click(); await page.waitForURL('**/index.html');
    let offset=0;const cues=[];const segments=[];
    for(const [i,ch] of intro.chapters.entries()) {
      if(probe&&i>0)break;
      if(process.env.INTRO_CHAPTER!==undefined&&i!==Number(process.env.INTRO_CHAPTER))continue;
      if(role==='resident'&&i===4){const rid=db.prepare("SELECT id FROM resources WHERE house_id=? AND type='washer' LIMIT 1").get(house).id;db.prepare('INSERT INTO bookings(user_id,resource_id,booking_date,slot) VALUES(?,?,?,?)').run(row.id,rid,'2026-11-23','07:00-12:00');}
      if(role==='house_admin'&&i===5){const rid=db.prepare("SELECT id FROM resources WHERE house_id=? AND type='washer' LIMIT 1").get(house).id;await api('/api/maintenance-cases',{resourceId:rid,title:lang==='de'?'Anzeige (Demo)':'Display (demo)',description:'Synthetic recording only.'},resident.cookie);}
      if(role==='resident'&&i===0){const personal=await api(`/api/admin/apartments/${card.apartment.id}/access-card`,{},admin.cookie);await page.goto(personal.accessCard.activationUrl);await page.locator('[data-language-picker]').selectOption(lang);}else await clean(page,lang);
      const date=await page.evaluate(()=>{let d=new Date();d.setDate(d.getDate()+3);if(d.getDay()===0)d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');});
      const dir=path.join(work,id+'-'+i);let spoken=0;
      const audioParts=[];for(const [j,f] of ch.audioFiles.entries()){const d=wavDuration(f);cues.push({start:offset+spoken,end:offset+spoken+d,text:ch.sentences[j]});spoken+=d;audioParts.push(`file '${f.replaceAll('\\','/')}'`);}
      console.log('Recording',id,i,ch.id,spoken.toFixed(1));
      const duration=await record(page,()=>actions(page,role,i,lang,{date}),dir,spoken+0.4);
      // The speech starts with the real action. Long UI steps are not sped up or faked.
      ch.startTime=offset;ch.duration=duration;offset+=duration;
      fs.writeFileSync(path.join(dir,'audio.txt'),audioParts.join('\n'));
      const segment=path.join(dir,'chapter.mkv');
      run(ffmpeg,['-y','-v','error','-f','concat','-safe','0','-i',path.join(dir,'frames.txt'),'-f','concat','-safe','0','-i',path.join(dir,'audio.txt'),'-t',String(duration),'-vf','fps=25,scale=in_range=full:out_range=tv,format=yuv420p','-af','apad','-c:v','libx264','-preset','fast','-crf','27','-c:a','pcm_s16le','-ar','22050',segment]);
      segments.push(segment); if(i===0)run(ffmpeg,['-y','-v','error','-i',segment,'-frames:v','1',path.join(out,id+'-poster.png')]);
      if(duration-spoken>4)console.warn('LONG_ACTION',id,i,(duration-spoken).toFixed(2));
    }
    if(process.env.INTRO_CHAPTER!==undefined){await context.close();console.log('Updated capture segment',id,process.env.INTRO_CHAPTER);continue;}
    fs.writeFileSync(path.join(work,id+'-concat.txt'),segments.map(f=>`file '${f.replaceAll('\\','/')}'`).join('\n'));
    const target=probe?path.join(work,'probe.mp4'):path.join(out,id+'.mp4');
    run(ffmpeg,['-y','-v','error','-f','concat','-safe','0','-i',path.join(work,id+'-concat.txt'),'-c:v','copy','-c:a','aac','-b:a','64k','-t',String(offset),'-movflags','+faststart',target]);
    fs.writeFileSync(probe?path.join(work,'probe.vtt'):path.join(out,id+'.vtt'),'WEBVTT\n\n'+cues.map(c=>`${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join('\n\n')+'\n');
    intro.totalDuration=offset;
    if(!probe)fs.writeFileSync(path.join(out,id+'.txt'),intro.title+'\n\n'+intro.chapters.map((c,i)=>`${i+1}. ${c.title} [${stamp(c.startTime)}]\n${c.transcript}`).join('\n\n')+'\n');
    const entry={id,role,language:lang,duration:offset,chapters:intro.chapters.length,chapterStarts:intro.chapters.map(c=>c.startTime),width:1280,height:720,bytes:fs.statSync(target).size,video:`/assets/intro/media/${id}.mp4`,captions:`/assets/intro/media/${id}.vtt`,poster:`/assets/intro/media/${id}-poster.png`,transcript:`/assets/intro/media/${id}.txt`,capture:'real-local-app',voice:lang==='de'?'Piper Thorsten medium (CC0)':'Piper Joe medium (CC0)',frameRate:25,captionTiming:'measured-PCM-phrases'};
    manifest.push(entry);
    if(!probe)fs.writeFileSync(path.join(work,id+'-result.json'),JSON.stringify({intro,entry,sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')}));
    await context.close(); console.log('Rendered',target,offset);
  }
  if(!probe){
    const all=[];for(const role of Object.keys(intros))for(const lang of ['de','en']){const id=role.replace('_','-')+'-'+lang;const file=path.join(work,id+'-result.json');if(!fs.existsSync(file)){console.log('Remaining package:',id);continue;}const saved=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(createHash('sha256').update(fs.readFileSync(path.join(out,id+'.mp4'))).digest('hex'),saved.sha256);intros[role][lang]=saved.intro;all.push(saved.entry);}
    if(all.length!==6){console.log('Partial media build only; catalog not published.');return;}
    for(const role of Object.keys(intros))for(const lang of ['de','en'])for(const c of intros[role][lang].chapters){delete c.audioFiles;delete c.sentences;}
    fs.writeFileSync(path.join(root,'public/intro-content.js'),`// Generated by scripts/record-intro-films.js from measured narration and real app recordings.\n(function(global){'use strict';const introductions=${JSON.stringify(intros,null,2)};for(const role of Object.values(introductions)){for(const intro of Object.values(role)){intro.chapters.forEach(Object.freeze);Object.freeze(intro.chapters);Object.freeze(intro);}Object.freeze(role);}Object.freeze(introductions);global.WaschZeitIntroCatalog=Object.freeze({schemaVersion:1,defaultLanguage:'de',supportedLanguages:Object.freeze(['de','en']),supportedRoles:Object.freeze(['resident','house_admin','superadmin']),introductions,get(role,language){return introductions[role]?.[language]||introductions[role]?.de||null;}});})(window);\n`);
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:'media-v2',packages:all},null,2)+'\n');
  }
  console.log(JSON.stringify({ok:true,probe,work,manifest}));
}
// Finalise completed captures without repeating UI actions. Original lossless-audio
// chapter files stay in the temporary render directory for encoding comparisons.
async function finishExisting() {
  const manifest=[];
  for(const role of Object.keys(intros))for(const lang of ['de','en']){
    const intro=intros[role][lang];const id=role.replace('_','-')+'-'+lang;
    const transcript=fs.readFileSync(path.join(out,id+'.txt'),'utf8');
    const headings=[...transcript.matchAll(/^\d+\. (.+) \[(\d\d):(\d\d):(\d\d)\.(\d\d\d)\]$/gm)];
    assert.equal(headings.length,intro.chapters.length,`${id}: completed transcript required`);
    assert(intro.chapters.every(c=>transcript.includes(c.transcript)),`${id}: obsolete narration; record the updated package first`);
    let duration=0;const measuredCues=[];
    for(const [i,ch] of intro.chapters.entries()){
      const h=headings[i];ch.title=lang==='de'?german(h[1]).replace(/bestaetig/g,'bestätig').replace(/ausfuehren/g,'ausführen'):h[1];ch.startTime=duration;
      const frameData=fs.readFileSync(path.join(work,id+'-'+i,'frames.txt'),'utf8');
      ch.duration=Math.round([...frameData.matchAll(/^duration ([\d.]+)/gm)].reduce((sum,m)=>sum+Number(m[1]),0)*1000)/1000;
      let spoken=ch.startTime;for(const [j,file] of ch.audioFiles.entries()){const end=spoken+wavDuration(file);measuredCues.push(`${stamp(spoken)} --> ${stamp(end)}\n${ch.sentences[j]}`);spoken=end;}
      duration=Math.round((ch.startTime+ch.duration)*1000)/1000;assert(spoken<=duration+.01,`${id}/${i}: narration exceeds capture`);delete ch.sentences;delete ch.audioFiles;
    }
    // UI captures can overshoot the nominal two-pass target; leave measured headroom.
    const bitrate=Math.max(70000,Math.floor((2.15*1024*1024*8)/duration-56000-3500));
    const input=['-f','concat','-safe','0','-i',path.join(work,id+'-concat.txt')];
    const video=['-t',String(duration),'-r','25','-c:v','libx264','-preset','slow','-b:v',String(bitrate),'-pix_fmt','yuv420p','-passlogfile',path.join(work,id+'-2pass')];
    console.log('Final encoding',id,duration,bitrate);
    const target=path.join(out,id+'.mp4');
    const analysis=run(ffmpeg,['-hide_banner',...input,'-vn','-af','loudnorm=I=-17:TP=-2:LRA=9:print_format=json','-f','null',process.platform==='win32'?'NUL':'/dev/null']);
    const measured=JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    const filter=`loudnorm=I=-17:TP=-2:LRA=9:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,aresample=44100,alimiter=limit=0.630957:level=false,volume=-1dB`;
    const audio=['-af',filter,'-c:a','aac','-b:a','64k','-ar','44100','-ac','1','-movflags','+faststart'];
    if(process.argv.includes('--audio-only')){
      const remux=path.join(work,id+'-normalized.mp4');
      run(ffmpeg,['-y','-v','error','-i',target,...input,'-map','0:v','-map','1:a','-t',String(duration),'-c:v','copy',...audio,remux]);
      fs.copyFileSync(remux,target);
    }else{
      run(ffmpeg,['-y','-v','error',...input,...video,'-pass','1','-an','-f','mp4',process.platform==='win32'?'NUL':'/dev/null']);
      run(ffmpeg,['-y','-v','error',...input,...video,'-pass','2',...audio,target]);
    }
    intro.totalDuration=duration;
    fs.writeFileSync(path.join(out,id+'.vtt'),'WEBVTT\n\n'+measuredCues.join('\n\n')+'\n');
    fs.writeFileSync(path.join(out,id+'.txt'),intro.title+'\n\n'+intro.chapters.map((c,i)=>`${i+1}. ${c.title} [${stamp(c.startTime)}]\n${c.transcript}`).join('\n\n')+'\n');
    manifest.push({id,role,language:lang,duration,chapters:intro.chapters.length,chapterStarts:intro.chapters.map(c=>c.startTime),width:1280,height:720,bytes:fs.statSync(target).size,video:`/assets/intro/media/${id}.mp4`,captions:`/assets/intro/media/${id}.vtt`,poster:`/assets/intro/media/${id}-poster.png`,transcript:`/assets/intro/media/${id}.txt`,capture:'real-local-app',voice:lang==='de'?'Piper Thorsten medium (CC0)':'Piper Joe medium (CC0)',frameRate:25,captionTiming:'measured-PCM-phrases'});
  }
  fs.writeFileSync(path.join(root,'public/intro-content.js'),`// Generated by scripts/record-intro-films.js from measured narration and real app recordings.\n(function(global){'use strict';const introductions=${JSON.stringify(intros,null,2)};for(const role of Object.values(introductions)){for(const intro of Object.values(role)){intro.chapters.forEach(Object.freeze);Object.freeze(intro.chapters);Object.freeze(intro);}Object.freeze(role);}Object.freeze(introductions);global.WaschZeitIntroCatalog=Object.freeze({schemaVersion:1,defaultLanguage:'de',supportedLanguages:Object.freeze(['de','en']),supportedRoles:Object.freeze(['resident','house_admin','superadmin']),introductions,get(role,language){return introductions[role]?.[language]||introductions[role]?.de||null;}});})(window);\n`);
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:'media-v2',packages:manifest},null,2)+'\n');
  console.log(JSON.stringify({ok:true,packages:manifest}));
}
(process.argv.includes('--finalize-existing')?finishExisting():main()).catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(db)db.close();if(server){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),pause(2000)]);}});
