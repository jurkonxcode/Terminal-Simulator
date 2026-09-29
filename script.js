/* =========================================================
   Terminal Simulator // nullSociety
   Interactive Hacking Fiction
   File: script.js
   ========================================================= */

(() => {
  'use strict';

  /* =======================================================
     1. DOM REFERENCES
     ======================================================= */
  const $output   = document.getElementById('output');
  const $input    = document.getElementById('cmd');
  const $form     = document.getElementById('inputForm');
  const $prompt   = document.getElementById('prompt');
  const $soundBtn = document.getElementById('soundBtn');

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

    function isEnabled() {
      return enabled;
    }

    /* --- Internal beep helper --- */
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

    /* --- Mechanical keyboard: 2-layer click --- */
    function keyClick() {
      if (!enabled || !ctx) return;
      const now = performance.now();
      if (now - lastClick < 22) return;
      lastClick = now;

      const t = ctx.currentTime;

      // Layer 1 — high-freq "click"
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

      // Layer 2 — low-freq "thock"
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
     3. STATE (localStorage save)
     ======================================================= */
  const SAVE_KEY = 'nullSociety_save_v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.mission === 'number') {
          return { mission: s.mission, fresh: false };
        }
      }
    } catch (e) { /* corrupt save, ignore */ }
    return { mission: 1, fresh: true };
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: state.mission }));
    } catch (e) {}
  }

  function wipeState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  let state = loadState();

  /* =======================================================
     4. HELPERS
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

  /* Typewriter satu baris */
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

  /* Typewriter beberapa baris sekaligus */
  async function typeLines(lines, baseSpeed = 18) {
    $input.readOnly = true;
    for (const item of lines) {
      const text  = item.text ?? '';
      const cls   = item.cls  ?? '';
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
    const tag = state.mission > 4 ? 'offline' : `m${state.mission}`;
    $prompt.textContent = `v01d@nullSociety[${tag}]:~$`;
  }

  /* =======================================================
     5. STORY DATA
     ======================================================= */

  const PROLOG = [
    { text: '[SYSTEM] Booting nullSociety client v2.1...', cls: 'sys' },
    { text: '[SYSTEM] Connecting via proxy... SUCCESS.', cls: 'sys' },
    { text: '[SYSTEM] Encrypting tunnel (AES-256)... OK.', cls: 'sys' },
    { text: '' },
    { text: '[MSG] Pix3l: "Elias, waktu kita sempit. V Corp mulai curiga.', cls: 'msg' },
    { text: '       Masuk ke server cadangan Iron Vault sekarang!', cls: 'msg' },
    { text: "       Ketik 'help' untuk bantuan atau 'scan' untuk mulai.\"", cls: 'msg' },
    { text: '' },
    { text: '[SYSTEM] Menunggu perintah...', cls: 'dim' }
  ];

  const MISSION_OUTPUT = {
    1: [
      { text: '[!] Memulai pemindaian target: iron-vault.vcorp.com', cls: 'dim' },
      { text: '[.] Resolving hostname...', cls: 'dim' },
      { text: '[.] Scanning 1000 common ports...', cls: 'dim' },
      { text: '' },
      { text: '[+] Port 22   (SSH)    — FILTERED', cls: '' },
      { text: '[+] Port 80   (HTTP)   — CLOSED', cls: '' },
      { text: '[+] Port 443  (HTTPS)  — OPEN', cls: '' },
      { text: '[+] Port 8080 (HVAC)   — OPEN  <-- celah', cls: 'ok' },
      { text: '' },
      { text: '[MSG] Pix3l: "Bagus! Sistem pendingin (HVAC) mereka terbuka di', cls: 'msg' },
      { text: '       port 8080. Itu celah kita untuk melelehkan pita data', cls: 'msg' },
      { text: '       cadangan mereka. Jalankan skrip eksploitasi sekarang!"', cls: 'msg' },
      { text: '' },
      { text: '[SYSTEM] Menunggu perintah...', cls: 'dim' }
    ],
    2: [
      { text: '[!] Menjalankan hvac_exploit.py --target :8080', cls: 'dim' },
      { text: '[.] Loading payload...', cls: 'dim' },
      { text: '[.] Exploiting system...', cls: 'dim' },
      { text: '[.] Bypassing authentication...', cls: 'dim' },
      { text: '' },
      { text: '[SUCCESS] Admin access granted.', cls: 'ok' },
      { text: '[+] Shell aktif: /cgi-bin/hvac/control', cls: 'ok' },
      { text: '' },
      { text: '[?] V01d: "(Batin) Aku sudah masuk ke sistem suhu ruangan server.', cls: 'phantom' },
      { text: '         Aku harus menaikkan suhunya sampai ekstrem."', cls: 'phantom' },
      { text: '' },
      { text: '[SYSTEM] Menunggu perintah...', cls: 'dim' }
    ],
    3: [
      { text: '[!] Mengubah konfigurasi thermostat...', cls: 'dim' },
      { text: '[.] Set point: 18°C  →  60°C', cls: 'warn' },
      { text: '[!] Menonaktifkan alarm lokal...', cls: 'warn' },
      { text: '' },
      { text: '[+] Suhu: 25°C', cls: 'dim' },
      { text: '[+] Suhu: 38°C', cls: 'dim' },
      { text: '[+] Suhu: 51°C', cls: 'dim' },
      { text: '[+] Suhu: 60°C  <-- KRITIS', cls: 'ok' },
      { text: '' },
      { text: '[CRITICAL WARNING] Hardware failure.', cls: 'err' },
      { text: '[CRITICAL WARNING] Data tapes destroyed.', cls: 'err' },
      { text: '' },
      { text: '[MSG] Pix3l: "Berhasil! Data V Corp lumpuh! Tapi alarm internal', cls: 'msg' },
      { text: '       mereka menyala, Elias. Cepat hapus log sistem atau', cls: 'msg' },
      { text: '       kamu akan dilacak!"', cls: 'msg' },
      { text: '' },
      { text: '[SYSTEM] Menunggu perintah...', cls: 'dim' }
    ],
    4: [
      { text: '[!] Menghapus log sistem...', cls: 'dim' },
      { text: '[+] Deleting /var/log/auth.log...         Done.', cls: 'ok' },
      { text: '[+] Deleting /var/log/nginx/access.log... Done.', cls: 'ok' },
      { text: '[+] Deleting /var/log/syslog...           Done.', cls: 'ok' },
      { text: '[+] Shredding ~/.bash_history...          Done.', cls: 'ok' },
      { text: '' },
      { text: '[!] Menutup sesi...', cls: 'dim' },
      { text: '[+] Koneksi TOR terputus dengan aman.', cls: 'ok' },
      { text: '[+] IP-mu hilang di antara ribuan node.', cls: 'ok' },
      { text: '' },
      { text: '[SYSTEM] Sesi berakhir.', cls: 'sys' }
    ]
  };

  const EPILOG = [
    { text: '' },
    { text: '════════════════════════════════════════', cls: 'ok' },
    { text: '         GAME OVER  —  VICTORY', cls: 'ok' },
    { text: '════════════════════════════════════════', cls: 'ok' },
    { text: '' },
    { text: 'Hello, friend.', cls: 'info' },
    { text: 'Utang dunia telah dihapus.', cls: 'info' },
    { text: 'V Corp tumbang. nullSociety menang!', cls: 'ok' },
    { text: '' },
    { text: "Ketik 'restart' untuk mengulang simulasi.", cls: 'dim' }
  ];

  const MISSIONS = {
    1: { expected: 'scan',                    help: 'scan',                    output: MISSION_OUTPUT[1] },
    2: { expected: 'run-exploit --port 8080', help: 'run-exploit --port 8080', output: MISSION_OUTPUT[2] },
    3: { expected: 'set-temp --room-all 60c', help: 'set-temp --room-all 60C', output: MISSION_OUTPUT[3] },
    4: { expected: 'clear-log',               help: 'clear-log',               output: MISSION_OUTPUT[4] }
  };

  /* =======================================================
     6. COMMANDS
     ======================================================= */

  function showHelp() {
    const m = state.mission;
    appendLine('', '');
    appendLine('PERINTAH TERSEDIA:', 'info');
    appendLine('  help      tampilkan bantuan', '');
    appendLine('  clear     bersihkan layar', '');
    appendLine('  restart   ulang simulasi dari awal', '');

    if (m >= 1 && m <= 4) {
      appendLine('', '');
      appendLine('>> Perintah misi aktif:', 'info');
      appendLine(`   ${MISSIONS[m].help}`, 'ok');
    }
    appendLine('', '');
  }

  async function runMissionSuccess(missionNum) {
    const m = MISSIONS[missionNum];
    Sfx.ok();

    if (missionNum === 3) {
      setTimeout(() => Sfx.alert(), 1200);
    }

    await typeLines(m.output, 16);

    if (missionNum < 4) {
      state.mission = missionNum + 1;
      saveState();
      updatePrompt();
    } else {
      state.mission = 5;
      saveState();
      updatePrompt();
      await wait(900);
      await typeLines(EPILOG, 20);
    }
  }

  async function handleCommand(raw) {
    const norm = normalize(raw);
    if (!norm) return;

    // Echo perintah yang diketik
    appendLine($prompt.textContent + ' ' + raw, 'cmd');

    const first = norm.split(' ')[0];

    // Perintah universal
    if (first === 'help')    { showHelp(); return; }
    if (first === 'clear')   { $output.innerHTML = ''; return; }

    if (first === 'restart') {
      appendLine('[*] Merestart simulasi...', 'warn');
      Sfx.error();
      wipeState();
      await wait(600);
      location.reload();
      return;
    }

    // Sudah tamat
    if (state.mission > 4) {
      Sfx.error();
      appendLine("Simulasi selesai. Ketik 'restart' untuk mengulang.", 'err');
      return;
    }

    // Cek perintah misi
    const m = MISSIONS[state.mission];
    if (norm === m.expected) {
      await runMissionSuccess(state.mission);
      return;
    }

    // Salah perintah
    Sfx.error();
    appendLine(`perintah tidak dikenal: '${raw}'`, 'err');
    appendLine("Ketik 'help' untuk melihat perintah yang tersedia.", 'dim');
  }

  /* =======================================================
     7. EVENT LISTENERS
     ======================================================= */

  // Submit perintah (Enter)
  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($input.readOnly) return;

    const raw = $input.value;
    $input.value = '';
    if (raw.trim()) handleCommand(raw);
  });

  // Sound keyboard tiap ketukan
  $input.addEventListener('keydown', (e) => {
    Sfx.init();
    Sfx.resume();
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      Sfx.keyClick();
    }
  });

  // Toggle suara
  $soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Sfx.init();
    Sfx.resume();
    const on = Sfx.toggle();
    $soundBtn.textContent = on ? '🔊' : '🔇';
  });

  // Klik area mana saja → fokus ke input
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.sound-btn')) return;
    Sfx.init();
    Sfx.resume();
    $input.focus();
  });

  /* =======================================================
     8. BOOT SEQUENCE
     ======================================================= */
  async function boot() {
    updatePrompt();

    if (state.fresh && state.mission === 1) {
      // Sesi baru
      setTimeout(() => Sfx.boot(), 250);
      await typeLines(PROLOG, 20);
      state.fresh = false;
      saveState();
    } else if (state.mission > 4) {
      // Sudah tamat
      appendLine('[SYSTEM] Sesi sebelumnya telah selesai.', 'sys');
      appendLine("Ketik 'restart' untuk mengulang dari awal.", 'dim');
      appendLine('', '');
    } else {
      // Lanjutkan sesi
      appendLine('[SYSTEM] Melanjutkan sesi terenkripsi...', 'sys');
      appendLine(`[SYSTEM] Kamu berada di Misi ${state.mission}.`, 'sys');
      appendLine("[SYSTEM] Ketik 'help' untuk melihat perintah.", 'dim');
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
