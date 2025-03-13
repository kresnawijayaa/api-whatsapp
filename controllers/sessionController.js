async function startSession(req, res) {
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
}

async function logout(req, res) {
  try {
    fs.rmSync(SESSION_PATH, { recursive: true, force: true });
    sock = null;
    res.json({ success: true, message: "Logout berhasil, sesi dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Gagal logout" });
  }
}

module.exports = { startSession, logout };
