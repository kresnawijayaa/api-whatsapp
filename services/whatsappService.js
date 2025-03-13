const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");

const SESSION_PATH = "baileys_auth";
let sock; // Variabel global untuk socket WhatsApp

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
      const { connection, lastDisconnect, pairingCode } = update;

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

    // 🔹 Event listener untuk menerima pesan masuk
    sock.ev.on("messages.upsert", (m) => {
      const msg = m.messages[0];
      if (!msg.message) return;
      const sender = msg.key.remoteJid;
      const messageContent =
        msg.message.conversation || msg.message.extendedTextMessage?.text;

      console.log(`📩 Pesan masuk dari ${sender}: ${messageContent}`);
    });

    // 🔹 Pastikan requestPairingCode dipanggil hanya jika perlu
    await new Promise((resolve) => setTimeout(resolve, 3000));

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

function getSock() {
  return sock;
}

module.exports = { startWhatsApp, getSock };
