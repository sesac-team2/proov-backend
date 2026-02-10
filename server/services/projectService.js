import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 유저가 속한 프로젝트 목록 조회
 */
export const getProjects = async (userId, { status, role, page, limit }) => {
    const where = {
        members: {
            some: {
                userId,
                ...(role ? { role } : {}),
            },
        },
        ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: {
                members: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.project.count({ where }),
    ]);

    // 각 프로젝트에 participantCount, myRole 매핑
    const projects = data.map((project) => {
        const myMembership = project.members.find((m) => m.userId === userId);
        return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            participantCount: project.members.length,
            myRole: myMembership?.role || null,
        };
    });

    return {
        data: projects,
        meta: { total, page, limit },
    };
};

/**
 * 프로젝트 생성 + 생성자를 admin으로 등록
 */
export const createProject = async (
    userId,
    { name, description, startDate, endDate },
) => {
    const project = await prisma.project.create({
        data: {
            name,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            creatorId: userId,
            members: {
                create: {
                    userId,
                    role: "admin",
                },
            },
        },
        include: {
            members: true,
        },
    });

    return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        participantCount: project.members.length,
        myRole: "admin",
    };
};

/**
 * 프로젝트 상세 조회 (멤버 권한 확인 포함)
 */
export const getProjectDetail = async (projectId, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            creator: {
                select: { id: true, fullName: true },
            },
            members: {
                include: {
                    user: {
                        select: { id: true, fullName: true, avatarUrl: true },
                    },
                },
            },
        },
    });

    if (!project) {
        return { error: "NOT_FOUND" };
    }

    // 멤버 여부 확인
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
        return { error: "FORBIDDEN" };
    }

    return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        creator: project.creator,
        members: project.members.map((m) => ({
            userId: m.user.id,
            fullName: m.user.fullName,
            role: m.role,
            avatarUrl: m.user.avatarUrl,
        })),
    };
};

/**
 * 프로젝트 수정 (admin만)
 */
export const updateProject = async (projectId, userId, data) => {
    // admin 권한 확인
    const membership = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId, projectId },
        },
    });

    if (!membership) {
        return { error: "NOT_FOUND" };
    }

    if (membership.role !== "admin") {
        return { error: "FORBIDDEN" };
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined)
        updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);

    const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
    });

    return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
    };
};

/**
 * 프로젝트 삭제 (admin만)
 */
export const deleteProject = async (projectId, userId) => {
    const membership = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId, projectId },
        },
    });

    if (!membership) {
        return { error: "NOT_FOUND" };
    }

    if (membership.role !== "admin") {
        return { error: "FORBIDDEN" };
    }

    await prisma.project.delete({
        where: { id: projectId },
    });

    return { success: true };
};
