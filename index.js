require("dotenv").config();
const express = require("express");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !== 401;

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
      const messageContent =
        msg.message.conversation || msg.message.extendedTextMessage?.text;

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
          await sock.sendMessage(msg.key.remoteJid, {
            text: "✅ Approval berhasil! Terima kasih.",
          });
          await supabase
            .from("approval_requests")
            .delete()
            .eq("id", data[0].id);
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

// 🔹 API Endpoints
app.get("/", (req, res) => {
  res.send("🚀 WhatsApp API Running...");
});

/**
 * @swagger
 * /send-message:
 *   post:
 *     summary: Send a personal message
 *     description: Send a message to an individual contact.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281314250902"
 *               message:
 *                 type: string
 *                 example: "Halo, ini personal message!"
 *     responses:
 *       200:
 *         description: Pesan berhasil dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan berhasil dikirim"
 *       400:
 *         description: Nomor dan pesan wajib diisi atau nomor tidak valid.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal mengirim pesan.
 */
app.post("/send-message", async (req, res) => {
  try {
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
});

/**
 * @swagger
 * /send-group-message:
 *   post:
 *     summary: Send a message to a group
 *     description: Send a message to a WhatsApp group using its ID.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: "120363407810956154"
 *               message:
 *                 type: string
 *                 example: "Halo, ini group message!"
 *     responses:
 *       200:
 *         description: Pesan berhasil dikirim ke grup.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan berhasil dikirim ke grup"
 *       400:
 *         description: ID grup dan pesan wajib diisi.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal mengirim pesan ke grup.
 */
app.post("/send-group-message", async (req, res) => {
  try {
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
});

/**
 * @swagger
 * /broadcast:
 *   post:
 *     summary: Send a broadcast message
 *     description: Send a message to multiple contacts at once.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281314250902", "6281234567890"]
 *               message:
 *                 type: string
 *                 example: "Halo, ini broadcast message!"
 *     responses:
 *       200:
 *         description: Pesan broadcast dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan broadcast dikirim"
 *       400:
 *         description: Daftar nomor dan pesan wajib diisi.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal melakukan broadcast.
 */
app.post("/broadcast", async (req, res) => {
  try {
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
});

/**
 * @swagger
 * /request-otp:
 *   post:
 *     summary: Request an OTP
 *     description: Sends a one-time password (OTP) to the specified phone number via WhatsApp.
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281314250902"
 *     responses:
 *       200:
 *         description: OTP successfully sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required phone number field.
 *       500:
 *         description: Internal server error or WhatsApp not connected.
 */
app.post("/request-otp", async (req, res) => {
  try {
    if (!sock)
      return res
        .status(500)
        .json({ success: false, error: "WhatsApp belum terhubung" });

    const { number } = req.body;
    if (!number)
      return res
        .status(400)
        .json({ success: false, error: "Nomor WhatsApp wajib diisi" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const chatId = `${number}@s.whatsapp.net`;

    // xxx
    // Cek apakah nomor sudah ada di database
    const { data, error } = await supabase
      .from("otp_requests")
      .select("id, otp_code") // Pastikan kita ambil ID
      .eq("phone_number", number)
      .single(); // Ambil 1 data saja

    if (error && error.code !== "PGRST116") {
      // Jika error selain "data tidak ditemukan"
      throw error;
    }

    if (data) {
      // Jika nomor sudah ada, update approval_code & expires_at
      const { error: updateError } = await supabase
        .from("otp_requests")
        .update({
          otp_code: otp,
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("❌ ERROR saat update otp:", updateError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal memperbarui kode otp" });
      }
    } else {
      // Jika belum ada, insert data baru
      const { error: insertError } = await supabase
        .from("otp_requests")
        .insert([{ phone_number: number, otp_code: otp }]);

      if (insertError) {
        console.error("❌ ERROR saat insert otp:", insertError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan kode otp" });
      }
    }
    // xxx

    await sock.sendMessage(chatId, { text: `Kode OTP Anda: ${otp}` });

    res.json({ success: true, message: "OTP dikirim" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim OTP:", error);
    res.status(500).json({ success: false, error: "Gagal mengirim OTP" });
  }
});

/**
 * @swagger
 * /verify-otp:
 *   post:
 *     summary: Verify an OTP
 *     description: Checks if the provided OTP matches the one sent to the phone number.
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281314250902"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid OTP or missing required fields.
 *       500:
 *         description: Internal server error.
 */
app.post("/verify-otp", async (req, res) => {
  try {
    const { number, otp } = req.body;
    if (!number || !otp)
      return res
        .status(400)
        .json({ success: false, error: "Nomor dan OTP wajib diisi" });

    const { data, error } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("phone_number", number)
      .eq("otp_code", otp)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data.length)
      return res.status(400).json({
        success: false,
        error: "OTP tidak valid atau sudah kadaluarsa",
      });

    res.json({ success: true, message: "OTP valid" });
  } catch (error) {
    console.error("❌ ERROR saat verifikasi OTP:", error);
    res.status(500).json({ success: false, error: "Gagal verifikasi OTP" });
  }
});

/**
 * @swagger
 * /request-approval:
 *   post:
 *     summary: Send an approval code
 *     description: Endpoint ini digunakan untuk mengirimkan kode approval melalui WhatsApp. Kode akan berlaku selama 10 menit.
 *     tags:
 *       - Approval
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281234567890"
 *                 description: "Nomor WhatsApp tujuan dalam format internasional tanpa tanda '+'"
 *     responses:
 *       200:
 *         description: Kode approval berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Kode approval dikirim, berlaku 10 menit"
 *       400:
 *         description: Permintaan tidak valid (misalnya nomor WhatsApp tidak diisi)
 *       500:
 *         description: Kesalahan server (misalnya WhatsApp tidak terhubung atau gagal menyimpan kode)
 */
app.post("/request-approval", async (req, res) => {
  try {
    if (!sock)
      return res
        .status(500)
        .json({ success: false, error: "WhatsApp belum terhubung" });

    const { number } = req.body;
    if (!number)
      return res
        .status(400)
        .json({ success: false, error: "Nomor WhatsApp wajib diisi" });

    // Generate kode approval baru
    const approvalCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Berlaku 10 menit

    const chatId = `${number}@s.whatsapp.net`;

    // Cek apakah nomor sudah ada di database
    const { data, error } = await supabase
      .from("approval_requests")
      .select("id, approval_code") // Pastikan kita ambil ID
      .eq("phone_number", number)
      .single(); // Ambil 1 data saja

    if (error && error.code !== "PGRST116") {
      // Jika error selain "data tidak ditemukan"
      throw error;
    }

    if (data) {
      // Jika nomor sudah ada, update approval_code & expires_at
      const { error: updateError } = await supabase
        .from("approval_requests")
        .update({
          approval_code: approvalCode,
          expires_at: expiresAt,
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("❌ ERROR saat update approval:", updateError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal memperbarui kode approval" });
      }
    } else {
      // Jika belum ada, insert data baru
      const { error: insertError } = await supabase
        .from("approval_requests")
        .insert([
          {
            phone_number: number,
            approval_code: approvalCode,
            expires_at: expiresAt,
          },
        ]);

      if (insertError) {
        console.error("❌ ERROR saat insert approval:", insertError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan kode approval" });
      }
    }

    // Kirim kode approval ke pengguna
    await sock.sendMessage(chatId, {
      text: `Untuk konfirmasi, balas "${approvalCode}" pada chat ini.\n\nKode ini berlaku selama 10 menit.`,
    });

    res.json({
      success: true,
      message: "Kode approval dikirim, berlaku 10 menit",
    });
  } catch (error) {
    console.error("❌ ERROR saat mengirim kode approval:", error);
    res
      .status(500)
      .json({ success: false, error: "Gagal mengirim kode approval" });
  }
});

/**
 * @swagger
 * /start-session:
 *   get:
 *     summary: Start a new WhatsApp session
 *     description: Start a new session using the given WhatsApp number.
 *     tags:
 *       - Session
 *     parameters:
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *         example: "6281314250902"
 *         description: WhatsApp number to start the session.
 *     responses:
 *       200:
 *         description: Session started successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sesi baru dimulai, gunakan kode pairing untuk login: 123456"
 *       400:
 *         description: WhatsApp number is required.
 *       500:
 *         description: Failed to start the session.
 */
app.get("/start-session", async (req, res) => {
  try {
    const number = req.query.number;
    if (!number) {
      return res.status(400).json({
        success: false,
        error: "Nomor WhatsApp wajib diisi dalam parameter ?number=628xxxxxx",
      });
    }

    if (sock) {
      return res.json({
        success: true,
        message: "Sesi WhatsApp sudah berjalan.",
      });
    }

    console.log(`🚀 Memulai ulang sesi WhatsApp untuk ${number}...`);
    const result = await startWhatsApp(number);

    if (result.pairingCode) {
      return res.json({
        success: true,
        message: `Sesi baru dimulai, gunakan kode pairing untuk login: ${result.pairingCode}`,
      });
    } else {
      return res.json(result);
    }
  } catch (error) {
    console.error("❌ ERROR saat memulai ulang sesi:", error);
    res.status(500).json({ success: false, error: "Gagal memulai ulang sesi" });
  }
});

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Logout from WhatsApp session
 *     description: Terminate the current WhatsApp session and remove the session data.
 *     tags:
 *       - Session
 *     responses:
 *       200:
 *         description: Successfully logged out.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout berhasil, sesi dihapus"
 *       500:
 *         description: Failed to logout.
 */
app.get("/logout", async (req, res) => {
  try {
    fs.rmSync(SESSION_PATH, { recursive: true, force: true });
    sock = null;
    res.json({ success: true, message: "Logout berhasil, sesi dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Gagal logout" });
  }
});

// 🚀 Jalankan server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `🌍 Server berjalan di port ${PORT} dan bisa diakses dari jaringan lain 🚀`
  );
  await startWhatsApp();
});
