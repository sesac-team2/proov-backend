# 🚀 PROOV Backend

> **"Code tells what, Peers tell how."** > PR에 담기지 않은 당신의 진짜 영향력, 동료의 증언으로 증명(PROV)하세요.

이 레포지토리는 **PROOV** 서비스의 코어 비즈니스 로직과 데이터베이스 관리를 담당하는 **백엔드 서버**입니다.

---

## 👥 PROOV Team (The Architects)

| 역할         |                          프로필                          | 닉네임         | GitHub                                       |
| :----------- | :------------------------------------------------------: | :------------- | :------------------------------------------- |
| **Backend**  | <img src="https://github.com/albenyu12.png" width="50">  | **albenyu12**  | [@albenyu12](https://github.com/albenyu12)   |
| **Backend**  | <img src="https://github.com/wjddns0122.png" width="50"> | **wjddns0122** | [@wjddns0122](https://github.com/wjddns0122) |
| **Frontend** | <img src="https://github.com/soobeen27.png" width="50">  | **soobeen27**  | [@soobeen27](https://github.com/soobeen27)   |
| **Frontend** | <img src="https://github.com/yungoonkim.png" width="50"> | **yungoonkim** | [@yungoonkim](https://github.com/yungoonkim) |

---

## 🛠 Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express
- **Language:** JavaScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Package Manager:** `pnpm`
- **Infrastructure:** AWS EC2, Docker

---

## 📂 Project Structure

우리는 계층화된 아키텍처(Layered Architecture)를 지향합니다.

```text
server/
├── config/             # DB 설정, 환경 변수(env) 관리
├── controllers/        # 클라이언트 요청 수신 및 응답 반환 (Entry)
├── routes/             # URL 경로와 컨트롤러 연결 (Router)
├── services/           # 비즈니스 로직 및 DB 처리 (Core)
├── models/             # Prisma 스키마 및 DB 모델 정의
├── middlewares/        # 인증, 에러 핸들링 등 공통 작업
├── utils/              # 날짜 변환, 암호화 등 유틸리티
├── .env                # 환경 변수 (Git 배제)
└── app.js              # 서버 엔트리 포인트
```

## 📝 Naming Convention

코드의 일관성을 유지하기 위해 아래 규칙을 반드시 준수합니다.
| 대상 | 규칙 | 예시 |
| :--- | :---: | :--- |
| 파일 이름 | `camelCase` | `userController.js`, `authRoute.js` |
| 변수 / 함수 | `camelCase` | `const getUserInfo`, ` function createProject()` |
| DB 스키마 / 클래스 | `PascalCase` | `model User { ... }`, `model Testimony { ... }`|
| 환경 변수 | UPPER_SNAKE | `PORT=5000`, `DB_PASSWORD=...` |
| API 경로 (URL) | kebab-case | `/api/project-list`, `/api/user-profile` |

## 🌿 Git Strategy & Workflow

우리는 **Git Flow** 를 기반으로 효율적인 협업을 진행합니다.

1. Branches

- `main`: 배포용 최상위 브랜치
- `dev`: 개발 통합 브랜치 (기본 브랜치)
- `feat/`: 새로운 기능 개발 (예: `feat/login`)
- `bug/`: 버그 수정 (예: `bug/fix-auth`)
- `refactor/`: 코드 리팩토링 (예: `refactor/db-schema`)

2. Commit Message Convention
   `Tag: Description` 형식을 따릅니다.

| Tag      |        Description         |
| :------- | :------------------------: |
| Feat     |      새로운 기능 추가      |
| Fix      |         버그 수정          |
| Design   |       UI 디자인 변경       |
| Refactor |       코드 리팩토링        |
| Rename   | 파일/폴더명 수정 또는 이동 |
| Remove   |         파일 삭제          |

3. Collaboration Rules (PR)
   중요: `dev` 브랜치에 직접 Push 금지

- 모든 작업은 개별 브랜치에서 진행 후 dev로 **PR(Pull Request)**을 올립니다.
- 반드시 팀원 한 명 이상의 **"LGTM(Looks Good To ME)"** 승인을 받아야 머지할 수 있습니다.

---

## ⚙️ How to Start

```bash
# 1. 패키지 설치
pnpm install

# 2. Prisma 클라이언트 생성 및 DB 마이그레이션
npx prisma generate
npx prisma migrate dev

# 3. 서버 실행 (Development)
pnpm run dev
```
