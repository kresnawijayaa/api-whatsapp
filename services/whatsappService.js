const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");

const SESSION_PATH = "baileys_auth";
const supabase = require("../supabaseClient");

let sock = null;

async function startWhatsApp() {
  try {
    console.log("📲 Menginisialisasi WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Matikan tampilan QR Code di terminal
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
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        
        if (shouldReconnect) {
          console.log("🔁 Mencoba reconnect...");
          setTimeout(startWhatsApp, 5000); // Tunggu 5 detik sebelum mencoba reconnect
        } else {
          console.log("⚠️ Session invalid, menghapus session...");
          fs.removeSync(SESSION_PATH);
        }
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      if (!msg?.message) return;

      const sender = msg.key.remoteJid.replace("@s.whatsapp.net", "");
      const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;

      console.log(`📩 Pesan masuk dari ${sender}: ${messageContent}`);

      if (messageContent) {
        const { data, error } = await supabase
          .from("approval_requests")
          .select("*")
          .eq("phone_number", sender)
          .eq("approval_code", messageContent)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("❌ ERROR saat memeriksa kode approval:", error);
          return;
        }

        if (data.length > 0) {
          await sock.sendMessage(msg.key.remoteJid, { text: "✅ Approval berhasil! Terima kasih." });
          await supabase.from("approval_requests").delete().eq("id", data[0].id);
        }
      }
    });

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
