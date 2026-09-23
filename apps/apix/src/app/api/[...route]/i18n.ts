import { Hono } from 'hono'
import { z } from 'zod'
import { i18nEnv } from '@/lib/env'

// 기본값은 스키마에 둔다. 예전에는 구조 분해에만 기본값이 있어서, 파라미터 없이
// 부르면 그 기본값이 쓰이기 전에 parse가 먼저 던졌다.
const querySchema = z.object({
  name: z.enum(['dashboard', 'app', 'server']).default('dashboard'),
  lang: z.enum(['ko', 'ja']).default('ko'),
  format: z.enum(['json', 'po']).default('json'),
})

type QuerySchema = z.infer<typeof querySchema>

type Data = Record<string, string>
type Lang = QuerySchema['lang']

function getHeader(lang: Lang) {
  return `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: ${lang}\\n"`
}

function getBody(data: Data) {
  return Object.entries(data)
    .map(([key, value]) => {
      return `msgid "${key}"\nmsgstr "${value}"\n`
    })
    .join('\n')
}

export function convertToPo({ data, lang }: { data: Data; lang: Lang }) {
  return [getHeader(lang), getBody(data)].join('\n\n')
}

export const i18n = new Hono()

i18n.get('/', async (c) => {
  const query = querySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'invalid query', issues: query.error.issues }, 400)
  }

  const { name, lang, format } = query.data
  const env = i18nEnv()
  const url = new URL(`https://script.google.com/macros/s/${env.SHEET_ID}/exec`)
  url.searchParams.append('name', name)
  url.searchParams.append('lang', lang)

  const data = (await fetch(url.toString()).then((r) => r.json())) as Data

  if (format === 'po') {
    const po = convertToPo({ data, lang })

    return c.text(po)
  }

  return c.json(data)
})
