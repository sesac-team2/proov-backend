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
 *
 *       성공 시 `access_token`은 응답 body로, `refresh_token`은 HttpOnly 쿠키로 설정됩니다.
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
 *         description: 로그인 성공 (refresh_token은 HttpOnly 쿠키로 설정)
 *         headers:
 *           Set-Cookie:
 *             description: refresh_token HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: JWT Access Token (15분)
 *                 expires_in:
 *                   type: integer
 *                   description: Access Token 만료 시간 (초)
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
 *       400:
 *         description: 필수 필드 누락 또는 잘못된 provider
 *       401:
 *         description: OAuth 인증 실패
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Access Token 재발급
 *     description: |
 *       HttpOnly 쿠키의 refresh_token을 사용하여 새 access_token을 발급합니다.
 *       Token Rotation이 적용되어 refresh_token도 함께 갱신됩니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 토큰 재발급 성공
 *         headers:
 *           Set-Cookie:
 *             description: 새 refresh_token HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: 새 JWT Access Token (15분)
 *                 expires_in:
 *                   type: integer
 *                   description: Access Token 만료 시간 (초)
 *       401:
 *         description: refresh_token 없음 또는 유효하지 않음
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: refresh_token 쿠키를 삭제하고 DB에서도 토큰을 제거합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post("/logout", authController.logout);

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
 *     description: 유저 삭제 및 refresh_token 쿠키 제거
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 탈퇴 성공
 *       401:
 *         description: 인증 실패
 */
router.delete("/me", authenticate, authController.withdraw);

export default router;
