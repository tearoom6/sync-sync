'use babel'

import fetch from 'node-fetch'
import https from 'https'

export default class ServiceBase {
  static async accessHttp(url, method = 'GET', body = null, headers = {}, restOptions = {}) {
    console.log(`accessHttp called. url=${url} method=${method} body=${body}
      headers=${JSON.stringify(headers)} restOptions=${JSON.stringify(restOptions)}`)
    const headersOption = new fetch.Headers(headers)
    const options = restOptions
    options.method = method
    options.headers = headersOption
    if (body) options.body = body

    // Avoid CERT_HAS_EXPIRED error.
    // cf. https://github.com/node-fetch/node-fetch/issues/568
    if (url.startsWith('https')) {
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });
      options.agent = agent
    }

    return fetch(url, options)
  }
}
