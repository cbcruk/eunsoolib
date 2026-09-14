import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">eunsoolib</h1>
      <p className="text-fd-muted-foreground">
        예전에 간단하게 쓰던 코드를 모아 둔 TypeScript 유틸리티 모음
      </p>
      <Link
        href="/docs"
        className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
      >
        문서 보기
      </Link>
    </main>
  )
}
