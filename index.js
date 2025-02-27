require("dotenv").config();
const express = require("express");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SESSION_PATH = "baileys_auth";
let sock; // Variabel global untuk socket WhatsApp

// 🔹 Start WhatsApp dengan Pairing Code
async function startWhatsApp() {
  try {
    console.log("📲 Menginisialisasi WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Jangan tampilkan QR Code
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, pairingCode } = update;

      if (pairingCode) {
        console.log(`🔗 Gunakan kode ini untuk login: ${pairingCode}`);
      }

      if (connection === "open") {
        console.log("✅ WhatsApp Terhubung!");
      }

      if (connection === "close") {
        console.error("🔄 Connection closed:", lastDisconnect?.error);
        if (lastDisconnect?.error?.output?.statusCode !== 401) {
          console.log("🔁 Mencoba reconnect...");
          startWhatsApp(); // Reconnect jika bukan error 401
        } else {
          console.log("⚠️ Session invalid, menghapus session...");
          fs.removeSync(SESSION_PATH);
        }
      }
    });

    // 🔹 Pastikan requestPairingCode dipanggil hanya jika perlu
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Delay agar koneksi siap

    if (!sock.authState.creds.registered) {
      const number = process.env.WA_PHONE_NUMBER;
      if (!number) {
        console.error("❌ ERROR: WA_PHONE_NUMBER belum diatur di .env");
        return;
      }
      try {
        const code = await sock.requestPairingCode(number);
        console.log(`🔑 Kode Pairing untuk ${number}: ${code}`);
      } catch (err) {
        console.error("❌ Gagal mendapatkan Pairing Code:", err);
      }
    }
  } catch (error) {
    console.error("❌ ERROR saat menginisialisasi WhatsApp:", error);
  }
}

// 🔹 API Endpoints
app.get("/", (req, res) => {
  res.send("🚀 WhatsApp API Running...");
});

// 📩 API untuk mengirim pesan
app.post("/send-message", async (req, res) => {
  try {
    if (!sock) {
      return res.status(500).json({ success: false, error: "WhatsApp belum terhubung" });
    }

    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ success: false, error: "Nomor dan pesan wajib diisi" });
    }

    // Validasi nomor agar hanya angka
    const sanitizedNumber = number.replace(/\D/g, ""); // Hapus karakter selain angka
    if (sanitizedNumber.length < 10) {
      return res.status(400).json({ success: false, error: "Nomor tidak valid" });
    }

    const chatId = `${sanitizedNumber}@s.whatsapp.net`;

    await sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: "Pesan berhasil dikirim" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim pesan:", error);
    res.status(500).json({ success: false, error: "Gagal mengirim pesan" });
  }
});

// 🔐 API untuk logout
app.get("/logout", async (req, res) => {
  try {
    fs.removeSync(SESSION_PATH);
    res.json({
      success: true,
      message: "Session dihapus, scan Pair Code lagi.",
    });

    // Jangan gunakan process.exit(0) karena bisa menyebabkan server mati.
    console.log("⚠️ Silakan restart server secara manual jika diperlukan.");
  } catch (error) {
    console.error("❌ ERROR saat logout:", error);
    res.status(500).json({ success: false, error: "Gagal menghapus session." });
  }
});

// 🚀 Jalankan server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `🌍 Server berjalan di port ${PORT} dan bisa diakses dari jaringan lain 🚀`
  );
  await startWhatsApp();
});
