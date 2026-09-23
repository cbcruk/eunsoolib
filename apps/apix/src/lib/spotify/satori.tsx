import { Track } from '@spotify/web-api-ts-sdk'
import satori from 'satori'

export async function toSvg(track: Track) {
  const width = 240
  const height = 60

  const cover = track.album.images[0].url
  const name = track.name
  const artists = track.artists.map((artist) => artist.name)

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#1c1b1a',
        padding: 8,
        borderRadius: 8,
        width,
        overflow: 'hidden',
      }}
    >
      <img
        src={cover}
        alt=""
        width={42}
        height={42}
        style={{
          borderRadius: 6,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontFamily: 'Roboto, sans-serif',
          color: '#E5E5E5',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            overflow: 'hidden',
            maxWidth: 180,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#BDBDBD',
            overflow: 'hidden',
            maxWidth: 180,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {artists.join(', ')}
        </div>
      </div>
    </div>,
    {
      width,
      height,
      fonts: [
        {
          name: 'Roboto',
          data: await fetch(
            'https://github.com/vercel/satori/raw/refs/heads/main/playground/public/inter-latin-ext-400-normal.woff',
          ).then((res) => res.arrayBuffer()),
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Roboto',
          data: await fetch(
            'https://github.com/vercel/satori/raw/refs/heads/main/playground/public/inter-latin-ext-700-normal.woff',
          ).then((res) => res.arrayBuffer()),
          weight: 700,
          style: 'normal',
        },
      ],
      embedFont: true,
    },
  )

  return svg
}
