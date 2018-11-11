'use babel'

import ServiceBase from './service-base'

export default class WordpressComService extends ServiceBase {
  constructor(site, accessToken) {
    super()
    this.baseUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${site}`
    this.accessToken = accessToken
  }

  async listAllItems(context = 'edit') {
    const listPartialItems = async (alreadyFoundItems = [], page = 1, perPage = 100) => {
      const items = await this.listItems(context, page, perPage)
      const allItems = alreadyFoundItems.concat(items || [])
      if (items.length === perPage) {
        return listPartialItems(allItems, page + 1, perPage)
      }
      return Promise.resolve(allItems)
    }
    return listPartialItems()
  }

  async listItems(context = 'edit', page = 1, perPage = 100) {
    const response = await this.callApi(`/posts?context=${context}&page=${page}&number=${perPage}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.error}(${error.message})`)
    }
    const responseBody = await response.json()
    console.log(responseBody)
    return responseBody.posts
  }

  async getItem(itemId, context = 'edit') {
    const response = await this.callApi(`/posts/${itemId}?context=${context}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.error}(${error.message})`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(
    title,
    content,
    tags,
    categories,
    format = 'default',
    status = 'publish',
    publicize = true,
    likes_enabled = true,
    sharing_enabled = true
  ) {
    const response = await this.callApi('/posts/new?context=edit', 'POST', {
      title,
      content,
      tags,
      categories,
      format,
      status,
      publicize,
      likes_enabled,
      sharing_enabled,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.error}(${error.message})`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(
    itemId,
    title,
    content,
    tags,
    categories,
    format = 'default',
    status = 'publish',
    publicize = true,
    likes_enabled = true,
    sharing_enabled = true
  ) {
    const response = await this.callApi(`/posts/${itemId}?context=edit`, 'POST', {
      title,
      content,
      tags,
      categories,
      format,
      status,
      publicize,
      likes_enabled,
      sharing_enabled,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.error}(${error.message})`)
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
}
