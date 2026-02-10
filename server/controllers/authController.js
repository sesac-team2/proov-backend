import * as authService from "../services/authService.js";

/**
 * POST /auth/login
 * OAuth 로그인/회원가입
 * - Google: token (Access Token)을 직접 받음
 * - Kakao, GitHub: code (Authorization Code)를 받아서 토큰 교환 후 처리
 */
export const login = async (req, res) => {
    try {
        const { provider, token, code, redirectUri, fullName, avatarUrl } =
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
            // Kakao는 code + redirectUri -> token 교환 필요
            if (!code || !redirectUri) {
                return res.status(400).json({
                    error: "Bad Request: code and redirectUri are required for Kakao login",
                });
            }
            accessToken = await authService.exchangeKakaoCode(
                code,
                redirectUri,
            );
        } else if (provider === "github") {
            // GitHub는 code + redirectUri -> token 교환 필요
            if (!code || !redirectUri) {
                return res.status(400).json({
                    error: "Bad Request: code and redirectUri are required for GitHub login",
                });
            }
            accessToken = await authService.exchangeGithubCode(
                code,
                redirectUri,
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
            fullName || userInfo.fullName,
            avatarUrl || userInfo.avatarUrl,
        );

        // Access Token 생성
        const accessTokenData = authService.generateAccessToken(user);

        // Refresh Token 생성 및 DB 저장
        const refreshTokenData = await authService.generateRefreshToken(user);

        return res.status(200).json({
            accessToken: accessTokenData.token,
            refreshToken: refreshTokenData.token,
            expiresIn: accessTokenData.expiresIn,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * POST /auth/refresh
 * Access Token 재발급
 * - refreshToken을 request body로 받음
 */
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                error: "Unauthorized: No refresh token provided",
            });
        }

        // Refresh Token 검증 및 유저 정보 가져오기
        let user;
        try {
            user = await authService.verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({
                error: "Unauthorized: Invalid or expired refresh token",
            });
        }

        // 기존 Refresh Token 삭제 (Token Rotation)
        await authService.deleteRefreshToken(refreshToken);

        // 새 Access Token 생성
        const accessTokenData = authService.generateAccessToken(user);

        // 새 Refresh Token 생성 및 DB 저장
        const newRefreshTokenData =
            await authService.generateRefreshToken(user);

        return res.status(200).json({
            accessToken: accessTokenData.token,
            refreshToken: newRefreshTokenData.token,
            expiresIn: accessTokenData.expiresIn,
        });
    } catch (error) {
        console.error("Refresh error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * POST /auth/logout
 * 로그아웃
 * - refreshToken을 request body로 받음
 */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // DB에서 Refresh Token 삭제
            await authService.deleteRefreshToken(refreshToken);
        }

        return res.status(200).json({ message: "로그아웃 되었습니다." });
    } catch (error) {
        console.error("Logout error:", error);
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
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            createdAt: user.createdAt,
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
        const { fullName, avatarUrl, bio } = req.body;

        // URL 형식 검증 (avatarUrl이 있는 경우)
        if (avatarUrl) {
            try {
                new URL(avatarUrl);
            } catch {
                return res.status(400).json({
                    error: "Bad Request: Invalid avatarUrl format",
                });
            }
        }

        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (bio !== undefined) updateData.bio = bio;

        const user = await authService.updateUserProfile(
            req.user.id,
            updateData,
        );

        return res.status(200).json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            updatedAt: user.updatedAt,
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

        // 유저 삭제 (Cascade로 RefreshToken도 함께 삭제됨)
        await authService.deleteUser(userId);

        return res.status(200).json({ message: "성공적으로 탈퇴되었습니다." });
    } catch (error) {
        console.error("Withdraw error:", error);
        return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
};
