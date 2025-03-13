require("dotenv").config();
const { getSock } = require("../services/whatsappService");
const supabase = require("../supabaseClient");

async function sendMessage(req, res) {
  try {
    const sock = getSock();

    if (!sock) {
      return res
        .status(500)
        .json({ success: false, error: "WhatsApp belum terhubung" });
    }

    const { number, message } = req.body;
    if (!number || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Nomor dan pesan wajib diisi" });
    }

    const sanitizedNumber = number.replace(/\D/g, "");
    if (sanitizedNumber.length < 10) {
      return res
        .status(400)
        .json({ success: false, error: "Nomor tidak valid" });
    }

    const chatId = `${sanitizedNumber}@s.whatsapp.net`;

    await sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: "Pesan berhasil dikirim" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim pesan:", error);
    res.status(500).json({ success: false, error: "Gagal mengirim pesan" });
  }
}

async function sendGroupMessage(req, res) {
  try {
    const sock = getSock();

    if (!sock) {
      return res
        .status(500)
        .json({ success: false, error: "WhatsApp belum terhubung" });
    }

    const { groupId, message } = req.body;
    if (!groupId || !message) {
      return res
        .status(400)
        .json({ success: false, error: "ID grup dan pesan wajib diisi" });
    }

    const chatId = `${groupId}@g.us`;

    await sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: "Pesan berhasil dikirim ke grup" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim pesan ke grup:", error);
    res
      .status(500)
      .json({ success: false, error: "Gagal mengirim pesan ke grup" });
  }
}

async function sendBroadcastMessage(req, res) {
  try {
    const sock = getSock();

    if (!sock)
      return res
        .status(500)
        .json({ success: false, error: "WhatsApp belum terhubung" });

    const { numbers, message } = req.body;
    if (
      !numbers ||
      !Array.isArray(numbers) ||
      numbers.length === 0 ||
      !message
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Daftar nomor dan pesan wajib diisi" });
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const number of numbers) {
      const chatId = `${number.replace(/\D/g, "")}@s.whatsapp.net`;
      await sock.sendMessage(chatId, { text: message });
      await supabase
        .from("broadcast_logs")
        .insert([{ phone_number: number, message }]);
      console.log(`📩 Pesan terkirim ke ${number}`);
      await delay(3000 + Math.random() * 2000); // Jeda 3-5 detik
    }

    res.json({ success: true, message: "Pesan broadcast dikirim" });
  } catch (error) {
    console.error("❌ ERROR saat broadcast:", error);
    res
      .status(500)
      .json({ success: false, error: "Gagal melakukan broadcast" });
  }
}

module.exports = { sendMessage, sendGroupMessage, sendBroadcastMessage };
