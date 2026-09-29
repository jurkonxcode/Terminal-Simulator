/* =========================================================
   Terminal Simulator // nullSociety
   Interactive Hacking Fiction — Engine
   File: script.js
   ========================================================= */

(() => {
  'use strict';

  /* =======================================================
     1. DOM REFERENCES
     ======================================================= */
  const $output      = document.getElementById('output');
  const $input       = document.getElementById('cmd');
  const $form        = document.getElementById('inputForm');
  const $prompt      = document.getElementById('prompt');
  const $soundBtn    = document.getElementById('soundBtn');
  const $menuBtn     = document.getElementById('menuBtn');
  const $menuClose   = document.getElementById('menuClose');
  const $menuOverlay = document.getElementById('menuOverlay');
  const $optTutorial = document.getElementById('optTutorial');
  const $optLanguage = document.getElementById('optLanguage');
  const $optReset    = document.getElementById('optReset');
  const $langValue   = document.getElementById('langValue');
  const $tutorialBox = document.getElementById('tutorialBox');
  const $tutorialContent = document.getElementById('tutorialContent');
  const $statusLog   = document.getElementById('statusLog');

  const $confirmOverlay = document.getElementById('confirmOverlay');
  const $confirmTitle   = document.getElementById('confirmTitle');
  const $confirmBody    = document.getElementById('confirmBody');
  const $confirmOk      = document.getElementById('confirmOk');
  const $confirmCancel  = document.getElementById('confirmCancel');

  /* =======================================================
     2. SOUND ENGINE (Web Audio API — mechanical keyboard)
     ======================================================= */
  const Sfx = (() => {
    let ctx = null;
    let enabled = true;
    let lastClick = 0;

    function init() {
      if (ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { enabled = false; return; }
        ctx = new AC();
      } catch (e) {
        enabled = false;
      }
    }

    function resume() {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }

    function toggle() {
      enabled = !enabled;
      return enabled;
    }

    function isEnabled() { return enabled; }

    /* Internal beep */
    function beep(freq, dur, type = 'sine', vol = 0.05, delay = 0) {
      if (!enabled || !ctx) return;
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    /* Mechanical keyboard: 2-layer click */
    function keyClick() {
      if (!enabled || !ctx) return;
      const now = performance.now();
      if (now - lastClick < 22) return;
      lastClick = now;

      const t = ctx.currentTime;

      // Layer 1 — high-freq click
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = 'square';
      o1.frequency.value = 1400 + Math.random() * 500;
      g1.gain.setValueAtTime(0.022, t);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      o1.connect(g1);
      g1.connect(ctx.destination);
      o1.start(t);
      o1.stop(t + 0.03);

      // Layer 2 — low-freq thock
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'triangle';
      o2.frequency.value = 100 + Math.random() * 50;
      g2.gain.setValueAtTime(0.040, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t);
      o2.stop(t + 0.05);
    }

    return {
      init,
      resume,
      toggle,
      isEnabled,
      keyClick,
      ok()    { beep(660, 0.08); beep(990, 0.12, 'sine', 0.05, 0.08); },
      error() { beep(160, 0.18, 'sawtooth', 0.06); },
      alert() {
        beep(220, 0.15, 'sawtooth', 0.06);
        beep(180, 0.18, 'sawtooth', 0.06, 0.16);
      },
      boot() {
        beep(330, 0.05);
        beep(440, 0.05, 'sine', 0.05, 0.08);
        beep(660, 0.10, 'sine', 0.05, 0.16);
      }
    };
  })();

  /* =======================================================
     3. STATE + SAVE
     ======================================================= */
  const SAVE_KEY = 'nullSociety_save_v2';
  const LANG_KEY = 'nullSociety_lang_v2';

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.mission === 'number') {
          return { mission: s.mission, fresh: false };
        }
      }
    } catch (e) {}
    return { mission: 1, fresh: true };
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: state.mission }));
      flashStatusLog();
    } catch (e) {}
  }

  function wipeState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function loadLang() {
    try {
      const l = localStorage.getItem(LANG_KEY);
      if (l === 'id' || l === 'en') return l;
    } catch (e) {}
    return 'id';
  }

  function saveLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  }

  let state  = loadState();
  let lang   = loadLang();

  function flashStatusLog() {
    $statusLog.classList.remove('saved');
    $statusLog.classList.add('dirty');
    $statusLog.textContent = 'LOG: SAVING';
    setTimeout(() => {
      $statusLog.classList.remove('dirty');
      $statusLog.classList.add('saved');
      $statusLog.textContent = 'LOG: SAVED';
    }, 700);
  }

  /* =======================================================
     4. LOCALIZATION (i18n)
     ======================================================= */
  const I18N = {
    id: {
      /* Header */
      'prompt.fmt':         'v01d@nullSociety[{tag}]:~$',
      'status.saved':       'LOG: SAVED',

      /* Menu */
      'menu.title':         '⚙️ SYSTEM MENU',
      'menu.tutorial':      'Tutorial / Manual Book',
      'menu.language':      'Pilih Bahasa / Language',
      'menu.reset':         'Reset Data',
      'menu.footer':        'nullSociety client v2.1 — Simulasi edukasi semata',

      /* Confirm reset */
      'confirm.title':      'Reset Data?',
      'confirm.body':       'Semua progres akan dihapus dan cerita dimulai dari awal.',
      'confirm.cancel':     'Batal',
      'confirm.ok':         'Reset',

      /* System messages */
      'sys.session.found':  '[SYSTEM] Sesi sebelumnya ditemukan. Memuat data...',
      'sys.session.resume': '[SYSTEM] Melanjutkan sesi terenkripsi...',
      'sys.session.miss':   '[SYSTEM] Kamu berada di Misi {n}.',
      'sys.session.done':   '[SYSTEM] Sesi sebelumnya telah selesai.',
      'sys.hint.help':      "[SYSTEM] Ketik 'help' untuk melihat perintah.",
      'sys.hint.restart':   "Ketik 'restart' untuk mengulang dari awal.",
      'sys.waiting':        '[SYSTEM] Menunggu perintah...',
      'sys.boot1':          '[SYSTEM] Booting nullSociety client v2.1...',
      'sys.boot2':          '[SYSTEM] Connecting via proxy... SUCCESS.',
      'sys.boot3':          '[SYSTEM] Encrypting tunnel (AES-256)... OK.',

      /* Help command */
      'help.title':         'PERINTAH TERSEDIA:',
      'help.help':          '  help      tampilkan bantuan',
      'help.clear':         '  clear     bersihkan layar',
      'help.restart':       '  restart   ulang simulasi dari awal',
      'help.active':        '>> Perintah misi aktif:',
      'help.footer':        "Ketik perintah dengan benar (case-insensitive).",

      /* Errors */
      'err.unknown':        "perintah tidak dikenal: '{raw}'",
      'err.tip':            "Ketik 'help' untuk melihat perintah yang tersedia.",
      'err.ended':          "Simulasi selesai. Ketik 'restart' untuk mengulang.",
      'err.restarting':     '[*] Merestart simulasi...',
      'err.reset.done':     '[*] Data dihapus. Memuat ulang...',

      /* PROLOG */
      'prolog.1':           '[MSG] Pix3l: "Elias, waktu kita sempit. V Corp mulai curiga.',
      'prolog.2':           '       Masuk ke server cadangan Iron Vault sekarang!',
      'prolog.3':           "       Ketik 'help' untuk bantuan atau 'scan' untuk mulai.\"",

      /* MISI 1 */
      'm1.1':               '[!] Memulai pemindaian target: iron-vault.vcorp.com',
      'm1.2':               '[.] Resolving hostname...',
      'm1.3':               '[.] Scanning 1000 common ports...',
      'm1.4':               '[+] Port 22   (SSH)    — FILTERED',
      'm1.5':               '[+] Port 80   (HTTP)   — CLOSED',
      'm1.6':               '[+] Port 443  (HTTPS)  — OPEN',
      'm1.7':               '[+] Port 8080 (HVAC)   — OPEN  <-- celah',
      'm1.8':               '[MSG] Pix3l: "Bagus! Sistem pendingin (HVAC) mereka terbuka di',
      'm1.9':               '       port 8080. Itu celah kita untuk melelehkan pita data',
      'm1.10':              '       cadangan mereka. Jalankan skrip eksploitasi sekarang!"',

      /* MISI 2 */
      'm2.1':               '[!] Menjalankan hvac_exploit.py --target :8080',
      'm2.2':               '[.] Loading payload...',
      'm2.3':               '[.] Exploiting system...',
      'm2.4':               '[.] Bypassing authentication...',
      'm2.5':               '[SUCCESS] Admin access granted.',
      'm2.6':               '[+] Shell aktif: /cgi-bin/hvac/control',
      'm2.7':               '[?] V01d: "(Batin) Aku sudah masuk ke sistem suhu ruangan server.',
      'm2.8':               '         Aku harus menaikkan suhunya sampai ekstrem."',

      /* MISI 3 */
      'm3.1':               '[!] Mengubah konfigurasi thermostat...',
      'm3.2':               '[.] Set point: 18°C  →  60°C',
      'm3.3':               '[!] Menonaktifkan alarm lokal...',
      'm3.4':               '[+] Suhu: 25°C',
      'm3.5':               '[+] Suhu: 38°C',
      'm3.6':               '[+] Suhu: 51°C',
      'm3.7':               '[+] Suhu: 60°C  <-- KRITIS',
      'm3.8':               '[CRITICAL WARNING] Hardware failure.',
      'm3.9':               '[CRITICAL WARNING] Data tapes destroyed.',
      'm3.10':              '[MSG] Pix3l: "Berhasil! Data V Corp lumpuh! Tapi alarm internal',
      'm3.11':              '       mereka menyala, Elias. Cepat hapus log sistem atau',
      'm3.12':              '       kamu akan dilacak!"',

      /* MISI 4 */
      'm4.1':               '[!] Menghapus log sistem...',
      'm4.2':               '[+] Deleting /var/log/auth.log...         Done.',
      'm4.3':               '[+] Deleting /var/log/nginx/access.log... Done.',
      'm4.4':               '[+] Deleting /var/log/syslog...           Done.',
      'm4.5':               '[+] Shredding ~/.bash_history...          Done.',
      'm4.6':               '[!] Menutup sesi...',
      'm4.7':               '[+] Koneksi TOR terputus dengan aman.',
      'm4.8':               '[+] IP-mu hilang di antara ribuan node.',
      'm4.9':               '[SYSTEM] Sesi berakhir.',

      /* EPILOG */
      'epilogue.1':         'Hello, friend.',
      'epilogue.2':         'Utang dunia telah dihapus.',
      'epilogue.3':         'V Corp tumbang. nullSociety menang!',
      'epilogue.4':         "Ketik 'restart' untuk mengulang simulasi.",

      /* Tutorial */
      'tut.title':          'MANUAL BOOK — nullSociety',
      'tut.intro':          'Kamu berperan sebagai Elias (V01d), peretas dari kelompok nullSociety. Rekanmu Darla (Pix3l) akan memandu lewat pesan terenkripsi. Target: Iron Vault milik V Corp.',
      'tut.howto':          'CARA BERMAIN',
      'tut.howto1':         'Ketik perintah di terminal, tekan Enter.',
      'tut.howto2':         "Gunakan 'help' untuk melihat perintah yang dibutuhkan di misi aktif.",
      'tut.howto3':         "Gunakan 'clear' untuk membersihkan layar.",
      'tut.howto4':         "Gunakan 'restart' untuk mengulang dari awal.",
      'tut.cmdtitle':       'PERINTAH MISI',
      'tut.cmd1':           'Misi 1 — <code>scan</code>',
      'tut.cmd2':           'Misi 2 — <code>run-exploit --port 8080</code>',
      'tut.cmd3':           'Misi 3 — <code>set-temp --room-all 60C</code>',
      'tut.cmd4':           'Misi 4 — <code>clear-log</code>',
      'tut.tips':           'Tips: progres tersimpan otomatis. Kalau HP di-refresh, kamu kembali ke misi terakhir.',

      /* Prompt tags */
      'tag.offline':        'offline'
    },

    en: {
      /* Header */
      'prompt.fmt':         'v01d@nullSociety[{tag}]:~$',
      'status.saved':       'LOG: SAVED',

      /* Menu */
      'menu.title':         '⚙️ SYSTEM MENU',
      'menu.tutorial':      'Tutorial / Manual Book',
      'menu.language':      'Choose Language / Bahasa',
      'menu.reset':         'Reset Data',
      'menu.footer':        'nullSociety client v2.1 — Educational simulation only',

      /* Confirm reset */
      'confirm.title':      'Reset Data?',
      'confirm.body':       'All progress will be erased and the story restarts from the beginning.',
      'confirm.cancel':     'Cancel',
      'confirm.ok':         'Reset',

      /* System */
      'sys.session.found':  '[SYSTEM] Previous session found. Loading data...',
      'sys.session.resume': '[SYSTEM] Resuming encrypted session...',
      'sys.session.miss':   '[SYSTEM] You are on Mission {n}.',
      'sys.session.done':   '[SYSTEM] Previous session already completed.',
      'sys.hint.help':      "[SYSTEM] Type 'help' to see available commands.",
      'sys.hint.restart':   "Type 'restart' to play again from the beginning.",
      'sys.waiting':        '[SYSTEM] Awaiting command...',
      'sys.boot1':          '[SYSTEM] Booting nullSociety client v2.1...',
      'sys.boot2':          '[SYSTEM] Connecting via proxy... SUCCESS.',
      'sys.boot3':          '[SYSTEM] Encrypting tunnel (AES-256)... OK.',

      /* Help */
      'help.title':         'AVAILABLE COMMANDS:',
      'help.help':          '  help      show this help',
      'help.clear':         '  clear     clear the screen',
      'help.restart':       '  restart   restart the simulation',
      'help.active':        '>> Active mission command:',
      'help.footer':        'Commands are case-insensitive.',

      /* Errors */
      'err.unknown':        "unknown command: '{raw}'",
      'err.tip':            "Type 'help' to see available commands.",
      'err.ended':          "Simulation complete. Type 'restart' to play again.",
      'err.restarting':     '[*] Restarting simulation...',
      'err.reset.done':     '[*] Data wiped. Reloading...',

      /* PROLOG */
      'prolog.1':           '[MSG] Pix3l: "Elias, we don\'t have much time. V Corp is getting suspicious.',
      'prolog.2':           '       Get into the Iron Vault backup server now!',
      'prolog.3':           "       Type 'help' for help or 'scan' to start.\"",

      /* M1 */
      'm1.1':               '[!] Starting scan on target: iron-vault.vcorp.com',
      'm1.2':               '[.] Resolving hostname...',
      'm1.3':               '[.] Scanning 1000 common ports...',
      'm1.4':               '[+] Port 22   (SSH)    — FILTERED',
      'm1.5':               '[+] Port 80   (HTTP)   — CLOSED',
      'm1.6':               '[+] Port 443  (HTTPS)  — OPEN',
      'm1.7':               '[+] Port 8080 (HVAC)   — OPEN  <-- entry point',
      'm1.8':               '[MSG] Pix3l: "Nice! Their HVAC cooling system is exposed',
      'm1.9':               '       on port 8080. That\'s our way to melt their backup',
      'm1.10':              '       data tapes. Run the exploit script now!"',

      /* M2 */
      'm2.1':               '[!] Running hvac_exploit.py --target :8080',
      'm2.2':               '[.] Loading payload...',
      'm2.3':               '[.] Exploiting system...',
      'm2.4':               '[.] Bypassing authentication...',
      'm2.5':               '[SUCCESS] Admin access granted.',
      'm2.6':               '[+] Shell active: /cgi-bin/hvac/control',
      'm2.7':               '[?] V01d: "(Inner) I\'m inside the server room\'s climate',
      'm2.8':               '         control. I need to raise the temperature — fast."',

      /* M3 */
      'm3.1':               '[!] Modifying thermostat configuration...',
      'm3.2':               '[.] Set point: 18°C  →  60°C',
      'm3.3':               '[!] Disabling local alarm...',
      'm3.4':               '[+] Temp: 25°C',
      'm3.5':               '[+] Temp: 38°C',
      'm3.6':               '[+] Temp: 51°C',
      'm3.7':               '[+] Temp: 60°C  <-- CRITICAL',
      'm3.8':               '[CRITICAL WARNING] Hardware failure.',
      'm3.9':               '[CRITICAL WARNING] Data tapes destroyed.',
      'm3.10':              '[MSG] Pix3l: "It worked! V Corp backups are down! But their',
      'm3.11':              '       internal alarm just went off, Elias. Wipe the system',
      'm3.12':              '       logs now or they\'ll trace you!"',

      /* M4 */
      'm4.1':               '[!] Wiping system logs...',
      'm4.2':               '[+] Deleting /var/log/auth.log...         Done.',
      'm4.3':               '[+] Deleting /var/log/nginx/access.log... Done.',
      'm4.4':               '[+] Deleting /var/log/syslog...           Done.',
      'm4.5':               '[+] Shredding ~/.bash_history...          Done.',
      'm4.6':               '[!] Closing session...',
      'm4.7':               '[+] TOR connection closed safely.',
      'm4.8':               '[+] Your IP is lost among thousands of nodes.',
      'm4.9':               '[SYSTEM] Session terminated.',

      /* EPILOG */
      'epilogue.1':         'Hello, friend.',
      'epilogue.2':         'The world\'s debt has been erased.',
      'epilogue.3':         'V Corp has fallen. nullSociety wins!',
      'epilogue.4':         "Type 'restart' to replay the simulation.",

      /* Tutorial */
      'tut.title':          'MANUAL BOOK — nullSociety',
      'tut.intro':          'You play as Elias (V01d), a hacker from the nullSociety collective. Your partner Darla (Pix3l) will guide you via encrypted messages. Target: Iron Vault, owned by V Corp.',
      'tut.howto':          'HOW TO PLAY',
      'tut.howto1':         'Type commands in the terminal and press Enter.',
      'tut.howto2':         "Use 'help' to see the required command for the active mission.",
      'tut.howto3':         "Use 'clear' to wipe the screen.",
      'tut.howto4':         "Use 'restart' to replay from the beginning.",
      'tut.cmdtitle':       'MISSION COMMANDS',
      'tut.cmd1':           'Mission 1 — <code>scan</code>',
      'tut.cmd2':           'Mission 2 — <code>run-exploit --port 8080</code>',
      'tut.cmd3':           'Mission 3 — <code>set-temp --room-all 60C</code>',
      'tut.cmd4':           'Mission 4 — <code>clear-log</code>',
      'tut.tips':           'Tip: progress is saved automatically. If your phone refreshes, you resume at the last mission.',

      /* Prompt tags */
      'tag.offline':        'offline'
    }
  };

  function t(key, vars) {
    let str = (I18N[lang] && I18N[lang][key]) || key;
    if (vars) {
      for (const k in vars) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      }
    }
    return str;
  }

  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.documentElement.lang = lang;
    $langValue.textContent = lang.toUpperCase();
    $statusLog.textContent = t('status.saved');
  }

  /* =======================================================
     5. HELPERS
     ======================================================= */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  function scrollBottom() {
    $output.scrollTop = $output.scrollHeight;
  }

  function appendLine(text = '', cls = '') {
    const div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    $output.appendChild(div);
    scrollBottom();
    return div;
  }

  function typeLine(text, cls = '', speed = 18) {
    return new Promise(resolve => {
      const div = appendLine('', cls);
      if (!text) { resolve(); return; }

      let i = 0;
      const len = text.length;
      const chunkSize = len > 60 ? 2 : 1;

      const tick = () => {
        if (i >= len) { resolve(); return; }
        for (let k = 0; k < chunkSize && i < len; k++) {
          div.textContent += text[i++];
        }
        scrollBottom();
        if (i % 3 === 0) Sfx.keyClick();
        setTimeout(tick, speed);
      };
      tick();
    });
  }

  async function typeLines(lines, baseSpeed = 18) {
    $input.readOnly = true;
    for (const item of lines) {
      const text  = item.text  ?? '';
      const cls   = item.cls   ?? '';
      const speed = item.speed ?? baseSpeed;

      if (text === '') {
        appendLine('', '');
        await wait(60);
      } else {
        await typeLine(text, cls, speed);
      }
      await wait(40);
    }
    $input.readOnly = false;
    $input.focus();
  }

  function normalize(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function updatePrompt() {
    const tag = state.mission > 4 ? t('tag.offline') : 'm' + state.mission;
    $prompt.textContent = t('prompt.fmt', { tag });
  }

  /* =======================================================
     6. STORY BUILDERS (dibangun runtime agar i18n aktif)
     ======================================================= */
  function buildProlog() {
    return [
      { text: t('sys.boot1'), cls: 'sys' },
      { text: t('sys.boot2'), cls: 'sys' },
      { text: t('sys.boot3'), cls: 'sys' },
      { text: '' },
      { text: t('prolog.1'), cls: 'msg' },
      { text: t('prolog.2'), cls: 'msg' },
      { text: t('prolog.3'), cls: 'msg' },
      { text: '' },
      { text: t('sys.waiting'), cls: 'dim' }
    ];
  }

  function buildMissionOutput(n) {
    if (n === 1) return [
      { text: t('m1.1'), cls: 'dim' },
      { text: t('m1.2'), cls: 'dim' },
      { text: t('m1.3'), cls: 'dim' },
      { text: '' },
      { text: t('m1.4'), cls: '' },
      { text: t('m1.5'), cls: '' },
      { text: t('m1.6'), cls: '' },
      { text: t('m1.7'), cls: 'ok' },
      { text: '' },
      { text: t('m1.8'), cls: 'msg' },
      { text: t('m1.9'), cls: 'msg' },
      { text: t('m1.10'), cls: 'msg' },
      { text: '' },
      { text: t('sys.waiting'), cls: 'dim' }
    ];

    if (n === 2) return [
      { text: t('m2.1'), cls: 'dim' },
      { text: t('m2.2'), cls: 'dim' },
      { text: t('m2.3'), cls: 'dim' },
      { text: t('m2.4'), cls: 'dim' },
      { text: '' },
      { text: t('m2.5'), cls: 'ok' },
      { text: t('m2.6'), cls: 'ok' },
      { text: '' },
      { text: t('m2.7'), cls: 'phantom' },
      { text: t('m2.8'), cls: 'phantom' },
      { text: '' },
      { text: t('sys.waiting'), cls: 'dim' }
    ];

    if (n === 3) return [
      { text: t('m3.1'), cls: 'dim' },
      { text: t('m3.2'), cls: 'warn' },
      { text: t('m3.3'), cls: 'warn' },
      { text: '' },
      { text: t('m3.4'), cls: 'dim' },
      { text: t('m3.5'), cls: 'dim' },
      { text: t('m3.6'), cls: 'dim' },
      { text: t('m3.7'), cls: 'ok' },
      { text: '' },
      { text: t('m3.8'), cls: 'err blink' },
      { text: t('m3.9'), cls: 'err blink' },
      { text: '' },
      { text: t('m3.10'), cls: 'msg' },
      { text: t('m3.11'), cls: 'msg' },
      { text: t('m3.12'), cls: 'msg' },
      { text: '' },
      { text: t('sys.waiting'), cls: 'dim' }
    ];

    if (n === 4) return [
      { text: t('m4.1'), cls: 'dim' },
      { text: t('m4.2'), cls: 'ok' },
      { text: t('m4.3'), cls: 'ok' },
      { text: t('m4.4'), cls: 'ok' },
      { text: t('m4.5'), cls: 'ok' },
      { text: '' },
      { text: t('m4.6'), cls: 'dim' },
      { text: t('m4.7'), cls: 'ok' },
      { text: t('m4.8'), cls: 'ok' },
      { text: '' },
      { text: t('m4.9'), cls: 'sys' }
    ];

    return [];
  }

  function buildEpilogue() {
    return [
      { text: '' },
      { text: '════════════════════════════════════════', cls: 'ok' },
      { text: '         GAME OVER  —  VICTORY', cls: 'ok' },
      { text: '════════════════════════════════════════', cls: 'ok' },
      { text: '' },
      { text: t('epilogue.1'), cls: 'info' },
      { text: t('epilogue.2'), cls: 'info' },
      { text: t('epilogue.3'), cls: 'ok' },
      { text: '' },
      { text: t('epilogue.4'), cls: 'dim' }
    ];
  }

  function buildTutorialHTML() {
    return `
      <h4>${t('tut.title')}</h4>
      <p>${t('tut.intro')}</p>
      <h4>${t('tut.howto')}</h4>
      <ul>
        <li>${t('tut.howto1')}</li>
        <li>${t('tut.howto2')}</li>
        <li>${t('tut.howto3')}</li>
        <li>${t('tut.howto4')}</li>
      </ul>
      <h4>${t('tut.cmdtitle')}</h4>
      <ul>
        <li>${t('tut.cmd1')}</li>
        <li>${t('tut.cmd2')}</li>
        <li>${t('tut.cmd3')}</li>
        <li>${t('tut.cmd4')}</li>
      </ul>
      <p style="color:#3a7a5a;">${t('tut.tips')}</p>
    `;
  }

  /* =======================================================
     7. MISSION TABLE
     ======================================================= */
  const MISSIONS = {
    1: { expected: 'scan',                    help: 'scan' },
    2: { expected: 'run-exploit --port 8080', help: 'run-exploit --port 8080' },
    3: { expected: 'set-temp --room-all 60c', help: 'set-temp --room-all 60C' },
    4: { expected: 'clear-log',               help: 'clear-log' }
  };

  /* =======================================================
     8. COMMAND HANDLER
     ======================================================= */
  function showHelp() {
    const m = state.mission;
    appendLine('', '');
    appendLine(t('help.title'), 'info');
    appendLine(t('help.help'), '');
    appendLine(t('help.clear'), '');
    appendLine(t('help.restart'), '');

    if (m >= 1 && m <= 4) {
      appendLine('', '');
      appendLine(t('help.active'), 'info');
      appendLine('   ' + MISSIONS[m].help, 'ok');
    }
    appendLine('', '');
    appendLine(t('help.footer'), 'dim');
    appendLine('', '');
  }

  async function runMissionSuccess(missionNum) {
    Sfx.ok();

    if (missionNum === 3) {
      setTimeout(() => Sfx.alert(), 1200);
    }

    await typeLines(buildMissionOutput(missionNum), 16);

    if (missionNum < 4) {
      state.mission = missionNum + 1;
      saveState();
      updatePrompt();
    } else {
      state.mission = 5;
      saveState();
      updatePrompt();
      await wait(900);
      await typeLines(buildEpilogue(), 20);
    }
  }

  async function handleCommand(raw) {
    const norm = normalize(raw);
    if (!norm) return;

    appendLine($prompt.textContent + ' ' + raw, 'cmd');

    const first = norm.split(' ')[0];

    if (first === 'help')    { showHelp(); return; }
    if (first === 'clear')   { $output.innerHTML = ''; return; }

    if (first === 'restart') {
      appendLine(t('err.restarting'), 'warn');
      Sfx.error();
      wipeState();
      await wait(600);
      location.reload();
      return;
    }

    if (state.mission > 4) {
      Sfx.error();
      appendLine(t('err.ended'), 'err');
      return;
    }

    const m = MISSIONS[state.mission];
    if (norm === m.expected) {
      await runMissionSuccess(state.mission);
      return;
    }

    Sfx.error();
    appendLine(t('err.unknown', { raw }), 'err');
    appendLine(t('err.tip'), 'dim');
  }

  /* =======================================================
     9. EVENT LISTENERS
     ======================================================= */
  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($input.readOnly) return;
    const raw = $input.value;
    $input.value = '';
    if (raw.trim()) handleCommand(raw);
  });

  $input.addEventListener('keydown', (e) => {
    Sfx.init();
    Sfx.resume();
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      Sfx.keyClick();
    }
  });

  $soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Sfx.init();
    Sfx.resume();
    const on = Sfx.toggle();
    $soundBtn.textContent = on ? '🔊' : '🔇';
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.icon-btn')) return;
    if (e.target.closest('.menu-overlay.open')) return;
    if (e.target.closest('.btn')) return;
    Sfx.init();
    Sfx.resume();
    $input.focus();
  });

  /* --- Menu open/close --- */
  function openMenu() {
    $menuOverlay.classList.add('open');
    $menuOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    $menuOverlay.classList.remove('open');
    $menuOverlay.setAttribute('aria-hidden', 'true');
    $tutorialBox.hidden = true;
    $input.focus();
  }

  $menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Sfx.init(); Sfx.resume();
    openMenu();
  });
  $menuClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });
  $menuOverlay.addEventListener('click', (e) => {
    if (e.target === $menuOverlay) closeMenu();
  });

  /* --- Tutorial toggle --- */
  $optTutorial.addEventListener('click', () => {
    if ($tutorialBox.hidden) {
      $tutorialContent.innerHTML = buildTutorialHTML();
      $tutorialBox.hidden = false;
    } else {
      $tutorialBox.hidden = true;
    }
  });

  /* --- Language toggle --- */
  $optLanguage.addEventListener('click', () => {
    lang = (lang === 'id') ? 'en' : 'id';
    saveLang(lang);
    applyStaticI18n();
    updatePrompt();
    if (!$tutorialBox.hidden) {
      $tutorialContent.innerHTML = buildTutorialHTML();
    }
  });

  /* --- Reset with confirm --- */
  function openConfirm() {
    $confirmTitle.textContent = t('confirm.title');
    $confirmBody.textContent  = t('confirm.body');
    $confirmCancel.textContent = t('confirm.cancel');
    $confirmOk.textContent     = t('confirm.ok');
    $confirmOverlay.classList.add('open');
    $confirmOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeConfirm() {
    $confirmOverlay.classList.remove('open');
    $confirmOverlay.setAttribute('aria-hidden', 'true');
  }

  $optReset.addEventListener('click', (e) => {
    e.stopPropagation();
    openConfirm();
  });
  $confirmCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    closeConfirm();
  });
  $confirmOverlay.addEventListener('click', (e) => {
    if (e.target === $confirmOverlay) closeConfirm();
  });
  $confirmOk.addEventListener('click', async (e) => {
    e.stopPropagation();
    wipeState();
    closeConfirm();
    closeMenu();
    $output.innerHTML = '';
    appendLine(t('err.reset.done'), 'warn');
    Sfx.error();
    await wait(700);
    location.reload();
  });

  /* =======================================================
     10. BOOT SEQUENCE
     ======================================================= */
  async function boot() {
    applyStaticI18n();
    updatePrompt();

    if (state.fresh && state.mission === 1) {
      // Sesi baru — Prolog
      setTimeout(() => Sfx.boot(), 250);
      await typeLines(buildProlog(), 20);
      state.fresh = false;
      saveState();
    } else if (state.mission > 4) {
      // Sudah tamat
      appendLine(t('sys.session.done'), 'sys');
      appendLine(t('sys.hint.restart'), 'dim');
      appendLine('', '');
    } else {
      // Lanjutkan sesi
      appendLine(t('sys.session.found'), 'sys');
      await wait(400);
      appendLine(t('sys.session.resume'), 'sys');
      appendLine(t('sys.session.miss', { n: state.mission }), 'sys');
      appendLine(t('sys.hint.help'), 'dim');
      appendLine('', '');
    }

    $input.readOnly = false;
    $input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
