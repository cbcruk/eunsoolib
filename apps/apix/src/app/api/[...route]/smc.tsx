/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { render } from 'state-machine-cat'

export const smc = new Hono()

/** `?input=`을 주지 않았을 때 그리는 예시 상태 머신. */
const DEFAULT_INPUT = `initial,
collection {
  # categoryId, companyIds
  collection_form:
    do/ input(),
  collection_preview:
    entry/ render();

  collection_form -> collection_preview: fetch;
},
confirm {
  confirm_modal:
    entry/ showModal()
    exit/ hideModal(),
  # subject, hasBanner
  confirm_form:
    do/ input();
},
mailchimp {
  server:
    entry/ fetch()
    exit/ abort(),
  success,
  fail;

  server -> success;
  server -> fail;
},
final;

initial => collection;
collection => confirm;
confirm => mailchimp;
mailchimp => final;`

/** URL 길이 제한과 렌더 비용을 감안한 입력 상한. */
const MAX_INPUT_LENGTH = 8000

smc.get('/svg', (c) => {
  const input = c.req.query('input') ?? DEFAULT_INPUT

  if (input.length > MAX_INPUT_LENGTH) {
    return c.json(
      { error: `input must be at most ${MAX_INPUT_LENGTH} characters` },
      413,
    )
  }

  try {
    const result = render(input, { outputType: 'svg' })

    c.header('Content-Type', 'image/svg+xml')
    c.header('Cache-Control', 's-maxage=1')

    return c.body(result)
  } catch (error) {
    // 잘못된 상태 머신 문법은 사용자 입력 오류다. 500이 아니라 400으로 돌려준다.
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      400,
    )
  }
})

smc.get('/', (c) => {
  const url = new URL(c.req.url)
  const input = c.req.query('input')
  const src = new URL('/api/smc/svg', url.origin)

  if (input) {
    src.searchParams.set('input', input)
  }

  return c.html(
    <i>
      <img src={src.toString()} alt="" />
    </i>,
  )
})
