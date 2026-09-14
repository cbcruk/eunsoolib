# Changesets

패키지 변경을 릴리스할 때 이 폴더에 changeset 파일을 추가합니다. 자세한 내용은 [changesets 문서](https://changesets.dev)를 참고하세요.

```bash
pnpm changeset          # 대화형으로 패키지와 bump 종류 선택
pnpm changeset --patch @cbcruk/sync-store -m "구독 해제 시 리스너 누수 수정"
```

- 사용자에게 영향이 있는 변경(버그 수정, API 추가·변경)에만 추가합니다. 테스트·문서·빌드 설정만 바꾼 PR에는 필요 없습니다.
- `0.x` 버전에서는 호환되지 않는 변경도 `minor`로 올립니다.
- PR이 `main`에 머지되면 Release 워크플로가 "Version Packages" PR을 만들고, 그 PR을 머지하면 npm에 배포됩니다.
