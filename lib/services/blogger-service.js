'use babel'

import ServiceBase from './service-base'

export default class BloggerService extends ServiceBase {
  constructor(blogId, apiKey) {
    super()
    this.baseUrl = 'https://www.googleapis.com/blogger/v3'
    this.blogId = blogId
    this.apiKey = apiKey
  }

  async listAllItems(callback) {
    const listPartialItems = async (page = null) => {
      const response = await this.listItems(page)
      await callback(response.items || [])
      if (response.nextPageToken) {
        return listPartialItems(response.nextPageToken)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(page = null) {
    const response = await this.callApi(`/blogs/${this.blogId}/posts?fetchBodies=true${page ? `&pageToken=${page}` : ''}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.error.message}`)
    }
    const responseBody = await response.json()
    console.log(responseBody)
    return responseBody
  }

  async getItem(itemId) {
    const response = await this.callApi(`/blogs/${this.blogId}/posts/${itemId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  // TODO: - postItem API needs to be authorized by OAuth 2.0.
  async postItem(title, body, labels) {
    const response = await this.callApi(`/blogs/${this.blogId}/posts/`, 'POST', {
      kind: 'blogger#post',
      title,
      content: body,
      labels,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  // TODO: - postItem API needs to be authorized by OAuth 2.0.
  async updateItem(itemId, title, body, labels) {
    const response = await this.callApi(`/blogs/${this.blogId}/posts/${itemId}`, 'PATCH', {
      title,
      content: body,
      labels,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return this.constructor.accessHttp(
      `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}key=${this.apiKey}`,
      method, submitBody, headers, restOptions
    )
  }
}
