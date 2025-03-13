const express = require("express");
const {
  sendMessage,
  sendGroupMessage,
  sendBroadcastMessage,
} = require("../controllers/messageController");

const router = express.Router();

/**
 * @swagger
 * /api/send-message:
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
router.post("/send-message", sendMessage);

/**
 * @swagger
 * /api/send-group-message:
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
router.post("/send-group-message", sendGroupMessage);

/**
 * @swagger
 * /api/broadcast:
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
router.post("/broadcast", sendBroadcastMessage);

module.exports = router;
