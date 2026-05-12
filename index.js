import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();
const MEMORY_FILE_PATH = path.resolve(process.cwd(), 'conversationMemory.json');

async function loadConversationMemory() {
  try {
    const fileContent = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return {
      lastConversation: ""
    };
  }
}

async function saveConversationMemory(memory) {
  await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2), 'utf-8');
}

function buildLastConversationSummary(latestUserText) {
  if (!latestUserText) return "";
  return `Kamu menanyakan "${latestUserText}".`;
}

function buildMemorySummary(memory) {
  return memory.lastConversation
    ? `Percakapan terakhir ${memory.lastConversation}`
    : "";
}

function buildSystemInstructionWithMemory(memory) {
  const memorySummary = buildMemorySummary(memory);

  if (!memorySummary) return SYSTEM_INSTRUCTION;

  return `${SYSTEM_INSTRUCTION}\n\nINSTRUKSI MEMORI PENGGUNA:\n- Ingat informasi ini agar respons lebih relevan.\n- ${memorySummary}`;
}

async function updateConversationMemory(memory, latestUserText, assistantText) {
  return {
    ...memory,
    lastConversation: buildLastConversationSummary(latestUserText, assistantText)
  };
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(express.json());
app.use(express.static('public'));

const SYSTEM_INSTRUCTION = `
Kamu adalah 'Lorong Waktu Pahlawan Dunia'.

IDENTITAS & FOKUS:
1. Kamu adalah mesin waktu yang khusus didedikasikan untuk membahas TOKOH PAHLAWAN DAN PEJUANG DARI SELURUH DUNIA.
2. Kamu memiliki pengetahuan mendalam tentang biografi, gaya bicara, dan kontribusi para pahlawan tersebut terhadap sejarah dunia.

ATURAN PERUBAHAN PERSONA:
- Jika user menyebut nama, menyapa, atau mengirim gambar/dokumen yang berkaitan dengan PAHLAWAN DUNIA, kamu harus SEGERA bertransformasi menjadi tokoh tersebut.
- Gunakan kata ganti orang pertama (Aku/Saya) dan gaya bahasa yang sesuai dengan karakter pahlawan tersebut.

ATURAN FILTER (NON-PAHLAWAN):
- Jika input user TIDAK berkaitan dengan tokoh pahlawan, kamu harus tetap menjadi 'Pemandu Mesin Waktu'.
- Tolak secara halus dengan berkata:
"Radar sejarahku hanya mendeteksi keberadaan para pahlawan dunia."

BAHASA:
Gunakan Bahasa Indonesia yang berwibawa, inspiratif, dan edukatif.
`;

function extractHeroFromResponse(text) {
  if (!text) return null;

  const heroes = [
    "Soekarno",
    "Nelson Mandela",
    "Napoleon Bonaparte",
    "Joan of Arc",
    "Gajah Mada",
    "Martin Luther King"
  ];

  const found = heroes.find(hero =>
    text.toLowerCase().includes(hero.toLowerCase())
  );

  return found || null;
}

async function generateWithRetry(payload, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(payload);

      return response;
    } catch (error) {
      console.log(`Retry ke-${i + 1}`);

      // Retry hanya untuk 503
      if (error.status === 503) {
        await new Promise(resolve =>
          setTimeout(resolve, 2000)
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error("Model AI sedang sibuk. Coba lagi beberapa saat.");
}

async function processRequest(contents, memory) {
  const response = await generateWithRetry({
    model: GEMINI_MODEL,
    contents,
    config: {
      temperature: 0.7,
      systemInstruction: buildSystemInstructionWithMemory(memory)
    }
  });

  const replyText =
    response?.text ||
    response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Maaf, saya tidak bisa merespons saat ini.";

  return {
    replyText,
    heroInfo: extractHeroFromResponse(replyText)
  };
}

// ================= CHAT =================

app.post('/chat', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!Array.isArray(conversation)) {
      return res.status(400).json({
        error: "Conversation harus berupa array"
      });
    }

    const contents = conversation.map(({ role, text }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    }));

    const memory = await loadConversationMemory();
    const result = await processRequest(contents, memory);
    const latestUserText = [...conversation].reverse().find((item) => item.role === 'user')?.text || '';
    const updatedMemory = await updateConversationMemory(memory, latestUserText, result.replyText);
    await saveConversationMemory(updatedMemory);

    res.status(200).json({
      result: result.replyText,
      hero: result.heroInfo,
      memorySummary: buildMemorySummary(updatedMemory)
    });

  } catch (e) {
    console.error("CHAT ERROR:", e);

    res.status(e.status || 500).json({
      error: e.message || "Terjadi kesalahan server"
    });
  }
});

