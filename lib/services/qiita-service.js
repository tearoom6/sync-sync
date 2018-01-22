'use babel'

import ServiceBase from './service-base'

export default class QiitaService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://qiita.com'
    this.accessToken = accessToken
  }

  async listAllItems(userName) {
    const listPartialItems = (alreadyFoundItems = [], page = 1, perPage = 100) =>
      this.listItems(userName, page, perPage)
        .then((items) => {
          const allItems = alreadyFoundItems.concat(items)
          if (items.length === perPage) {
            return listPartialItems(allItems, page + 1, perPage)
          }
          return Promise.resolve(allItems)
        })
    return listPartialItems()
  }

  async listItems(userName, page = 1, perPage = 100) {
    return this.callApi(`/api/v2/items?page=${page}&per_page=${perPage}&query=user%3A${userName}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to list items. statusCode=${response.status}`)
        }
        return response.json().then((items) => {
          console.log(items)
          return items
        })
      })
  }

  async getItem(itemId) {
    return this.callApi(`/api/v2/items/${itemId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to list items. statusCode=${response.status}`)
        }
        return response.json().then((item) => {
          console.log(item)
          return item
        })
      })
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Bearer ${this.accessToken}`
    return QiitaService.accessHttp(`${this.baseUrl}${path}`, method, body, headers, restOptions)
  }
}
