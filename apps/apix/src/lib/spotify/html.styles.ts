import { css } from 'hono/css'

export const link = css`
  color: inherit;
  text-decoration: none;
`

export const card = css`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #1c1b1a;
  padding: 8px;
  border-radius: 8px;
  overflow: hidden;
`

export const cover = css`
  border-radius: 6px;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    transition: all 0.3s ease-out;
  }
`

export const body = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const name = css`
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  max-width: 180px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e5e5e5;

  &:hover {
    color: #fff;
    transition: all 0.3s ease-out;
  }
`

export const artists = css`
  display: flex;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #bdbdbd;
  overflow: hidden;
  max-width: 180px;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${link} {
    &:hover {
      color: #e5e5e5;
      transition: all 0.3s ease-out;
    }
  }
`
