require("dotenv").config();
const { getSock } = require("../services/whatsappService");
const supabase = require("../supabaseClient");

async function requestApproval(req, res) {
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
}

module.exports = { requestApproval };