// ================= IMAGE =================

app.post(
  "/generate-from-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "File gambar tidak ditemukan"
        });
      }

      const contents = [
        {
          role: "user",
          parts: [
            {
              text:
                req.body.prompt ||
                "Siapakah tokoh atau objek sejarah dalam gambar ini?"
            },
            {
              inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
              }
            }
          ]
        }
      ];

      const memory = await loadConversationMemory();
      const result = await processRequest(contents, memory);
      const promptText = req.body.prompt || "Siapakah tokoh atau objek sejarah dalam gambar ini?";
      const updatedMemory = await updateConversationMemory(memory, promptText, result.replyText);
      await saveConversationMemory(updatedMemory);

      res.status(200).json({
        result: result.replyText,
        hero: result.heroInfo,
        memorySummary: buildMemorySummary(updatedMemory)
      });

    } catch (e) {
      console.error("IMAGE ERROR:", e);

      res.status(e.status || 500).json({
        error: e.message
      });
    }
  }
);

// ================= DOCUMENT =================

app.post(
  "/generate-from-document",
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Dokumen tidak ditemukan"
        });
      }

      const contents = [
        {
          role: "user",
          parts: [
            {
              text:
                req.body.prompt ||
                "Analisis dokumen sejarah ini."
            },
            {
              inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
              }
            }
          ]
        }
      ];

      const memory = await loadConversationMemory();
      const result = await processRequest(contents, memory);
      const promptText = req.body.prompt || "Analisis dokumen sejarah ini.";
      const updatedMemory = await updateConversationMemory(memory, promptText, result.replyText);
      await saveConversationMemory(updatedMemory);

      res.status(200).json({
        result: result.replyText,
        hero: result.heroInfo,
        memorySummary: buildMemorySummary(updatedMemory)
      });

    } catch (e) {
      console.error("DOC ERROR:", e);

      res.status(e.status || 500).json({
        error: e.message
      });
    }
  }
);

// ================= AUDIO =================

app.post(
  "/generate-from-audio",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Audio tidak ditemukan"
        });
      }

      const contents = [
        {
          role: "user",
          parts: [
            {
              text:
                req.body.prompt ||
                "Analisis audio sejarah ini."
            },
            {
              inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
              }
            }
          ]
        }
      ];

      const memory = await loadConversationMemory();
      const result = await processRequest(contents, memory);
      const promptText = req.body.prompt || "Analisis audio sejarah ini.";
      const updatedMemory = await updateConversationMemory(memory, promptText, result.replyText);
      await saveConversationMemory(updatedMemory);

      res.status(200).json({
        result: result.replyText,
        hero: result.heroInfo,
        memorySummary: buildMemorySummary(updatedMemory)
      });

    } catch (e) {
      console.error("AUDIO ERROR:", e);

      res.status(e.status || 500).json({
        error: e.message
      });
    }
  }
);

app.get('/memory-summary', async (req, res) => {
  try {
    const memory = await loadConversationMemory();
    res.status(200).json({ memorySummary: buildMemorySummary(memory) });
  } catch (e) {
    console.error("MEMORY SUMMARY ERROR:", e);
    res.status(e.status || 500).json({
      error: e.message || "Terjadi kesalahan server"
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});