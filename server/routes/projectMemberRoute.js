import { Router } from "express";
import * as projectMemberController from "../controllers/projectMemberController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: ProjectMember
 *   description: 프로젝트 멤버 관리
 */

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: 프로젝트 멤버 초대
 *     description: |
 *       프로젝트에 멤버를 초대합니다. 오직 관리자(admin)만 초대할 수 있습니다.
 *       초대된 멤버는 status가 "invited"로 설정됩니다.
 *     tags: [ProjectMember]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 초대할 유저의 이메일 주소
 *               role:
 *                 type: string
 *                 enum: [member, admin]
 *                 description: 멤버의 역할
 *           example:
 *             email: "colleague@example.com"
 *             role: "member"
 *     responses:
 *       201:
 *         description: 멤버 초대 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: 초대된 유저의 ID
 *                 role:
 *                   type: string
 *                   description: 멤버의 역할
 *                 status:
 *                   type: string
 *                   enum: [invited]
 *                   description: 멤버의 초대 상태
 *             example:
 *               userId: "550e8400-e29b-41d4-a716-446655440000"
 *               role: "member"
 *               status: "invited"
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락 또는 유효하지 않은 role 값)
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (Admin 아님 또는 이미 멤버임)
 *       404:
 *         description: 프로젝트 없음 또는 유저 없음
 */
router.post("/", authenticate, projectMemberController.inviteMember);

/**
 * @swagger
 * /projects/{id}/members/leave:
 *   delete:
 *     summary: 프로젝트 나가기
 *     description: |
 *       현재 로그인한 사용자가 프로젝트에서 스스로 나갑니다.
 *       - 단, 프로젝트의 유일한 관리자(admin)인 경우 나갈 수 없습니다. (다른 관리자를 지정하거나 프로젝트를 삭제해야 함)
 *     tags: [ProjectMember]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project UUID
 *     responses:
 *       204:
 *         description: 프로젝트 탈퇴 성공 (No Content)
 *       403:
 *         description: |
 *           - 프로젝트의 멤버가 아님
 *           - 유일한 관리자는 탈퇴 불가
 *       404:
 *         description: 프로젝트 없음
 */
router.delete("/leave", authenticate, projectMemberController.leaveProject);

export default router;
