import jwt from "jsonwebtoken";
import axios from "axios";
import qs from "qs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const ACCESS_TOKEN_EXPIRES_IN = 900; // 15분
const REFRESH_TOKEN_EXPIRES_IN = 604800; // 7일

/**
 * 카카오 Authorization Code -> Access Token 교환
 * @param {string} code - Authorization Code
 * @param {string} redirect_uri - 프론트에서 사용한 redirect_uri
 */
export const exchangeKakaoCode = async (code, redirect_uri) => {
    try {
        const response = await axios.post(
            "https://kauth.kakao.com/oauth/token",
            qs.stringify({
                grant_type: "authorization_code",
                client_id: process.env.KAKAO_CLIENT_ID,
                redirect_uri: redirect_uri,
                code: code,
            }),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=utf-8",
                },
            },
        );
        return response.data.access_token;
    } catch (error) {
        console.error(
            "카카오 토큰 교환 실패:",
            error.response?.data || error.message,
        );
        throw new Error("카카오 로그인 실패");
    }
};

/**
 * 깃허브 Authorization Code -> Access Token 교환
 * @param {string} code - Authorization Code
 * @param {string} redirect_uri - 프론트에서 사용한 redirect_uri
 */
export const exchangeGithubCode = async (code, redirect_uri) => {
    try {
        const response = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: redirect_uri,
            },
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        if (response.data.error) {
            throw new Error(response.data.error_description);
        }

        return response.data.access_token;
    } catch (error) {
        console.error(
            "깃허브 토큰 교환 실패:",
            error.response?.data || error.message,
        );
        throw new Error("깃허브 로그인 실패");
    }
};

/**
 * OAuth provider별 토큰 검증
 */
export const verifyOAuthToken = async (provider, token) => {
    try {
        let userInfo;

        switch (provider) {
            case "google":
                userInfo = await verifyGoogleToken(token);
                break;
            case "kakao":
                userInfo = await verifyKakaoToken(token);
                break;
            case "github":
                userInfo = await verifyGithubToken(token);
                break;
            default:
                throw new Error("Invalid provider");
        }

        return userInfo;
    } catch (error) {
        throw new Error("Failed to verify OAuth token");
    }
};

const verifyGoogleToken = async (token) => {
    const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return {
        email: response.data.email,
        full_name: response.data.name,
        avatar_url: response.data.picture,
    };
};

const verifyKakaoToken = async (token) => {
    const response = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
    const { kakao_account, properties } = response.data;
    return {
        email: kakao_account?.email,
        full_name: properties?.nickname,
        avatar_url: properties?.profile_image,
    };
};

const verifyGithubToken = async (token) => {
    // 1. 기본 유저 정보 가져오기
    const userResponse = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
    });

    let email = userResponse.data.email;

    // 2. 만약 기본 정보에 이메일이 null이라면 별도의 이메일 API 호출
    if (!email) {
        const emailResponse = await axios.get(
            "https://api.github.com/user/emails",
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );

        // 여러 이메일 중 primary이고 verified된 것을 찾음
        const primaryEmailObj = emailResponse.data.find(
            (e) => e.primary && e.verified,
        );
        email = primaryEmailObj
            ? primaryEmailObj.email
            : emailResponse.data[0]?.email;
    }

    return {
        email: email, // 이제 null이 아님!
        full_name: userResponse.data.name || userResponse.data.login,
        avatar_url: userResponse.data.avatar_url,
    };
};

/**
 * 유저 조회 또는 생성
 */
export const findOrCreateUser = async (
    email,
    provider,
    fullName,
    avatarUrl,
) => {
    let user = await prisma.users.findUnique({
        where: { email },
    });

    // 유저 이름이 null 이거나 undefined 이면 기본 닉네임 할당
    const finalFullName = fullName || "proov_yourself";

    if (!user) {
        user = await prisma.users.create({
            data: {
                email,
                provider,
                full_name: finalFullName,
                avatar_url: avatarUrl,
            },
        });
    }

    return user;
};

/**
 * Access Token 생성 (15분)
 */
export const generateAccessToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    return {
        token,
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
    };
};

/**
 * Refresh Token 생성 및 DB 저장 (7일)
 */
export const generateRefreshToken = async (user) => {
    const payload = {
        id: user.id,
        type: "refresh",
    };

    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);

    // DB에 저장
    await prisma.refreshToken.create({
        data: {
            token,
            userId: user.id,
            expires_at: expiresAt,
        },
    });

    return {
        token,
        expires_in: REFRESH_TOKEN_EXPIRES_IN,
    };
};

/**
 * Refresh Token 검증 (DB에서 확인)
 */
export const verifyRefreshToken = async (token) => {
    try {
        // JWT 검증
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

        // DB에서 토큰 찾기
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!storedToken) {
            throw new Error("Token not found in database");
        }

        // 만료 확인
        if (new Date() > storedToken.expires_at) {
            await prisma.refreshToken.delete({ where: { token } });
            throw new Error("Token expired");
        }

        return storedToken.user;
    } catch (error) {
        throw new Error("Invalid refresh token");
    }
};

/**
 * Refresh Token 삭제 (로그아웃, 토큰 갱신 시)
 */
export const deleteRefreshToken = async (token) => {
    try {
        await prisma.refreshToken.delete({
            where: { token },
        });
    } catch (error) {
        // 이미 삭제된 토큰이면 무시
    }
};

/**
 * 유저의 모든 Refresh Token 삭제 (모든 기기에서 로그아웃)
 */
export const deleteUserRefreshTokens = async (userId) => {
    await prisma.refreshToken.deleteMany({
        where: { userId },
    });
};

/**
 * JWT 토큰 생성 (하위 호환성 유지 - deprecated)
 * @deprecated generateAccessToken과 generateRefreshToken 사용 권장
 */
export const generateJWT = (user) => {
    return generateAccessToken(user);
};

/**
 * 유저 ID로 조회
 */
export const findUserById = async (id) => {
    return await prisma.users.findUnique({
        where: { id },
    });
};

/**
 * 유저 프로필 업데이트
 */
export const updateUserProfile = async (id, data) => {
    return await prisma.users.update({
        where: { id },
        data,
    });
};

/**
 * 유저 삭제 (탈퇴)
 * onDelete: SetNull 설정으로 연결된 프로젝트의 userId가 자동으로 NULL로 변경됨
 */
export const deleteUser = async (id) => {
    return await prisma.users.delete({
        where: { id },
    });
};
