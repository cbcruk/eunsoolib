import {
  createFileSystemGeneratorCache,
  createGenerator,
} from 'fumadocs-typescript'
import { AutoTypeTable } from 'fumadocs-typescript/ui'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Demo } from '@/components/demos'
import { getMDXComponents } from '@/components/mdx'
import { source } from '@/lib/source'
import { resolveFromRoot, typeTables } from '@/lib/type-tables'

const generator = createGenerator({
  tsconfigPath: resolveFromRoot('tsconfig.json'),
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
})

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const slug = (params.slug ?? []).join('/')
  const MDX = page.data.body
  const tables = typeTables[slug] ?? []

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Demo slug={slug} />
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
        {tables.length > 0 && (
          <>
            <h2 id="types">타입 (자동 생성)</h2>
            {tables.map(({ file, name }) => (
              <section key={`${file}#${name}`}>
                <h3 id={`type-${name}`}>
                  <code>{name}</code>
                </h3>
                <AutoTypeTable
                  generator={generator}
                  path={resolveFromRoot(file)}
                  name={name}
                />
              </section>
            ))}
          </>
        )}
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
