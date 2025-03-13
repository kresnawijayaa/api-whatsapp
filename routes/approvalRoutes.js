const express = require("express");
const { requestApproval } = require("../controllers/approvalController");

const router = express.Router();

/**
 * @swagger
 * /api/request-approval:
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
router.post("/request-approval", requestApproval);

module.exports = router;
