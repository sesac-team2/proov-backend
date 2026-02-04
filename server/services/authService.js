import jwt from "jsonwebtoken";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = 3600; // 1 hour

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

    if (!user) {
        user = await prisma.users.create({
            data: {
                email,
                provider,
                full_name: fullName,
                avatar_url: avatarUrl,
            },
        });
    }

    return user;
};

/**
 * JWT 토큰 생성
 */
export const generateJWT = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
        token,
        expires_in: JWT_EXPIRES_IN,
    };
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
