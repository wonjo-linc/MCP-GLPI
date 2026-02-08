# 인프라 환경

- Proxmox: 10.16.1.51
- Docker VM (docker-development, Debian): 10.16.111.180
- Docker 관리: Dockge (/opt/stacks/)
- 리버스 프록시: Nginx Proxy Manager
- 도메인: lincsolution.net
- GLPI LXC: Proxmox 내 LXC 컨테이너

# MCP 서버 개발 컨벤션

## 기술 스택
- 언어: TypeScript
- 트랜스포트: Streamable HTTP
- 프레임워크: @modelcontextprotocol/sdk
- HTTP 서버: Express

## 인증
- OAuth 2.0 authorization code flow (Claude 웹 custom connector용)
- Bearer Token API key (Claude Code용)
- 엔드포인트:
  - `GET /.well-known/oauth-authorization-server` - OAuth 디스커버리
  - `GET /authorize` - 인증 (auto-approve)
  - `POST /oauth/token` - 토큰 발급 (authorization_code, client_credentials)
- 환경변수: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, MCP_API_KEY

## 배포 규칙
- Docker 컨테이너로 배포 (Dockerfile + docker-compose.yml 필수 포함)
- 컨테이너 내부 포트: 3000 고정
- 도메인 패턴: mcp-{서비스명}.lincsolution.net
- Dockge 스택 경로: /opt/stacks/mcp-{서비스명}/
- GHCR 이미지: ghcr.io/wonjo-linc/mcp-{서비스명}:latest
- NPM 프록시: Docker VM IP + 호스트 포트로 연결
- GitHub Actions: master push 시 GHCR에 자동 빌드/배포

## CI/CD 파이프라인
1. 코드 push → GitHub Actions 자동 빌드
2. Docker 이미지 → ghcr.io/wonjo-linc/mcp-{서비스명}:latest
3. Dockge에서 Pull → 최신 이미지로 재시작

## docker-compose.yml 템플릿 (Dockge용)
```yaml
services:
  mcp-{서비스명}:
    image: ghcr.io/wonjo-linc/mcp-{서비스명}:latest
    container_name: mcp-{서비스명}
    restart: unless-stopped
    ports:
      - "{호스트포트}:3000"
    environment:
      - OAUTH_CLIENT_ID=
      - OAUTH_CLIENT_SECRET=
      - MCP_API_KEY=
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## 호스트 포트 할당
- mcp-glpi: 3100

## 클라이언트 연동

### Claude 웹 (custom connector)
- Settings > Connectors > Add custom connector
- URL: https://mcp-{서비스명}.lincsolution.net/mcp
- OAuth Client ID / Secret 입력
- authorization code flow로 자동 인증

### Claude Code
- ~/.claude.json의 mcpServers에 등록
- Bearer Token (MCP_API_KEY) 방식
```json
{
  "mcpServers": {
    "서비스명": {
      "type": "http",
      "url": "https://mcp-{서비스명}.lincsolution.net/mcp",
      "headers": {
        "Authorization": "Bearer {MCP_API_KEY}"
      }
    }
  }
}
```

## 프로젝트 구조
```
src/
├── server.ts         # HTTP 진입점 (Express + StreamableHTTP + OAuth)
├── index.ts          # Stdio 진입점 (로컬 개발용)
├── tools/            # 도구 정의
├── types/            # TypeScript 타입
└── glpi/             # 외부 API 클라이언트
.github/workflows/    # GitHub Actions (docker-publish.yml)
Dockerfile            # Multi-stage build
docker-compose.yml    # 개발/빌드용
```
