require("dotenv").config();
const { getSock } = require("../services/whatsappService");
const supabase = require("../supabaseClient");

async function requestOtp(req, res) {
  try {
    const sock = getSock();

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
}

async function verifyOtp(req, res) {
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
}

module.exports = { requestOtp, verifyOtp };
