/** @jsxImportSource hono/jsx */
import { Track } from '@spotify/web-api-ts-sdk'
import { css, Style } from 'hono/css'
import * as styles from './html.styles'

export function getHtml(track: Track) {
  return (
    <html>
      <head>
        <Style>
          {css`
            *,
            *::before,
            *::after {
              padding: 0;
              margin: 0;
              box-sizing: border-box;
            }

            body {
              font-family: Roboto, sans-serif;
            }
          `}
        </Style>
      </head>
      <body>
        <div class={styles.card}>
          <a
            href={track.album.external_urls.spotify}
            target="_blank"
            class={styles.link}
          >
            <img
              src={track.album.images.at(0)?.url}
              alt=""
              width={42}
              height={42}
              class={styles.cover}
            />
          </a>
          <div class={styles.body}>
            <div class={styles.name}>
              <a
                href={track.external_urls.spotify}
                target="_blank"
                class={styles.link}
              >
                {track.name}
              </a>
            </div>
            <div class={styles.artists}>
              {track.artists.map((artist, index) => (
                <a
                  href={artist.external_urls.spotify}
                  target="_blank"
                  class={styles.link}
                >
                  {artist.name}
                  {index === track.artists.length - 1 ? null : ','}
                </a>
              ))}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
