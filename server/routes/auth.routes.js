import express from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: OAuth 로그인/회원가입
 *     description: |
 *       Provider별로 다른 필드를 사용합니다:
 *       - **Google**: `token` (Access Token을 직접 전달)
 *       - **Kakao**: `code` + `redirect_uri` (Authorization Code와 리다이렉트 URI 전달)
 *       - **GitHub**: `code` + `redirect_uri` (Authorization Code와 리다이렉트 URI 전달)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, kakao, github]
 *                 description: OAuth 제공자
 *               token:
 *                 type: string
 *                 description: Google Access Token (Google 로그인 시 필수)
 *               code:
 *                 type: string
 *                 description: Authorization Code (Kakao/GitHub 로그인 시 필수)
 *               redirect_uri:
 *                 type: string
 *                 description: 프론트에서 사용한 redirect_uri (Kakao/GitHub 로그인 시 필수)
 *               full_name:
 *                 type: string
 *                 description: 사용자 이름 (선택)
 *               avatar_url:
 *                 type: string
 *                 description: 프로필 이미지 URL (선택)
 *           examples:
 *             google:
 *               summary: Google 로그인
 *               value:
 *                 provider: "google"
 *                 token: "ya29.a0AfH6SMB..."
 *             kakao:
 *               summary: Kakao 로그인
 *               value:
 *                 provider: "kakao"
 *                 code: "authorization_code_from_kakao"
 *                 redirect_uri: "http://localhost:3000/auth/kakao/callback"
 *             github:
 *               summary: GitHub 로그인
 *               value:
 *                 provider: "github"
 *                 code: "authorization_code_from_github"
 *                 redirect_uri: "http://localhost:3000/auth/github/callback"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT 토큰
 *                 expires_in:
 *                   type: integer
 *                   description: 토큰 만료 시간 (초)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 필수 필드 누락 또는 잘못된 provider
 *       401:
 *         description: OAuth 인증 실패
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

/**
 * @swagger
 * /auth/me:
 *   delete:
 *     summary: 유저 탈퇴
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 탈퇴 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 에러
 */
router.delete("/me", authenticate, authController.withdraw);

export default router;
