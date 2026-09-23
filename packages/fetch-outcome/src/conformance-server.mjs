import http2 from 'node:http2'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const K = http2.constants

/**
 * Conformance fixtures. Each route reproduces one wire-level condition that the
 * proposed taxonomy claims to distinguish.
 */
export const ROUTES = {
  '/reset/refused': {
    close: K.NGHTTP2_REFUSED_STREAM,
    expect: 'ERR_HTTP_REQUEST_REJECTED',
  },
  '/reset/cancel': {
    close: K.NGHTTP2_CANCEL,
    expect: 'ERR_HTTP_REQUEST_CANCELLED',
  },
  '/reset/internal': {
    close: K.NGHTTP2_INTERNAL_ERROR,
    expect: 'ERR_HTTP_INTERNAL_ERROR',
  },
  '/reset/protocol': {
    close: K.NGHTTP2_PROTOCOL_ERROR,
    expect: 'ERR_HTTP_PROTOCOL_ERROR',
  },
  '/reset/enhance': {
    close: K.NGHTTP2_ENHANCE_YOUR_CALM,
    expect: 'ERR_HTTP_STREAM_RESET',
  },
  '/mid/cancel': {
    mid: K.NGHTTP2_CANCEL,
    expect: 'ERR_HTTP_REQUEST_CANCELLED',
  },
  '/mid/internal': {
    mid: K.NGHTTP2_INTERNAL_ERROR,
    expect: 'ERR_HTTP_INTERNAL_ERROR',
  },
  '/mid/cancel-with-length': {
    mid: K.NGHTTP2_CANCEL,
    len: 100,
    expect: 'ERR_HTTP_REQUEST_CANCELLED',
  },
  '/ok': { expect: null },
}

export function createServer() {
  const server = http2.createSecureServer({
    key: fs.readFileSync(path.join(dir, 'key.pem')),
    cert: fs.readFileSync(path.join(dir, 'cert.pem')),
  })
  server.on('session', (s) => s.on('error', () => {}))
  server.on('stream', (stream, headers) => {
    stream.on('error', () => {})
    const route = ROUTES[headers[':path']]
    if (!route) {
      stream.respond({ ':status': 404 })
      return stream.end()
    }
    if (route.close !== undefined) return stream.close(route.close)
    if (route.mid !== undefined) {
      const h = { ':status': 200, 'content-type': 'text/plain' }
      if (route.len) h['content-length'] = String(route.len)
      stream.respond(h)
      stream.write('partial')
      setTimeout(() => stream.close(route.mid), 100)
      return
    }
    stream.respond({ ':status': 200 })
    stream.end('ok')
  })
  return server
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(8443, () => console.log('conformance server on 8443'))
}
