import express from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: OAuth 로그인/회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, kakao, github]
 *               token:
 *                 type: string
 *               full_name:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: 필수 필드 누락
 *       401:
 *         description: 유효하지 않은 토큰
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 현재 유저 정보 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 유저 정보 반환
 *       401:
 *         description: 인증 실패
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: 유저 프로필 수정
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 */
router.put("/me", authenticate, authController.updateMe);

export default router;
