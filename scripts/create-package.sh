#!/bin/bash

# 패키지 생성 스크립트
# 사용법: ./scripts/create-package.sh <package-name>

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 패키지 이름 확인
if [ -z "$1" ]; then
  echo -e "${RED}오류: 패키지 이름을 입력해주세요.${NC}"
  echo "사용법: ./scripts/create-package.sh <package-name>"
  echo "예시: ./scripts/create-package.sh my-util"
  exit 1
fi

PACKAGE_NAME="$1"
PACKAGE_DIR="packages/$PACKAGE_NAME"

# 패키지 디렉토리 존재 확인
if [ -d "$PACKAGE_DIR" ]; then
  echo -e "${RED}오류: '$PACKAGE_DIR' 디렉토리가 이미 존재합니다.${NC}"
  exit 1
fi

echo -e "${YELLOW}패키지 생성 중: $PACKAGE_NAME${NC}"

# 디렉토리 생성
mkdir -p "$PACKAGE_DIR/src"

# package.json 생성
cat > "$PACKAGE_DIR/package.json" << EOF
{
  "name": "@eunsoolib/$PACKAGE_NAME",
  "description": "TODO: 한 줄 설명",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "eunsoolib": {
    "category": "utils",
    "runtime": ["universal"]
  }
}
EOF

# tsconfig.json 생성
cat > "$PACKAGE_DIR/tsconfig.json" << EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
EOF

# kebab-case를 camelCase로 변환하는 함수 (macOS/Linux 호환)
to_camel_case() {
  echo "$1" | awk -F'-' '{
    result = $1
    for (i = 2; i <= NF; i++) {
      result = result toupper(substr($i, 1, 1)) substr($i, 2)
    }
    print result
  }'
}

FUNCTION_NAME=$(to_camel_case "$PACKAGE_NAME")

# 메인 구현 파일 생성
cat > "$PACKAGE_DIR/src/$PACKAGE_NAME.ts" << EOF
export function $FUNCTION_NAME() {
  // TODO: 구현
}
EOF

# 테스트 파일 생성
cat > "$PACKAGE_DIR/src/$PACKAGE_NAME.test.ts" << EOF
import { describe, expect, test } from 'vitest'
import { $FUNCTION_NAME } from './$PACKAGE_NAME'

describe('$FUNCTION_NAME', () => {
  test('기본 동작을 테스트한다', () => {
    // TODO: 테스트 구현
    expect(true).toBe(true)
  })
})
EOF

# README.md 생성 (템플릿의 규칙 주석은 작성 가이드로 남겨 둔다)
sed -e "s/{{name}}/$PACKAGE_NAME/g" -e "s/{{description}}/TODO: 한 줄 설명/g" \
  "$(dirname "$0")/templates/README.md" > "$PACKAGE_DIR/README.md"

# index.ts 생성
cat > "$PACKAGE_DIR/src/index.ts" << EOF
export { $FUNCTION_NAME } from './$PACKAGE_NAME'
EOF

echo -e "${GREEN}✓ 패키지가 성공적으로 생성되었습니다!${NC}"
echo ""
echo "생성된 파일:"
echo "  $PACKAGE_DIR/"
echo "  ├── package.json"
echo "  ├── README.md"
echo "  ├── tsconfig.json"
echo "  └── src/"
echo "      ├── index.ts"
echo "      ├── $PACKAGE_NAME.ts"
echo "      └── $PACKAGE_NAME.test.ts"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo "  0. $PACKAGE_DIR/package.json의 description과 eunsoolib.category/runtime을 채우세요 (CLAUDE.md 참고)"
echo "  1. $PACKAGE_DIR/src/$PACKAGE_NAME.ts 파일에서 구현을 작성하세요"
echo "  2. $PACKAGE_DIR/src/$PACKAGE_NAME.test.ts 파일에서 테스트를 작성하세요"
echo "  3. $PACKAGE_DIR/README.md를 채우고 pnpm check:readme로 검사하세요"
echo "  4. pnpm test:run 으로 테스트를 실행하세요"
