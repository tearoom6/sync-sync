'use babel'

import ServiceBase from './service-base'

export default class QiitaService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://qiita.com'
    this.accessToken = accessToken
  }

  async listAllItems(userName, callback) {
    const listPartialItems = (page = 1, perPage = 100) =>
      this.listItems(userName, page, perPage).then(items =>
        callback(items).then(() => {
          if (items.length === perPage) {
            return listPartialItems(page + 1, perPage)
          }
          return Promise.resolve()
        })
      )
    return listPartialItems()
  }

  async listItems(userName, page = 1, perPage = 100) {
    return this.callApi(`/api/v2/items?page=${page}&per_page=${perPage}&query=user%3A${userName}`).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to list items. statusCode=${response.status} error=${error.type}:${error.message}`)
        })
      }
      return response.json().then(items => {
        console.log(items)
        return items
      })
    })
  }

  async getItem(itemId) {
    return this.callApi(`/api/v2/items/${itemId}`).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to get item. statusCode=${response.status} error=${error.type}:${error.message}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async postItem(title, body, tags, isPrivate = false, gist = false, tweet = false) {
    const tagsObj = tags.map(tag => QiitaService.composeTag(tag))
    return this.callApi('/api/v2/items', 'POST', {
      title,
      body,
      tags: tagsObj,
      private: isPrivate,
      gist,
      tweet,
    }).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to post item. statusCode=${response.status} error=${error.type}:${error.message}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async updateItem(itemId, title, body, tags, isPrivate = false) {
    const tagsObj = tags.map(tag => QiitaService.composeTag(tag))
    return this.callApi(`/api/v2/items/${itemId}`, 'PATCH', {
      title,
      body,
      tags: tagsObj,
      private: isPrivate,
    }).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to update item. statusCode=${response.status} error=${error.type}:${error.message}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Bearer ${this.accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return QiitaService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }

  static composeTag(name) {
    return {
      name,
      versions: [],
    }
  }
}
