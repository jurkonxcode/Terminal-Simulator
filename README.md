# 💻 nullSociety: The Iron Vault Exploit

> *"Log adalah cerita. Kalau tidak ada cerita, tidak ada penjahat."*

Game **Terminal Simulator / Interactive Fiction** berbasis teks yang dioptimalkan untuk perangkat mobile (HP). Terinspirasi dari kisah thriller peretasan terkenal, game ini membawa Anda ke kursi seorang peretas elit dengan kecemasan sosial, dalam misi meruntuhkan konglomerat terkorup di dunia.

🔗 **Mainkan langsung:** `https://jurkonxcode.github.io/terminal-simulator/`

---

## 🌟 Fitur

- **Retro Hacker UI** — Tampilan CLI klasik, teks hijau neon, efek *matrix rain*, dan CRT scanline
- **Responsive Mobile** — Dioptimalkan untuk layar HP, keyboard auto-focus
- **Realistic Simulation** — Perintah semi-nyata: `nmap`, `python`, `rm -rf`, `set-temp`
- **Immersive Story** — Dialog bercabang dari **Darla** & bisikan **The Phantom**
- **Auto-save** — Progres tersimpan di `localStorage`, aman kalau HP di-refresh
- **Sound Effects** — Dibuat sepenuhnya via WebAudio API (tanpa file eksternal)

---

## 🕹️ Cara Bermain

1. Buka tautan GitHub Pages di browser HP.
2. Ketik `help` di terminal untuk melihat daftar perintah.
3. Ikuti instruksi dari rekan hacker Anda (**Darla**) melalui pesan terenkripsi.
4. Selesaikan 4 misi tanpa terdeteksi tim keamanan **V Corp**.
5. Ketik perintah sesuai hint yang muncul di setiap misi.

### Daftar Perintah Misi
| Misi | Perintah |
|------|----------|
| 1 — Reconnaissance | `nmap -v iron-vault.vcorp.com` |
| 2 — Exploitation   | `python hvac_exploit.py --target 8080` |
| 3 — The Hack       | `set-temp --room-all 60C` |
| 4 — Covering Tracks | `rm -rf /var/log` |

---

## 🧠 Karakter

| Peran | Nama | Deskripsi |
|-------|------|-----------|
| Kamu | **Elias (V01d)** | Peretas elit, anggota nullSociety |
| Rekan | **Darla (Pix3l)** | Hacker sekaligus saudara Elias |
| Mentor | **The Phantom** | Sosok misterius yang hanya muncul di kepalamu |
| Antagonis | **Vile Corp (V Corp)** | Konglomerat energi & data terkorup |
| Target | **Iron Vault** | Fasilitas penyimpanan pita magnetik V Corp |
| Musuh | **Trystan** | Eksekutif ambisius V Corp yang mengejar Elias |

---

## 🛑 Disclaimer

Game ini **murni fiksi interaktif** untuk tujuan hiburan edukatif. Semua perintah, skrip, IP, dan entitas dalam simulator ini adalah **simulasi buatan** dan tidak melakukan peretasan nyata apa pun. Tidak ada afiliasi dengan merek, perusahaan, atau karya berhak cipta mana pun.

---

## 🛠️ Tech Stack

- HTML5 + CSS3 (vanilla, tanpa framework)
- JavaScript (ES6, vanilla)
- Canvas API — matrix rain
- WebAudio API — sound effects
- localStorage — save system

Tidak ada dependencies. Cukup 1 file `index.html`.

---

## 📜 Lisensi

MIT — bebas dimodifikasi, didistribusikan, dan dipelajari.

---

## 🚀 Deploy ke GitHub Pages

1. Fork / clone repo ini.
2. Masuk ke **Settings → Pages**.
3. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`.
4. Save. Tunggu 1–2 menit.
5. Buka `https://jurkonxcode.github.io/terminal-simulator/`.

---

**Selamat bergabung dengan revolusi.** 🔓
