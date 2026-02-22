import { PrismaClient } from "@prisma/client";
import * as aiService from "./aiService.js";

const prisma = new PrismaClient();

/**
 * 프로젝트 멤버 여부 확인
 */
export const isMember = async (userId, projectId) => {
    const member = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId, projectId },
        },
    });
    return !!member;
};

/**
 * 증언 생성 + AI 요약 자동 저장
 */
export const createTestimonial = async ({
    projectId,
    senderId,
    recipientId,
    content,
    highlights,
    skills,
}) => {
    // AI 요약 생성 (실패해도 증언은 저장됨)
    const summary = await aiService.summarizeTestimonial(content);

    // 스킬 이름들을 DB에서 찾거나 없으면 생성하여 ID를 가져옵니다.
    const skillRecords = await Promise.all(
        (skills || []).map(async (skillName) => {
            let skill = await prisma.skill.findFirst({
                where: { name: skillName },
            });
            if (!skill) {
                skill = await prisma.skill.create({
                    data: { name: skillName },
                });
            }
            return skill.id;
        }),
    );

    const testimonial = await prisma.testimonial.create({
        data: {
            projectId,
            senderId,
            recipientId,
            content,
            dateWritten: new Date(),
            highlights: {
                create: (highlights || []).map((text) => ({ text })),
            },
            skills: {
                create: skillRecords.map((skillId) => ({ skillId })),
            },
        },
        include: {
            sender: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
            recipient: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
            project: {
                select: { id: true, name: true },
            },
        },
    });

    return testimonial;
};

/**
 * 프로젝트별 증언 리스트 조회
 */
export const getTestimonialsByProject = async (projectId) => {
    const testimonials = await prisma.testimonial.findMany({
        where: { projectId },
        include: {
            sender: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
            recipient: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return testimonials;
};

/**
 * 내가 받은 증언 통계 + 최근 리스트
 */
export const getMyContributions = async (userId) => {
    const testimonials = await prisma.testimonial.findMany({
        where: { recipientId: userId },
        include: {
            sender: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
            project: {
                select: { id: true, name: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // totalReceived
    const totalReceived = testimonials.length;

    // topSkills 카운팅
    const skillCountMap = {};
    testimonials.forEach((t) => {
        t.skills.forEach((skill) => {
            skillCountMap[skill] = (skillCountMap[skill] || 0) + 1;
        });
    });

    const topSkills = Object.entries(skillCountMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // 최근 증언 (최대 10건)
    const recentTestimonials = testimonials.slice(0, 10).map((t) => ({
        id: t.id,
        sender: t.sender,
        project: t.project,
        summary: t.summary,
        content: t.content,
        skills: t.skills,
        highlights: t.highlights,
        createdAt: t.createdAt,
    }));

    return {
        totalReceived,
        topSkills,
        recentTestimonials,
    };
};
