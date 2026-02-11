import { Router } from "express";
import * as testimonialController from "../controllers/testimonialController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Testimonial
 *   description: 기여 증언 관리
 */

// =============================================
// Project 중첩 라우트 (/projects/:projectId/...)
// =============================================

/**
 * @swagger
 * /projects/{projectId}/testimonials/questions:
 *   get:
 *     summary: AI 기반 리뷰 질문 생성
 *     description: |
 *       프로젝트 정보를 바탕으로 Gemini AI가 팀원 리뷰에 도움이 되는
 *       맞춤형 질문 3~5가지를 생성합니다.
 *     tags: [Testimonial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project UUID
 *     responses:
 *       200:
 *         description: 질문 리스트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "이 프로젝트에서 해당 팀원이 가장 크게 기여한 부분은 무엇인가요?"
 *                     - "이 팀원과 협업하면서 인상 깊었던 점은 무엇인가요?"
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.get(
    "/projects/:projectId/testimonials/questions",
    authenticate,
    testimonialController.getQuestions,
);

/**
 * @swagger
 * /projects/{projectId}/testimonials:
 *   get:
 *     summary: 프로젝트 증언 리스트 조회
 *     description: 해당 프로젝트에 달린 모든 기여 증언을 조회합니다.
 *     tags: [Testimonial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project UUID
 *     responses:
 *       200:
 *         description: 증언 리스트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   summary:
 *                     type: string
 *                   highlights:
 *                     type: array
 *                     items:
 *                       type: string
 *                   skills:
 *                     type: array
 *                     items:
 *                       type: string
 *                   sender:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                   recipient:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.get(
    "/projects/:projectId/testimonials",
    authenticate,
    testimonialController.getTestimonials,
);

// =============================================
// 독립 라우트
// =============================================

/**
 * @swagger
 * /testimonials:
 *   post:
 *     summary: 기여 증언 작성
 *     description: |
 *       팀원에 대한 기여 증언을 작성합니다.
 *       - 작성자(sender)와 수신자(recipient)가 같으면 안 됩니다.
 *       - 둘 모두 해당 프로젝트의 멤버여야 합니다.
 *       - content는 최소 50자 이상이어야 합니다.
 *       - 저장 시 AI가 자동으로 요약본(summary)을 생성합니다.
 *     tags: [Testimonial]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - recipientId
 *               - content
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: 프로젝트 UUID
 *               recipientId:
 *                 type: string
 *                 description: 수신자 UUID
 *               content:
 *                 type: string
 *                 minLength: 50
 *                 description: 증언 본문 (최소 50자)
 *               highlights:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 핵심 문구들
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 인정된 스킬들
 *           example:
 *             projectId: "uuid-of-project"
 *             recipientId: "uuid-of-recipient"
 *             content: "이 프로젝트에서 김철수님은 백엔드 아키텍처 설계를 주도했으며, 특히 마이크로서비스 간 통신 구조를 효율적으로 구현했습니다. 기술적 리더십이 뛰어났습니다."
 *             highlights: ["아키텍처 설계 주도", "마이크로서비스 통신 구현"]
 *             skills: ["Backend", "Architecture", "Leadership"]
 *     responses:
 *       201:
 *         description: 증언 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 summary:
 *                   type: string
 *                 highlights:
 *                   type: array
 *                   items:
 *                     type: string
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                 sender:
 *                   type: object
 *                 recipient:
 *                   type: object
 *                 project:
 *                   type: object
 *       400:
 *         description: |
 *           - 필수 필드 누락
 *           - 셀프 리뷰 시도
 *           - 비멤버 증언 시도
 *           - content 50자 미만
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.post(
    "/testimonials",
    authenticate,
    testimonialController.createTestimonial,
);

/**
 * @swagger
 * /users/me/contributions:
 *   get:
 *     summary: 내 기여 증언 통계
 *     description: |
 *       현재 로그인한 유저가 받은 모든 증언의 통계와 최근 증언 리스트를 반환합니다.
 *       - totalReceived: 받은 증언 총 개수
 *       - topSkills: 가장 많이 인정받은 스킬 (최대 10개)
 *       - recentTestimonials: 최근 받은 증언 (최대 10개, AI 요약 포함)
 *     tags: [Testimonial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 기여 통계 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReceived:
 *                   type: integer
 *                   example: 15
 *                 topSkills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                   example:
 *                     - name: "Leadership"
 *                       count: 5
 *                     - name: "Backend"
 *                       count: 3
 *                 recentTestimonials:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       sender:
 *                         type: object
 *                       project:
 *                         type: object
 *                       summary:
 *                         type: string
 *                       content:
 *                         type: string
 *                       skills:
 *                         type: array
 *                         items:
 *                           type: string
 *                       highlights:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 */
router.get(
    "/users/me/contributions",
    authenticate,
    testimonialController.getMyContributions,
);

export default router;
