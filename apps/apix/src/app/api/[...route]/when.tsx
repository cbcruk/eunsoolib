/** @jsxImportSource hono/jsx */
import { format } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { Hono } from 'hono'

export const when = new Hono()

when.get('/', (c) => {
  const url = new URL(c.req.url)
  const date = url.searchParams.get('date')

  if (!date) {
    return c.html(<pre>😰</pre>)
  }

  const tzDate = new TZDate(date, 'Asia/Seoul')
  const formattedDate = format(date, 'yyyy-MM-dd:HH:mm:ss')
  const formattedTzDate = format(tzDate, 'yyyy-MM-dd:HH:mm:ss')

  return c.html(
    <pre>
      {JSON.stringify(
        {
          date,
          tzDate,
          formattedDate,
          formattedTzDate,
        },
        null,
        2,
      )}
    </pre>,
  )
})
