'use babel'

import ServiceBase from './service_base'

export default class QiitaService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://qiita.com'
    this.accessToken = accessToken
  }

  listItems(userName, page = 1, perPage = 100) {
    this.callApi(`/api/v2/items?page=${page}&per_page=${perPage}&query=user%3A${userName}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to list items. statusCode=${response.status}`)
        }
        response.json().then((data) => {
          console.log(data)
        })
      }).catch((error) => {
        console.log(`Failed to list items. error=${error.message}`)
      })
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Bearer ${this.accessToken}`
    return QiitaService.accessHttp(`${this.baseUrl}${path}`, method, body, headers, restOptions)
  }
}
