'use babel'

import fetch from 'node-fetch'

export default class ServiceBase {
  static async accessHttp(url, method = 'GET', body = null, headers = {}, restOptions = {}) {
    console.log(`accessHttp called. url=${url} method=${method} body=${body} headers=${JSON.stringify(headers)} restOptions=${JSON.stringify(restOptions)}`)
    const headersOption = new fetch.Headers(headers)
    const options = restOptions
    options.method = method
    options.headers = headersOption
    if (body) options.body = body

    return fetch(url, options)
  }
}
