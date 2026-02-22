import * as testimonialService from "../services/testimonialService.js";
import * as aiService from "../services/aiService.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /projects/:projectId/testimonials/questions
 * AI 기반 리뷰 질문 생성
 */
export const getQuestions = async (req, res) => {
    try {
        const { projectId } = req.params;

        // 프로젝트 조회
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const questions = await aiService.generateReviewQuestions(
            project.name,
            project.description,
        );

        return res.status(200).json({ questions });
    } catch (error) {
        console.error("GetQuestions error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * POST /testimonials
 * 기여 증언 생성
 */
export const createTestimonial = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { projectId, recipientId, content, highlights, skills } =
            req.body;

        // 필수 필드 검증
        if (!projectId || !recipientId || !content) {
            return res.status(400).json({
                error: "Bad Request: projectId, recipientId, content are required",
            });
        }

        // 셀프 리뷰 금지
        if (senderId === recipientId) {
            return res.status(400).json({
                error: "Bad Request: 본인에게 증언을 작성할 수 없습니다",
            });
        }

        // content 최소 50자
        if (content.length < 50) {
            return res.status(400).json({
                error: "Bad Request: content는 최소 50자 이상이어야 합니다",
            });
        }

        // 프로젝트 존재 확인
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // sender 멤버 확인
        const senderIsMember = await testimonialService.isMember(
            senderId,
            projectId,
        );
        if (!senderIsMember) {
            return res.status(400).json({
                error: "Bad Request: 작성자가 프로젝트 멤버가 아닙니다",
            });
        }

        // recipient 멤버 확인
        const recipientIsMember = await testimonialService.isMember(
            recipientId,
            projectId,
        );
        if (!recipientIsMember) {
            return res.status(400).json({
                error: "Bad Request: 수신자가 프로젝트 멤버가 아닙니다",
            });
        }

        const testimonial = await testimonialService.createTestimonial({
            projectId,
            senderId,
            recipientId,
            content,
            highlights,
            skills,
        });

        return res.status(201).json(testimonial);
    } catch (error) {
        console.error("CreateTestimonial error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET /projects/:projectId/testimonials
 * 프로젝트별 증언 리스트
 */
export const getTestimonials = async (req, res) => {
    try {
        const { projectId } = req.params;

        // 프로젝트 존재 확인
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const testimonials =
            await testimonialService.getTestimonialsByProject(projectId);

        return res.status(200).json(testimonials);
    } catch (error) {
        console.error("GetTestimonials error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET /users/me/contributions
 * 내 기여 증언 통계 + 최근 리스트
 */
export const getMyContributions = async (req, res) => {
    try {
        const userId = req.user.id;

        const contributions =
            await testimonialService.getMyContributions(userId);

        return res.status(200).json(contributions);
    } catch (error) {
        console.error("GetMyContributions error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * PUT /testimonials/:id
 * 기여 증언 수정
 */
export const updateTestimonial = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { content, highlights, skills } = req.body;

        const testimonial = await prisma.testimonial.findUnique({
            where: { id },
        });

        if (!testimonial) {
            return res.status(404).json({ error: "Testimonial not found" });
        }

        // 증언이 속한 프로젝트 멤버인지 확인 (누구나 수정 요청 가능)
        const isMember = await testimonialService.isMember(
            userId,
            testimonial.projectId,
        );
        if (!isMember) {
            return res
                .status(403)
                .json({
                    error: "Forbidden: You are not a member of this project",
                });
        }

        if (content && content.length < 50) {
            return res.status(400).json({
                error: "Bad Request: content는 최소 50자 이상이어야 합니다",
            });
        }

        const updated = await testimonialService.updateTestimonial(id, {
            content,
            highlights,
            skills,
        });

        return res.status(200).json(updated);
    } catch (error) {
        console.error("UpdateTestimonial error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * DELETE /testimonials/:id
 * 기여 증언 삭제 (admin만)
 */
export const deleteTestimonial = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const testimonial = await prisma.testimonial.findUnique({
            where: { id },
        });

        if (!testimonial) {
            return res.status(404).json({ error: "Testimonial not found" });
        }

        // admin 확인
        const isAdmin = await testimonialService.isAdmin(
            userId,
            testimonial.projectId,
        );
        if (!isAdmin) {
            return res
                .status(403)
                .json({ error: "Forbidden: Admin access required" });
        }

        await testimonialService.deleteTestimonial(id);

        return res.status(204).send(); // No Content
    } catch (error) {
        console.error("DeleteTestimonial error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
