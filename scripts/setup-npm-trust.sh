#!/bin/bash

# npm Trusted Publishing 설정 스크립트
# 사용법: ./scripts/setup-npm-trust.sh [package-folder...]
#
# 배포 대상 패키지마다 .github/workflows/release.yml(npm environment)을 신뢰 게시자로 등록한다.
# - npm trust는 npm@11.15.0 이상, 계정 2FA, `npm login`이 필요하다.
# - 패키지가 npm에 한 번은 배포돼 있어야 등록할 수 있다. 새 패키지는 먼저 로컬에서 수동 배포한다.
# - 첫 요청에서 2FA 인증 시 "5분간 건너뛰기"를 선택하면 나머지는 인증 없이 진행된다.

REPOSITORY="cbcruk/eunsoolib"
WORKFLOW="release.yml"
ENVIRONMENT="npm"

cd "$(dirname "$0")/.."

if [ "$#" -gt 0 ]; then
  FOLDERS=("$@")
else
  # macOS 기본 bash(3.2)에는 mapfile이 없다. 폴더명에 공백이 없으므로 단어 분리로 충분하다.
  FOLDERS=($(ls packages))
fi

FAILED=()

for folder in "${FOLDERS[@]}"; do
  pkg_json="packages/$folder/package.json"
  if [ ! -f "$pkg_json" ]; then
    echo "✗ $folder: package.json이 없습니다."
    continue
  fi

  name=$(node -p "require('./$pkg_json').name")
  if [ "$(node -p "require('./$pkg_json').private === true")" = "true" ]; then
    continue
  fi

  if ! npm view "$name" version >/dev/null 2>&1; then
    echo "- $name: npm에 아직 없어 건너뜁니다. 먼저 수동으로 배포하세요."
    continue
  fi

  # 이미 등록된 패키지는 npm이 오류를 내므로 실패를 모아 알리고 계속 진행한다.
  if npm trust github "$name" \
    --repository "$REPOSITORY" \
    --file "$WORKFLOW" \
    --environment "$ENVIRONMENT" \
    --allow-publish \
    --yes; then
    echo "✓ $name"
  else
    FAILED+=("$name")
  fi

  # npm 권장: 요청 사이 2초 대기 (rate limit)
  sleep 2
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  echo ""
  echo "등록 실패 (이미 등록됐거나 권한 문제): ${FAILED[*]}"
  echo "기존 설정 확인: npm trust list <package>"
  exit 1
fi
