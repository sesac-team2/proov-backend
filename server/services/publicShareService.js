import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FEATURED_TESTIMONIALS_LIMIT = 5;
const SKILLS_CLOUD_LIMIT = 10;

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 공개 포트폴리오 조회. profilePublic === true 일 때만 반환.
 * @param {string} userIdOrHandle - User UUID or customHandle
 * @returns {Promise<object|null>} portfolio object or null
 */
export const getPublicPortfolio = async (userIdOrHandle) => {
    const isUuid = UUID_REGEX.test(userIdOrHandle);
    const user = await prisma.users.findUnique({
        where: isUuid
            ? { id: userIdOrHandle }
            : { customHandle: userIdOrHandle },
        select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            profilePublic: true,
        },
    });

    if (!user || !user.profilePublic) {
        return null;
    }

    const userProjects = await prisma.project.findMany({
        where: {
            members: { some: { userId: user.id } },
        },
        include: {
            members: { select: { userId: true } },
            testimonials: {
                where: { recipientId: user.id },
                include: {
                    highlights: true,
                    skills: { include: { skill: true } },
                },
            },
        },
        orderBy: { endDate: "desc" },
    });

    const completedProjects = userProjects.filter(
        (p) => p.status === "completed",
    );

    const projectsCompletedCount = completedProjects.length;
    let testimonialsReceivedCount = 0;
    const collaboratorIds = new Set();
    const allKeywordsCount = new Map();

    const portfolioProjects = [];

    for (const project of userProjects) {
        let isCollaboratorAdded = false;
        for (const m of project.members) {
            if (m.userId !== user.id) {
                collaboratorIds.add(m.userId);
            }
        }

        const projectHighlights = [];
        const projectKeywords = new Set();

        for (const t of project.testimonials) {
            testimonialsReceivedCount++;
            for (const h of t.highlights) {
                projectHighlights.push(h.text);
            }
            for (const ts of t.skills) {
                projectKeywords.add(ts.skill.name);
                allKeywordsCount.set(
                    ts.skill.name,
                    (allKeywordsCount.get(ts.skill.name) || 0) + 1,
                );
            }
        }

        portfolioProjects.push({
            id: project.id,
            name: project.name,
            testimonialHighlights: projectHighlights,
            keywords: Array.from(projectKeywords),
            date: project.endDate.toISOString().slice(0, 10),
        });
    }

    const topKeywords = Array.from(allKeywordsCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map((e) => e[0]);

    return {
        user: {
            fullName: user.fullName || "",
            avatarUrl: user.avatarUrl || "",
            bio: user.bio || "",
        },
        stats: {
            projectsCompletedCount,
            testimonialsReceivedCount,
            collaboratorsCount: collaboratorIds.size,
        },
        topKeywords,
        projects: portfolioProjects,
    };
};
