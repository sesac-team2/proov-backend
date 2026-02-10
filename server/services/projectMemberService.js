import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 프로젝트 멤버 초대 (admin만)
 */
export const inviteMember = async (projectId, inviterUserId, { email, role }) => {
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
