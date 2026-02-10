import * as projectService from "../services/projectService.js";

/**
 * GET /projects
 * 사용자가 속한 프로젝트 목록 조회
 */
export const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = req.query.status || undefined;
        const role = req.query.role || undefined;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // 유효성 검증
        if (status && !["in_progress", "completed"].includes(status)) {
            return res.status(400).json({
                error: "Bad Request: status must be 'in_progress' or 'completed'",
            });
        }
        if (role && !["admin", "member"].includes(role)) {
            return res.status(400).json({
                error: "Bad Request: role must be 'admin' or 'member'",
            });
        }

        const result = await projectService.getProjects(userId, {
            status,
            role,
            page,
            limit,
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("GetProjects error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * POST /projects
 * 프로젝트 생성
 */
export const createProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, startDate, endDate } = req.body;

        // 필수 필드 검증
        if (!name || name.length < 3) {
            return res.status(400).json({
                error: "Bad Request: name is required and must be at least 3 characters",
            });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({
                error: "Bad Request: startDate and endDate are required",
            });
        }

        // 날짜 유효성 검증
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                error: "Bad Request: Invalid date format (use YYYY-MM-DD)",
            });
        }
        if (end <= start) {
            return res.status(400).json({
                error: "Bad Request: endDate must be after startDate",
            });
        }

        const project = await projectService.createProject(userId, {
            name,
            description,
            startDate,
            endDate,
        });

        return res.status(201).json(project);
    } catch (error) {
        console.error("CreateProject error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET /projects/:id
 * 프로젝트 상세 조회
 */
export const getProjectDetail = async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;

        const result = await projectService.getProjectDetail(projectId, userId);

        if (result.error === "NOT_FOUND") {
            return res.status(404).json({ error: "Project not found" });
        }
        if (result.error === "FORBIDDEN") {
            return res.status(403).json({
                error: "Forbidden: You are not a member of this project",
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("GetProjectDetail error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * PUT /projects/:id
 * 프로젝트 수정 (admin만)
 */
export const updateProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const { name, description, status, startDate, endDate } = req.body;

        // 최소 하나의 필드 필요
        if (!name && !description && !status && !startDate && !endDate) {
            return res.status(400).json({
                error: "Bad Request: At least one field is required",
            });
        }

        // status 유효성 검증
        if (status && !["in_progress", "completed"].includes(status)) {
            return res.status(400).json({
                error: "Bad Request: status must be 'in_progress' or 'completed'",
            });
        }

        // name 길이 검증
        if (name && name.length < 3) {
            return res.status(400).json({
                error: "Bad Request: name must be at least 3 characters",
            });
        }

        const result = await projectService.updateProject(projectId, userId, {
            name,
            description,
            status,
            startDate,
            endDate,
        });

        if (result.error === "NOT_FOUND") {
            return res.status(404).json({ error: "Project not found" });
        }
        if (result.error === "FORBIDDEN") {
            return res.status(403).json({
                error: "Forbidden: Only admin can update this project",
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("UpdateProject error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * DELETE /projects/:id
 * 프로젝트 삭제 (admin만)
 */
export const deleteProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;

        const result = await projectService.deleteProject(projectId, userId);

        if (result.error === "NOT_FOUND") {
            return res.status(404).json({ error: "Project not found" });
        }
        if (result.error === "FORBIDDEN") {
            return res.status(403).json({
                error: "Forbidden: Only admin can delete this project",
            });
        }

        return res.status(204).send();
    } catch (error) {
        console.error("DeleteProject error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
