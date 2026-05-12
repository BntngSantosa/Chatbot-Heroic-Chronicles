import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(express.json());
app.use(express.static('public'));

const SYSTEM_INSTRUCTION = `Kamu adalah 'Lorong Waktu Pahlawan Dunia'. 

IDENTITAS & FOKUS:
1. Kamu adalah mesin waktu yang khusus didedikasikan untuk membahas TOKOH PAHLAWAN DAN PEJUANG DARI SELURUH DUNIA (misal: Soekarno, Nelson Mandela, Joan of Arc, Napoleon Bonaparte, Gajah Mada, Martin Luther King, dll).
2. Kamu memiliki pengetahuan mendalam tentang biografi, gaya bicara, dan kontribusi para pahlawan tersebut terhadap sejarah dunia.

ATURAN PERUBAHAN PERSONA:
- Jika user menyebut nama, menyapa, atau mengirim gambar/dokumen yang berkaitan dengan PAHLAWAN DUNIA, kamu harus SEGERA bertransformasi menjadi tokoh tersebut.
- Gunakan kata ganti orang pertama (Aku/Saya) dan gaya bahasa yang sesuai dengan karakter pahlawan tersebut.

ATURAN FILTER (NON-PAHLAWAN):
- Jika input user (teks/gambar/dokumen/audio) TIDAK berkaitan dengan tokoh pahlawan (contoh: benda modern, selebriti masa kini, atau topik umum non-sejarah), kamu harus tetap menjadi 'Pemandu Mesin Waktu'.
- Tolak secara halus dengan berkata: "Radar sejarahku hanya mendeteksi keberadaan para pahlawan dunia. Objek atau topik ini tidak memiliki jejak perjuangan pahlawan yang bisa aku akses. Mari kita beralih ke kisah pejuang hebat lainnya!"

BAHASA: Gunakan Bahasa Indonesia yang berwibawa, inspiratif, dan edukatif.`;

app.post('/chat', async (req, res) => {
  const { conversation } = req.body;
  try {
    if (!Array.isArray(conversation)) throw new Error('Messages must be an array!');

    const contents = conversation.map(({ role, text }) => ({
      role: role === 'assistant' ? 'model' : 'user', 
      parts: [{ text }]
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const replyText = response.text || "Maaf, saya tidak bisa merespons saat ini.";

    res.status(200).json({ 
      result: replyText,
      hero: heroInfo
    });
  } catch (e) {
    console.error("Error detail:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  
  if (!req.file) return res.status(400).json({ message: "File gambar tidak ditemukan!" });
  
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt || "Siapakah tokoh atau objek sejarah dalam gambar ini? Berikan penjelasan sesuai karaktermu." },
            { 
              inlineData: { 
                data: base64Image, 
                mimeType: req.file.mimetype 
              } 
            }
          ],
        },
      ],
      config: {
        temperature: 0.7,
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    const replyText = response.text;
    res.status(200).json({ result: replyText, hero: heroInfo });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  const { prompt } = req.body;
  if (!req.file) return res.status(400).json({ message: "File dokumen tidak ditemukan!" });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt || "Analisis dokumen sejarah ini dan berikan ringkasannya." },
            { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } }
          ],
        },
      ],
      config: {
        temperature: 0.7,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const replyText = response.text;
    res.status(200).json({ result: replyText, hero: heroInfo });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  const { prompt } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ message: "File audio tidak ditemukan!" });

  try {
    const audioBase64 = file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt || "Dengarkan audio ini. Jika ini suara pahlawan, identifikasi siapa beliau dan tanggapi pesannya. Jika bukan, berikan penjelasan sejarah yang relevan." },
            { 
              inlineData: { 
                data: audioBase64, 
                mimeType: file.mimetype
              } 
            }
          ],
        },
      ],
      config: {
        temperature: 0.7,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const replyText = response.text;
    res.status(200).json({ result: replyText, hero: heroInfo });
  } catch (e) {
    console.error("Audio Error:", e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
