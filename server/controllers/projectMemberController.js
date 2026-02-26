import * as projectMemberService from "../services/projectMemberService.js";

/**
 * POST /projects/:id/members
 * 프로젝트 멤버 초대 (admin만)
 */
export const inviteMember = async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const { email, role } = req.body;

        // 필수 필드 검증
        if (!email) {
            return res.status(400).json({
                error: "Bad Request: email is required",
            });
        }

        if (!role) {
            return res.status(400).json({
                error: "Bad Request: role is required",
            });
        }

        // role 유효성 검증
        if (!["admin", "member"].includes(role)) {
            return res.status(400).json({
                error: "Bad Request: role must be 'admin' or 'member'",
            });
        }

        const result = await projectMemberService.inviteMember(
            projectId,
            userId,
            {
                email,
                role,
            },
        );

        if (result.error === "NOT_FOUND") {
            return res.status(404).json({ error: "Project not found" });
        }

        if (result.error === "FORBIDDEN") {
            return res.status(403).json({
                error: "Forbidden: Only admin can invite members",
            });
        }

        if (result.error === "USER_NOT_FOUND") {
            return res.status(404).json({
                error: "User not found",
            });
        }

        if (result.error === "ALREADY_MEMBER") {
            return res.status(403).json({
                error: "Forbidden: User is already a member of this project",
            });
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error("InviteMember error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * DELETE /projects/:id/members/leave
 * 프로젝트 나가기
 */
export const leaveProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;

        const result = await projectMemberService.leaveProject(
            projectId,
            userId,
        );

        if (result.error === "NOT_MEMBER") {
            return res.status(403).json({
                error: "Forbidden: You are not a member of this project",
            });
        }

        if (result.error === "SOLE_ADMIN") {
            return res.status(403).json({
                error: "Forbidden: Sole admin cannot leave the project. Please assign another admin or delete the project.",
            });
        }

        return res.status(204).send(); // No Content
    } catch (error) {
        console.error("LeaveProject error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
