# 🚀 PROV Backend CI/CD 설정 가이드

## 📋 개요

이 문서는 PROV 백엔드의 GitHub Actions CI/CD 파이프라인 설정 방법을 안내합니다.

## 🔧 필수 설정

### 1. GitHub Secrets 등록

Repository Settings → Secrets and variables → Actions에서 아래 Secret들을 등록해주세요.

#### Dev 환경 Secrets
```
DEV_EC2_HOST       # Dev 서버 IP 주소 (예: 13.124.xxx.xxx)
DEV_EC2_USER       # SSH 접속 사용자명 (예: ubuntu, ec2-user)
DEV_EC2_SSH_KEY    # SSH Private Key (전체 내용 복사)
```

#### Production 환경 Secrets
```
PROD_EC2_HOST      # Production 서버 IP 주소
PROD_EC2_USER      # SSH 접속 사용자명
PROD_EC2_SSH_KEY   # SSH Private Key (전체 내용 복사)
```

#### Docker 관련 Secrets (Docker 사용 시)
```
DOCKER_USERNAME    # Docker Hub 사용자명
DOCKER_PASSWORD    # Docker Hub 비밀번호 또는 Access Token
```

### 2. SSH Key 생성 방법

로컬 또는 EC2 서버에서 실행:

```bash
# 1. SSH Key 생성 (비밀번호 없이)
ssh-keygen -t rsa -b 4096 -C "prov-backend-deploy" -f ~/.ssh/prov-deploy

# 2. Public Key를 EC2 서버에 등록
cat ~/.ssh/prov-deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. Private Key 내용 확인 (이것을 GitHub Secret에 등록)
cat ~/.ssh/prov-deploy
```

**중요:** Private Key 전체 내용(-----BEGIN ~ END----- 포함)을 복사하여 GitHub Secret에 등록하세요.

---

## 🔄 Workflow 동작 방식

### CI (Continuous Integration)
Pull Request 또는 Push 시 자동으로 실행됩니다.

```
1. 코드 체크아웃
2. pnpm 설치
3. 의존성 설치
4. Prisma Client 생성
5. 린트 & 테스트 실행
```

### CD (Continuous Deployment)

#### Dev 브랜치 → Dev 서버
`dev` 브랜치에 Push하면 자동으로 Dev 서버에 배포됩니다.

```bash
git checkout dev
git pull origin dev
# ... 작업 ...
git add .
git commit -m "Feat: 새로운 기능 추가"
git push origin dev  # 🚀 자동 배포 트리거!
```

#### Main 브랜치 → Production 서버
`main` 브랜치에 Push하면 Production 서버에 배포됩니다.

```bash
# dev → main 머지 (PR 승인 후)
git checkout main
git pull origin main
git merge dev
git push origin main  # 🎉 Production 배포!
```

---

## 🖥️ EC2 서버 사전 설정

배포가 원활하게 이루어지려면 EC2 서버에 다음을 설정해야 합니다.

### 1. Node.js & pnpm 설치

```bash
# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm 설치
npm install -g pnpm

# PM2 설치 (프로세스 관리)
npm install -g pm2
```

### 2. 프로젝트 Clone

```bash
# Dev 서버
cd ~
git clone https://github.com/your-org/prov-backend.git
cd prov-backend
git checkout dev

# Production 서버
cd ~
git clone https://github.com/your-org/prov-backend.git
cd prov-backend
git checkout main
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
nano ~/prov-backend/.env
```

```.env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/prov_db"

# Server
PORT=5000
NODE_ENV=production

# JWT (예시)
JWT_SECRET="your-secret-key"

# 기타 필요한 환경 변수들...
```

### 4. 초기 배포 테스트

```bash
cd ~/prov-backend
pnpm install
npx prisma generate
npx prisma migrate deploy

# PM2로 서버 시작
pm2 start app.js --name prov-backend-dev  # Dev 서버
# 또는
pm2 start app.js --name prov-backend-prod  # Production 서버

# PM2 자동 시작 설정
pm2 startup
pm2 save
```

---

## 📊 배포 모니터링

### GitHub Actions 확인
1. GitHub Repository → Actions 탭
2. 최근 Workflow 실행 내역 확인
3. 실패 시 로그 확인

### 서버 상태 확인

```bash
# SSH로 서버 접속
ssh -i ~/.ssh/prov-deploy.pem ubuntu@your-ec2-ip

# PM2 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs prov-backend-dev  # Dev
pm2 logs prov-backend-prod  # Prod

# 서버 재시작 (필요시)
pm2 restart prov-backend-dev
```

---

## 🐛 트러블슈팅

### 1. SSH 연결 실패
```
Error: Permission denied (publickey)
```
**해결:** SSH Key가 올바르게 등록되었는지 확인하세요.

```bash
# EC2에서 확인
cat ~/.ssh/authorized_keys  # Public Key가 있어야 함
```

### 2. Prisma 마이그레이션 실패
```
Error: Migration failed
```
**해결:** DATABASE_URL이 올바른지 확인하고, DB 접근 권한을 체크하세요.

### 3. PM2 프로세스가 시작되지 않음
```bash
# 로그 확인
pm2 logs prov-backend-dev --lines 100

# 환경 변수 확인
pm2 show prov-backend-dev
```

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] GitHub Secrets 모두 등록 완료
- [ ] EC2 서버에 Node.js, pnpm, PM2 설치 완료
- [ ] EC2 서버에 프로젝트 Clone 완료
- [ ] .env 파일 설정 완료
- [ ] SSH Key 등록 및 연결 테스트 완료
- [ ] PostgreSQL 설치 및 DB 생성 완료
- [ ] 초기 Prisma 마이그레이션 완료
- [ ] PM2로 서버 실행 테스트 완료

---

## 🎯 다음 단계

1. **Slack/Discord 알림 연동**
   - 배포 성공/실패 시 팀 채널에 알림
   
2. **Health Check 추가**
   - `/health` 엔드포인트 구현
   - 배포 후 자동 헬스체크

3. **롤백 전략**
   - 배포 실패 시 자동 롤백 메커니즘

4. **성능 모니터링**
   - PM2 Plus, New Relic, Datadog 등 연동

---

## 📞 문의

배포 관련 이슈가 있으면 백엔드 팀에게 연락주세요!

- **albenyu12** [@albenyu12](https://github.com/albenyu12)
- **wjddns0122** [@wjddns0122](https://github.com/wjddns0122)