# Chatbot Lorong Waktu

Chatbot Lorong Waktu adalah aplikasi web interaktif yang menghadirkan percakapan dengan asisten bertema sejarah dan tokoh pahlawan dunia. Aplikasi ini menggunakan backend Node.js/Express untuk meneruskan permintaan ke API Gemini Google GenAI dan frontend sederhana untuk chat, lampiran file, rekaman suara, serta riwayat percakapan.

## Fitur Utama

- Chat bot dengan persona "Lorong Waktu Pahlawan Dunia"
- Penyimpanan memori percakapan terakhir
- Riwayat chat lokal dengan kemampuan:
  - Simpan percakapan
  - Hapus percakapan
  - Muat kembali percakapan sebelumnya
- Upload file:
  - Gambar
  - Dokumen
  - Audio
- Perekaman suara dengan mikrofon dan mengirim hasil rekaman ke backend
- UI ringkas dengan panel terpisah untuk riwayat chat

## Struktur Proyek

- `index.js` - Server Express utama dan integrasi dengan Google Gemini API
- `package.json` - Manajemen dependensi dan konfigurasi proyek
- `public/index.html` - Struktur antarmuka pengguna
- `public/style.css` - Styling aplikasi
- `public/script.js` - Logika UI, chat, file upload, perekaman suara, dan riwayat lokal
- `conversationMemory.json` - Penyimpanan ringkasan memori percakapan terakhir (dihasilkan runtime)

## Persiapan

1. Pastikan Node.js sudah terpasang.
2. Clone atau salin proyek ke mesin lokal.
3. Masuk ke folder proyek:

```bash
cd "C:/Users/bntngsantosa/Documents/Final Project Hacktiv8/Chatbot-lorong-waktu"
```

4. Instal dependensi:

```bash
npm install
```

5. Buat file `.env` pada folder proyek dan tambahkan kunci API Gemini:

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

## Menjalankan Aplikasi

Jalankan server dengan perintah:

```bash
node index.js
```

Kemudian buka browser dan akses:

```
http://localhost:3000
```

> Jika ingin workflow pengembangan lebih nyaman, kamu bisa menggunakan `nodemon` jika sudah terpasang secara global:
>
> ```bash
> npm nodemon index.js
> ```

## Penggunaan

- Ketik pesan di kotak input dan tekan `↵` atau klik tombol kirim.
- Gunakan tombol `+` untuk melampirkan file gambar, dokumen, atau audio.
- Tekan tombol mikrofon untuk merekam suara, lalu kirim rekaman hasilnya.
- Simpan percakapan yang sedang berlangsung dengan tombol `Simpan Percakapan` di panel riwayat.
- Pilih riwayat untuk memuat kembali percakapan sebelumnya.
- Tekan `Baru` untuk memulai percakapan kosong.

## Catatan

- Riwayat percakapan disimpan di `localStorage` browser.
- Memori percakapan terakhir disimpan di `conversationMemory.json` pada server.
- Fungsi AI bergantung pada kunci API Google Gemini yang valid.

## Dependensi

- `express`
- `dotenv`
- `multer`
- `@google/genai`
- `nodemon` (opsional untuk pengembangan)

## Lisensi

Proyek ini menggunakan lisensi `ISC` sesuai konfigurasi `package.json`.
