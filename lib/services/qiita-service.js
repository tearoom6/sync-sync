'use babel'

import ServiceBase from './service-base'

export default class QiitaService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://qiita.com'
    this.accessToken = accessToken
  }

  async listAllItems(userName, callback) {
    const listPartialItems = async (page = 1, perPage = 100) => {
      const items = await this.listItems(userName, page, perPage)
      await callback(items)
      if (items.length === perPage) {
        return listPartialItems(page + 1, perPage)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(userName, page = 1, perPage = 100) {
    const response = await this.callApi(`/api/v2/items?page=${page}&per_page=${perPage}&query=user%3A${userName}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const items = await response.json()
    console.log(items)
    return items
  }

  async getItem(itemId) {
    const response = await this.callApi(`/api/v2/items/${itemId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(title, body, tags, isPrivate = false, gist = false, tweet = false) {
    const tagsObj = tags.map(tag => this.constructor.composeTag(tag))
    const response = await this.callApi('/api/v2/items', 'POST', {
      title,
      body,
      tags: tagsObj,
      private: isPrivate,
      gist,
      tweet,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(itemId, title, body, tags, isPrivate = false) {
    const tagsObj = tags.map(tag => this.constructor.composeTag(tag))
    const response = await this.callApi(`/api/v2/items/${itemId}`, 'PATCH', {
      title,
      body,
      tags: tagsObj,
      private: isPrivate,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Bearer ${this.accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return this.constructor.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }

  static composeTag(name) {
    return {
      name,
      versions: [],
    }
  }
}
