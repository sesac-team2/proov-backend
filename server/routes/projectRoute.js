import { Router } from "express";
import * as projectController from "../controllers/projectController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project
 *   description: 프로젝트 관리
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: 프로젝트 목록 조회
 *     description: 사용자가 속한 프로젝트 목록을 가져옵니다.
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed]
 *         description: 프로젝트 현황 필터
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, member]
 *         description: 내 역할 필터
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 프로젝트 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date
 *                       endDate:
 *                         type: string
 *                         format: date
 *                       participantCount:
 *                         type: integer
 *                       myRole:
 *                         type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: 인증 실패
 */
router.get("/", authenticate, projectController.getProjects);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: 프로젝트 생성
 *     description: |
 *       새 프로젝트를 만듭니다. 생성자는 자동으로 관리자(admin)가 됩니다.
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 description: 프로젝트 이름 (최소 3자)
 *               description:
 *                 type: string
 *                 description: 프로젝트 설명 (선택)
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: 시작일 (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: 종료일 (YYYY-MM-DD)
 *           example:
 *             name: "E-commerce Redesign"
 *             description: "Revamping the main shopping experience"
 *             startDate: "2025-10-01"
 *             endDate: "2026-03-31"
 *     responses:
 *       201:
 *         description: 프로젝트 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 status:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date
 *                 endDate:
 *                   type: string
 *                   format: date
 *                 participantCount:
 *                   type: integer
 *                 myRole:
 *                   type: string
 *       400:
 *         description: 필수 필드 누락 또는 유효하지 않은 값
 *       401:
 *         description: 인증 실패
 */
router.post("/", authenticate, projectController.createProject);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: 프로젝트 상세 조회
 *     description: 특정 프로젝트에 대한 세부 정보를 불러옵니다.
 *     tags: [Project]
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
 *       200:
 *         description: 프로젝트 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 status:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date
 *                 endDate:
 *                   type: string
 *                   format: date
 *                 creator:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       role:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *       403:
 *         description: 유저가 이 프로젝트의 멤버가 아님 (권한 없음)
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.get("/:id", authenticate, projectController.getProjectDetail);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: 프로젝트 수정
 *     description: |
 *       프로젝트의 메타데이터를 수정합니다. 오직 관리자(admin)만 수정할 수 있습니다.
 *       모든 필드는 Optional이지만 최소 하나 이상은 필수입니다.
 *     tags: [Project]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [in_progress, completed]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *           example:
 *             name: "Updated Name"
 *             status: "completed"
 *     responses:
 *       200:
 *         description: 프로젝트 수정 성공
 *       400:
 *         description: 유효하지 않은 요청
 *       403:
 *         description: 유저가 관리자가 아님
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.put("/:id", authenticate, projectController.updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: 프로젝트 삭제
 *     description: 관리자(admin)가 프로젝트를 삭제합니다.
 *     tags: [Project]
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
 *         description: 프로젝트 삭제 성공
 *       403:
 *         description: 유저가 관리자가 아님
 *       404:
 *         description: 프로젝트가 존재하지 않음
 */
router.delete("/:id", authenticate, projectController.deleteProject);

export default router;
