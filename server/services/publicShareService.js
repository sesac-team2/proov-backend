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

    const [
        projectsCompletedCount,
        testimonialsReceivedCount,
        testimonialsForHighlights,
        testimonialsForSkills,
        featuredTestimonialsRaw,
    ] = await Promise.all([
        prisma.projectMember.count({
            where: {
                userId: user.id,
                project: { status: "completed" },
            },
        }),
        prisma.testimonial.count({
            where: { recipientId: user.id },
        }),
        prisma.testimonial.findMany({
            where: { recipientId: user.id },
            select: {
                dateWritten: true,
                highlights: { select: { text: true } },
            },
        }),
        prisma.testimonial.findMany({
            where: { recipientId: user.id },
            select: {
                skills: {
                    select: { skill: { select: { name: true } } },
                },
            },
        }),
        prisma.testimonial.findMany({
            where: { recipientId: user.id },
            orderBy: { dateWritten: "desc" },
            take: FEATURED_TESTIMONIALS_LIMIT,
            select: {
                content: true,
                dateWritten: true,
                project: { select: { name: true } },
                sender: { select: { fullName: true } },
                senderId: true,
                projectId: true,
            },
        }),
    ]);

    const stats = {
        projectsCompleted: projectsCompletedCount,
        testimonialsReceived: testimonialsReceivedCount,
    };

    const textToFreqAndLatest = new Map();
    for (const t of testimonialsForHighlights) {
        const d = t.dateWritten.getTime();
        for (const h of t.highlights) {
            const cur = textToFreqAndLatest.get(h.text);
            if (!cur) {
                textToFreqAndLatest.set(h.text, { freq: 1, latest: d });
            } else {
                cur.freq += 1;
                if (d > cur.latest) cur.latest = d;
            }
        }
    }
    const highlights = [...textToFreqAndLatest.entries()]
        .sort((a, b) => {
            const [textA, dataA] = a;
            const [textB, dataB] = b;
            if (dataB.freq !== dataA.freq) return dataB.freq - dataA.freq;
            return dataB.latest - dataA.latest;
        })
        .map(([text]) => text);

    const skillCounts = new Map();
    for (const t of testimonialsForSkills) {
        for (const { skill } of t.skills) {
            skillCounts.set(skill.name, (skillCounts.get(skill.name) || 0) + 1);
        }
    }
    const skillsCloud = [...skillCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, SKILLS_CLOUD_LIMIT)
        .map(([text, value]) => ({ text, value }));

    const senderProjectRoles = await Promise.all(
        featuredTestimonialsRaw.map((t) =>
            prisma.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: t.senderId,
                        projectId: t.projectId,
                    },
                },
                select: { role: true },
            }),
        ),
    );

    const featuredTestimonials = featuredTestimonialsRaw.map((t, i) => ({
        projectName: t.project.name,
        senderName: t.sender.fullName ?? null,
        senderRole: senderProjectRoles[i]?.role ?? null,
        content: t.content,
        date: t.dateWritten.toISOString().slice(0, 10),
    }));

    return {
        user: {
            fullName: user.fullName ?? null,
            avatarUrl: user.avatarUrl ?? null,
            bio: user.bio ?? null,
        },
        stats,
        highlights,
        skillsCloud,
        featuredTestimonials,
    };
};
