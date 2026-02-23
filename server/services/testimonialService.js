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
            summary: summary || null,
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
            skills: {
                include: { skill: true },
            },
            highlights: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return Promise.all(
        testimonials.map(async (t) => {
            let summary = t.summary;
            if (!summary) {
                summary = await aiService.summarizeTestimonial(t.content);
                if (summary) {
                    // 백그라운드에서 DB 업데이트 (await 안함)
                    prisma.testimonial
                        .update({
                            where: { id: t.id },
                            data: { summary },
                        })
                        .catch((err) =>
                            console.error(
                                "Failed to update summary cache",
                                err,
                            ),
                        );
                }
            }
            return {
                ...t,
                summary,
                skills: t.skills.map((s) => s.skill.name),
                highlights: t.highlights.map((h) => h.text),
            };
        }),
    );
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

/**
 * 프로젝트 관리자 여부 확인
 */
export const isAdmin = async (userId, projectId) => {
    const member = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId, projectId },
        },
    });
    return member?.role === "admin";
};

/**
 * 증언 수정
 */
export const updateTestimonial = async (
    id,
    { content, highlights, skills },
) => {
    // 1. 기존 증언 조회
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new Error("Testimonial not found");

    const dataToUpdate = {};

    // 내용이 변경된 경우
    if (content && content !== existing.content) {
        dataToUpdate.content = content;
        const summary = await aiService.summarizeTestimonial(content);
        dataToUpdate.summary = summary || null;
    }

    // 트랜잭션으로 처리 (연관 데이터 삭제 후 재생성 및 본문 업데이트)
    const result = await prisma.$transaction(async (tx) => {
        // 하이라이트 제공 시 기존 삭제 후 생성
        if (highlights) {
            await tx.testimonialHighlight.deleteMany({
                where: { testimonialId: id },
            });
            dataToUpdate.highlights = {
                create: highlights.map((text) => ({ text })),
            };
        }

        // 스킬 제공 시 기존 삭제 후 생성
        if (skills) {
            await tx.testimonialSkill.deleteMany({
                where: { testimonialId: id },
            });

            // 새 스킬 조회/생성
            const skillRecords = await Promise.all(
                skills.map(async (skillName) => {
                    let skill = await tx.skill.findFirst({
                        where: { name: skillName },
                    });
                    if (!skill) {
                        skill = await tx.skill.create({
                            data: { name: skillName },
                        });
                    }
                    return skill.id;
                }),
            );

            dataToUpdate.skills = {
                create: skillRecords.map((skillId) => ({ skillId })),
            };
        }

        return await tx.testimonial.update({
            where: { id },
            data: dataToUpdate,
            include: {
                sender: {
                    select: { id: true, fullName: true, avatarUrl: true },
                },
                recipient: {
                    select: { id: true, fullName: true, avatarUrl: true },
                },
                project: { select: { id: true, name: true } },
            },
        });
    });

    return result;
};

/**
 * 증언 삭제
 */
export const deleteTestimonial = async (id) => {
    return await prisma.testimonial.delete({
        where: { id },
    });
};
