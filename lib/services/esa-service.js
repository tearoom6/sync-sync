'use babel'

import ServiceBase from './service-base'

export default class EsaService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://api.esa.io'
    this.accessToken = accessToken
  }

  async listAllItems(teamName, callback) {
    const listPartialItems = async (page = 1, perPage = 100) => {
      const items = await this.listItems(teamName, page, perPage)
      await callback(items)
      if (items.length === perPage) {
        return listPartialItems(page + 1, perPage)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(teamName, page = 1, perPage = 100) {
    const response = await this.callApi(`/v1/teams/${teamName}/posts?page=${page}&per_page=${perPage}&sort=created&order=asc`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.error}:${error.message}`)
    }
    const responseBody = await response.json()
    console.log(responseBody)
    return responseBody.posts
  }

  async getItem(teamName, postId) {
    const response = await this.callApi(`/v1/teams/${teamName}/posts/${postId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.error}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(teamName, name, body, tags = [], category = null, wip = false, message = null) {
    const response = await this.callApi(`/v1/teams/${teamName}/posts`, 'POST', {
      post: {
        name,
        body_md: body,
        tags,
        category,
        wip,
        message,
      },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.error}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(teamName, postId, name, body, tags = [], category = null, wip = false, message = null) {
    const response = await this.callApi(`/v1/teams/${teamName}/posts/${postId}`, 'PATCH', {
      post: {
        name,
        body_md: body,
        tags,
        category,
        wip,
        message,
      },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.error}:${error.message}`)
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
