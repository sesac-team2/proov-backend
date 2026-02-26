import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 프로젝트 멤버 초대 (admin만)
 */
export const inviteMember = async (
    projectId,
    inviterUserId,
    { email, role },
) => {
    // 1. 프로젝트 존재 여부 확인
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        return { error: "NOT_FOUND" };
    }

    // 2. 초대자가 admin인지 확인
    const inviterMembership = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId: inviterUserId, projectId },
        },
    });

    if (!inviterMembership) {
        return { error: "FORBIDDEN" };
    }

    if (inviterMembership.role !== "admin") {
        return { error: "FORBIDDEN" };
    }

    // 3. 이메일로 유저 조회
    const invitedUser = await prisma.users.findUnique({
        where: { email },
    });

    if (!invitedUser) {
        return { error: "USER_NOT_FOUND" };
    }

    // 4. 이미 멤버인지 확인 (중복 초대 방지)
    const existingMember = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: {
                userId: invitedUser.id,
                projectId,
            },
        },
    });

    if (existingMember) {
        return { error: "ALREADY_MEMBER" };
    }

    // 5. ProjectMember 생성 (status: "invited")
    const member = await prisma.projectMember.create({
        data: {
            userId: invitedUser.id,
            projectId,
            role: role || "member",
            status: "invited",
        },
    });

    return {
        userId: member.userId,
        role: member.role,
        status: member.status,
    };
};

/**
 * 프로젝트 나가기
 */
export const leaveProject = async (projectId, userId) => {
    // 1. 멤버십 존재 확인
    const membership = await prisma.projectMember.findUnique({
        where: {
            userId_projectId: { userId, projectId },
        },
    });

    if (!membership) {
        return { error: "NOT_MEMBER" };
    }

    // 2. 만약 유일한 admin이라면 나갈 수 없음 (다른 유저가 admin인 경우만 허용하거나 프로젝트 삭제 유도)
    if (membership.role === "admin") {
        const adminCount = await prisma.projectMember.count({
            where: {
                projectId,
                role: "admin",
            },
        });

        if (adminCount <= 1) {
            return { error: "SOLE_ADMIN" };
        }
    }

    // 3. 프로젝트 멤버 삭제
    await prisma.projectMember.delete({
        where: {
            userId_projectId: { userId, projectId },
        },
    });

    return { success: true };
};
