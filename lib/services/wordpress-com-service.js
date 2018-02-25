'use babel'

import ServiceBase from './service-base'

export default class WordpressComService extends ServiceBase {
  constructor(site, accessToken) {
    super()
    this.baseUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${site}`
    this.accessToken = accessToken
  }

  async listAllItems(callback, context = 'edit') {
    const listPartialItems = (page = 1, perPage = 100) =>
      this.listItems(context, page, perPage)
        .then(items => callback(items).then(() => {
          if (items.length === perPage) {
            return listPartialItems(page + 1, perPage)
          }
          return Promise.resolve()
        }))
    return listPartialItems()
  }

  async listItems(context = 'edit', page = 1, perPage = 100) {
    return this.callApi(`/posts?context=${context}&page=${page}&number=${perPage}`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(`Failed to list items. statusCode=${response.status} error=${error.error}(${error.message})`)
          })
        }
        return response.json().then((responseBody) => {
          console.log(responseBody)
          return responseBody.posts
        })
      })
  }

  async getItem(itemId, context = 'edit') {
    return this.callApi(`/posts/${itemId}?context=${context}`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(`Failed to get item. statusCode=${response.status} error=${error.error}(${error.message})`)
          })
        }
        return response.json().then((item) => {
          console.log(item)
          return item
        })
      })
  }

  async postItem(
    title, content, tags, categories,
    format = 'default', status = 'publish', publicize = true, likes_enabled = true, sharing_enabled = true,
  ) {
    return this.callApi('/posts/new?context=edit', 'POST', {
      title, content, tags, categories, format, status, publicize, likes_enabled, sharing_enabled,
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(`Failed to post item. statusCode=${response.status} error=${error.error}(${error.message})`)
        })
      }
      return response.json().then((item) => {
        console.log(item)
        return item
      })
    })
  }

  async updateItem(
    itemId, title, content, tags, categories,
    format = 'default', status = 'publish', publicize = true, likes_enabled = true, sharing_enabled = true,
  ) {
    return this.callApi(`/posts/${itemId}?context=edit`, 'POST', {
      title, content, tags, categories, format, status, publicize, likes_enabled, sharing_enabled,
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(`Failed to update item. statusCode=${response.status} error=${error.error}(${error.message})`)
        })
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
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return WordpressComService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
