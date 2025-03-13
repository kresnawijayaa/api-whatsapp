const express = require("express");
const { requestOtp, verifyOtp } = require("../controllers/otpController");

const router = express.Router();

/**
 * @swagger
 * /api/request-otp:
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
router.post("/request-otp", requestOtp);

/**
 * @swagger
 * /api/verify-otp:
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
router.post("/verify-otp", verifyOtp);

module.exports = router;
