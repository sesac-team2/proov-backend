import express from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /auth/login - 로그인/회원가입
router.post("/login", authController.login);

// GET /auth/me - 현재 유저 정보 조회 (인증 필요)
router.get("/me", authenticate, authController.getMe);

// PUT /auth/me - 유저 프로필 수정 (인증 필요)
router.put("/me", authenticate, authController.updateMe);

export default router;
