# 인프라 환경

- Proxmox: 10.16.1.51
- Docker VM (docker-development, Debian): 10.16.111.180
- Docker 관리: Dockge (/opt/stacks/)
- 리버스 프록시: Nginx Proxy Manager
- 도메인: lincsolution.net

# MCP 서버 개발 컨벤션

## 기술 스택
- 언어: TypeScript
- 트랜스포트: Streamable HTTP (stateless)
- 프레임워크: @modelcontextprotocol/sdk

## 배포 규칙
- Docker 컨테이너로 배포 (Dockerfile + docker-compose.yml 필수 포함)
- 컨테이너 내부 포트: 3000 고정
- 도메인 패턴: mcp-{서비스명}.lincsolution.net
- Dockge 스택 경로: /opt/stacks/mcp-{서비스명}/
- proxy-network (external) 네트워크 사용

## docker-compose.yml 템플릿
모든 MCP 서버는 아래 구조를 따른다:
- restart: unless-stopped
- env_file: .env
- networks: proxy-network (external: true)
- .env.example 파일 필수 포함

## 프로젝트 구조
src/
├── index.ts          # 서버 진입점 (express + StreamableHTTP)
├── tools/            # 도구 정의
└── utils/            # API 클라이언트, 에러 핸들링
Dockerfile (multi-stage build)
docker-compose.yml
.env.example
README.md (배포 가이드 포함)
