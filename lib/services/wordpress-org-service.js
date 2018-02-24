'use babel'

import ServiceBase from './service-base'

export default class WordpressOrgService extends ServiceBase {
  constructor(baseUrl, accessToken) {
    super()
    this.baseUrl = `${baseUrl}/wp-json/wp/v2`
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
    return this.callApi(`/posts?context=${context}&page=${page}&per_page=${perPage}`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(`Failed to list items. statusCode=${response.status} error=${error.code}(${error.message})`)
          })
        }
        return response.json().then((posts) => {
          console.log(posts)
          return posts
        })
      })
  }

  async getItem(itemId, context = 'edit') {
    return this.callApi(`/posts/${itemId}?context=${context}`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(`Failed to get item. statusCode=${response.status} error=${error.code}(${error.message})`)
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
    format = 'standard', status = 'publish',
  ) {
    return this.callApi('/posts?context=edit', 'POST', {
      title, content, tags, categories, format, status,
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(`Failed to post item. statusCode=${response.status} error=${error.code}(${error.message})`)
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
    format = 'standard', status = 'publish',
  ) {
    return this.callApi(`/posts/${itemId}?context=edit`, 'POST', {
      title, content, tags, categories, format, status,
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(`Failed to update item. statusCode=${response.status} error=${error.code}(${error.message})`)
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
    headers.authorization = `Basic ${this.accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return WordpressOrgService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
