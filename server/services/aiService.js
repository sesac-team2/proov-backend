import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 기본 질문 (Gemini API 호출 실패 시 fallback)
const DEFAULT_QUESTIONS = [
    "이 프로젝트에서 해당 팀원이 가장 크게 기여한 부분은 무엇인가요?",
    "이 팀원과 협업하면서 인상 깊었던 점은 무엇인가요?",
    "이 팀원의 기술적 강점은 무엇이라고 생각하나요?",
    "이 팀원이 프로젝트에서 보여준 리더십이나 문제 해결 능력에 대해 설명해주세요.",
    "이 팀원에게 추천하고 싶은 성장 방향이 있다면 무엇인가요?",
];

/**
 * 프로젝트 기반 리뷰 질문 생성
 * @param {string} projectTitle - 프로젝트 제목
 * @param {string} projectDescription - 프로젝트 설명
 * @returns {Promise<string[]>} 질문 배열
 */
export const generateReviewQuestions = async (
    projectTitle,
    projectDescription,
) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `당신은 프로젝트 팀원 기여도 리뷰를 돕는 어시스턴트입니다.
아래 프로젝트 정보를 바탕으로, 리뷰어가 특정 팀원에 대해 기여 증언을 작성할 때 도움이 될 구체적인 질문 3~5가지를 생성해주세요.

프로젝트 제목: ${projectTitle}
프로젝트 설명: ${projectDescription || "설명 없음"}

규칙:
- 질문은 한국어로 작성해주세요.
- 각 질문은 구체적이고 답변하기 쉬운 형태여야 합니다.
- 기술적 기여, 협업 능력, 문제 해결 능력 등 다양한 관점을 포함해주세요.
- JSON 배열 형식으로만 응답해주세요. 예: ["질문1", "질문2", "질문3"]
- 마크다운이나 추가 설명 없이 순수 JSON 배열만 반환해주세요.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // JSON 파싱 시도 (마크다운 코드 블록 제거)
        const cleanedText = responseText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const questions = JSON.parse(cleanedText);

        if (Array.isArray(questions) && questions.length >= 3) {
            return questions;
        }

        return DEFAULT_QUESTIONS;
    } catch (error) {
        console.error("AI 질문 생성 실패 (fallback 사용):", error.message);
        return DEFAULT_QUESTIONS;
    }
};

/**
 * 증언 본문 요약
 * @param {string} content - 증언 본문
 * @returns {Promise<string>} 1~2문장 요약
 */
export const summarizeTestimonial = async (content) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `아래 기여 증언 본문을 딱 1줄로 짧게 요약해주세요.

본문:
${content}

규칙:
- 한국어로 요약해주세요.
- 무조건 1문장(1줄)으로만 반환해주세요 (마침표 포함, 인용부호나 마크다운 없이).
- 핵심 내용만 간결하게 설명해주세요.`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text().trim();

        return summary;
    } catch (error) {
        console.error("AI 요약 생성 실패 (빈 문자열 반환):", error.message);
        return "";
    }
};

/**
 * 증언 본문과 하이라이트에서 스킬 5개 추출
 * @param {string} content - 증언 본문
 * @param {string[]} highlights - 하이라이트 배열
 * @returns {Promise<string[]>} 스킬 배열 (최대 5개)
 */
export const generateSkillsFromTestimonial = async (
    content,
    highlights = [],
) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `당신은 프로젝트 팀원의 업무 능력을 분석하는 어시스턴트입니다.
아래 기여 증언 본문과 하이라이트 핵심 문구를 바탕으로, 이 팀원이 보유하고 있거나 발휘한 업무/기술 스킬을 딱 5개 이내로 추출해주세요.

본문:
${content}

하이라이트:
${highlights.join(", ")}

규칙:
- 스킬 이름은 영어 혹은 한국어 명사형으로 간결하게 작성해주세요 (예: "Backend", "Leadership", "아키텍처 설계").
- 최대 5개까지만 추출해주세요.
- JSON 배열 형식으로만 응답해주세요. 예: ["스킬1", "스킬2", "스킬3"]
- 마크다운이나 추가 설명 없이 순수 JSON 배열만 반환해주세요.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // JSON 파싱 시도 (마크다운 코드 블록 제거)
        const cleanedText = responseText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const extractedSkills = JSON.parse(cleanedText);

        if (Array.isArray(extractedSkills)) {
            return extractedSkills.slice(0, 5); // 5개 제한
        }

        return [];
    } catch (error) {
        console.error("AI 스킬 추출 실패 (빈 배열 반환):", error.message);
        return [];
    }
};
