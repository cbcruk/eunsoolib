/** @jsxImportSource hono/jsx */
import { format } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { Hono } from 'hono'

export const now = new Hono()

now.get('/', (c) => {
  const date = new Date()
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
