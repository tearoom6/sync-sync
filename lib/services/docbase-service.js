'use babel'

import ServiceBase from './service-base'

export default class DocBaseService extends ServiceBase {
  constructor(apiToken) {
    super()
    this.baseUrl = 'https://api.docbase.io'
    this.apiToken = apiToken
  }

  async listGroups(domain) {
    const response = await this.callApi(`/teams/${domain}/groups`)
    if (!response.ok) {
      throw new Error(`Failed to list groups. statusCode=${response.status}`)
    }
    const groups = await response.json()
    console.log(groups)
    return groups
  }

  async listAllItems(domain, callback) {
    const listPartialItems = async (page = 1, perPage = 100) => {
      const items = await this.listItems(domain, page, perPage)
      await callback(items)
      if (items.length === perPage) {
        return listPartialItems(page + 1, perPage)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(domain, page = 1, perPage = 100) {
    const response = await this.callApi(`/teams/${domain}/posts?page=${page}&per_page=${perPage}&q=*`)
    if (!response.ok) {
      throw new Error(`Failed to list items. statusCode=${response.status}`)
    }
    const responseBody = await response.json()
    console.log(responseBody)
    return responseBody.posts
  }

  async getItem(domain, postId) {
    const response = await this.callApi(`/teams/${domain}/posts/${postId}`)
    if (!response.ok) {
      throw new Error(`Failed to get item. statusCode=${response.status}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(domain, title, body, tags = [], groups = [], scope = 'everyone', draft = false, notice = true) {
    const response = await this.callApi(`/teams/${domain}/posts`, 'POST', {
      title,
      body,
      tags,
      groups,
      scope,
      draft,
      notice,
    })
    if (!response.ok) {
      throw new Error(`Failed to post item. statusCode=${response.status}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(domain, postId, title, body, tags = [], groups = [], scope = 'everyone', draft = false, notice = true) {
    const response = await this.callApi(`/teams/${domain}/posts/${postId}`, 'PATCH', {
      title,
      body,
      tags,
      groups,
      scope,
      draft,
      notice,
    })
    if (!response.ok) {
      throw new Error(`Failed to update item. statusCode=${response.status}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers['X-DocBaseToken'] = this.apiToken
    headers['X-Api-Version'] = '1' // Specify API version.
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return DocBaseService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
