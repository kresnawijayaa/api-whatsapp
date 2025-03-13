const express = require("express");
const { startSession, logout } = require("../controllers/sessionController");

const router = express.Router();

/**
 * @swagger
 * /api/start-session:
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
router.get("/start-session", startSession);

/**
 * @swagger
 * /api/logout:
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
router.get("/logout", logout);

module.exports = router;