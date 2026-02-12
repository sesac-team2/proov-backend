import { Router } from "express";
import * as publicShareController from "../controllers/publicShareController.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: PublicShare
 *   description: 외부 공유 (공개 포트폴리오)
 */

/**
 * @swagger
 * /share/{userId}:
 *   get:
 *     summary: 공개 포트폴리오 가져오기
 *     description: User UUID 또는 Custom Handle로 공개 포트폴리오를 조회합니다. profilePublic이 true인 사용자만 200을 반환합니다.
 *     tags: [PublicShare]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User UUID 또는 Custom Handle
 *     responses:
 *       200:
 *         description: 공개 포트폴리오 본문
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     full_name:
 *                       type: string
 *                       nullable: true
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     projects_completed:
 *                       type: integer
 *                     testimonials_received:
 *                       type: integer
 *                 highlights:
 *                   type: array
 *                   items:
 *                     type: string
 *                 skills_cloud:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       value:
 *                         type: integer
 *                 featured_testimonials:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       project_name:
 *                         type: string
 *                       sender_name:
 *                         type: string
 *                         nullable: true
 *                       sender_role:
 *                         type: string
 *                         nullable: true
 *                       content:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *       404:
 *         description: 유저가 없거나 프로필이 비공개입니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 유저가 없거나 프로필이 비공개입니다.
 */
router.get("/:userId", publicShareController.getPublicPortfolio);

export default router;
