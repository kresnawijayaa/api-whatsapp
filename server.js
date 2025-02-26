const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs-extra");
const qrcode = require("qrcode-terminal");

const app = express();
app.use(express.json());

const SESSION_PATH = "session_auth"; // Folder untuk menyimpan session

let sock; // Variabel global untuk socket WhatsApp

async function startWhatsApp() {
  console.log("Menginisialisasi WhatsApp...");

  // Gunakan MultiFileAuthState agar session tersimpan
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scan QR Code berikut untuk login:");
      qrcode.generate(qr, { small: true }); // Menampilkan QR di terminal
    }

    if (connection === "open") {
      console.log("WhatsApp Connected ✅");
    } else if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("Session expired. Silakan scan ulang QR Code.");
        fs.removeSync(SESSION_PATH); // Hapus session jika logout
      }
      console.log("WhatsApp Disconnected ❌, mencoba reconnect...");
      startWhatsApp(); // Reconnect otomatis
    }
  });

  console.log("WhatsApp is ready!");
}

// Jalankan WhatsApp saat server dimulai
startWhatsApp();

// API untuk mengirim pesan
app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) {
    return res
      .status(400)
      .json({ success: false, error: "Nomor dan pesan wajib diisi" });
  }

  const chatId = `${number}@s.whatsapp.net`; // Format nomor WhatsApp

  try {
    await sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: "Pesan berhasil dikirim" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API untuk menghapus session (logout)
app.get("/logout", async (req, res) => {
  try {
    fs.removeSync(SESSION_PATH); // Hapus folder session
    res.json({
      success: true,
      message: "Session berhasil dihapus, silakan scan QR lagi.",
    });
    console.log("Session dihapus. Harus scan ulang QR.");
    process.exit(0); // Restart server
  } catch (error) {
    res.status(500).json({ success: false, error: "Gagal menghapus session." });
  }
});

// Jalankan server
app.listen(3000, () => console.log("API berjalan di port 3000 🚀"));
