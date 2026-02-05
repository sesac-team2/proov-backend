import * as authService from "../services/authService.js";

/**
 * POST /auth/login
 * OAuth 로그인/회원가입
 * - Google: token (Access Token)을 직접 받음
 * - Kakao, GitHub: code (Authorization Code)를 받아서 토큰 교환 후 처리
 */
export const login = async (req, res) => {
    try {
        const { provider, token, code, redirect_uri, full_name, avatar_url } =
            req.body;

        // 유효한 provider 검증
        const validProviders = ["google", "kakao", "github"];
        if (!provider || !validProviders.includes(provider)) {
            return res.status(400).json({
                error: "Bad Request: Invalid or missing provider",
            });
        }

        let accessToken;

        // Provider별 처리
        if (provider === "google") {
            // Google은 프론트에서 이미 token을 받아옴
            if (!token) {
                return res.status(400).json({
                    error: "Bad Request: token is required for Google login",
                });
            }
            accessToken = token;
        } else if (provider === "kakao") {
            // Kakao는 code + redirect_uri -> token 교환 필요
            if (!code || !redirect_uri) {
                return res.status(400).json({
                    error: "Bad Request: code and redirect_uri are required for Kakao login",
                });
            }
            accessToken = await authService.exchangeKakaoCode(
                code,
                redirect_uri,
            );
        } else if (provider === "github") {
            // GitHub는 code + redirect_uri -> token 교환 필요
            if (!code || !redirect_uri) {
                return res.status(400).json({
                    error: "Bad Request: code and redirect_uri are required for GitHub login",
                });
            }
            accessToken = await authService.exchangeGithubCode(
                code,
                redirect_uri,
            );
        }

        // OAuth 토큰으로 유저 정보 가져오기
        let userInfo;
        try {
            userInfo = await authService.verifyOAuthToken(
                provider,
                accessToken,
            );
        } catch (error) {
            return res.status(401).json({
                error: "Unauthorized: Failed to get user info from OAuth provider",
            });
        }

        // 유저 조회 또는 생성
        const user = await authService.findOrCreateUser(
            userInfo.email,
            provider,
            full_name || userInfo.full_name,
            avatar_url || userInfo.avatar_url,
        );

        // JWT 생성
        const jwtData = authService.generateJWT(user);

        return res.status(200).json({
            token: jwtData.token,
            expires_in: jwtData.expires_in,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET /auth/me
 * 현재 유저 정보 조회
 */
export const getMe = async (req, res) => {
    try {
        const user = await authService.findUserById(req.user.id);

        if (!user) {
            return res
                .status(401)
                .json({ error: "Unauthorized: User not found" });
        }

        return res.status(200).json({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
        });
    } catch (error) {
        console.error("GetMe error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * PUT /auth/me
 * 유저 프로필 수정
 */
export const updateMe = async (req, res) => {
    try {
        const { full_name, avatar_url, bio } = req.body;

        // URL 형식 검증 (avatar_url이 있는 경우)
        if (avatar_url) {
            try {
                new URL(avatar_url);
            } catch {
                return res.status(400).json({
                    error: "Bad Request: Invalid avatar_url format",
                });
            }
        }

        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (bio !== undefined) updateData.bio = bio;

        const user = await authService.updateUserProfile(
            req.user.id,
            updateData,
        );

        return res.status(200).json({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            updated_at: user.updated_at,
        });
    } catch (error) {
        console.error("UpdateMe error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * DELETE /auth/me
 * 유저 탈퇴
 */
export const withdraw = async (req, res) => {
    try {
        const userId = req.user.id;

        // 그냥 유저만 삭제하면 끝!
        await authService.deleteUser(userId);

        return res.status(200).json({ message: "성공적으로 탈퇴되었습니다." });
    } catch (error) {
        console.error("Withdraw error:", error);
        return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
};
