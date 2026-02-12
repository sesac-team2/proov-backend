import * as publicShareService from "../services/publicShareService.js";

/**
 * GET /share/:userId — 공개 포트폴리오 조회 (인증 불필요)
 */
export const getPublicPortfolio = async (req, res) => {
    const portfolio = await publicShareService.getPublicPortfolio(
        req.params.userId,
    );
    if (!portfolio) {
        return res.status(404).json({
            error: "유저가 없거나 프로필이 비공개입니다.",
        });
    }
    return res.status(200).json(portfolio);
};
