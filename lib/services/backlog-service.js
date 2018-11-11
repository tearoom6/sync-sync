'use babel'

import { URL } from 'url'
import URLSearchParams from 'url-search-params'
import ServiceBase from './service-base'

export default class BacklogService extends ServiceBase {
  constructor(spaceKey, domain, apiKey) {
    super()
    this.baseUrl = `https://${spaceKey}.${domain}`
    this.apiKey = apiKey
  }

  async listProjects() {
    const response = await this.callApi('/api/v2/projects')
    if (!response.ok) {
      if (response.headers.get('Content-Type') !== 'application/json') {
        const responseBody = await response.text()
        throw new Error(`Failed to list projects. message=${responseBody}`)
      }
      const responseBody = await response.json()
      const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
      throw new Error(`Failed to list projects. statusCode=${response.status} errors=${errors}`)
    }
    const projects = await response.json()
    console.log(projects)
    return projects
  }

  async listItems(projectIdOrKey) {
    const response = await this.callApi(`/api/v2/wikis?projectIdOrKey=${projectIdOrKey}`)
    if (!response.ok) {
      if (response.headers.get('Content-Type') !== 'application/json') {
        const responseBody = await response.text()
        throw new Error(`Failed to list items. message=${responseBody}`)
      }
      const responseBody = await response.json()
      const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
      throw new Error(`Failed to list items. statusCode=${response.status} errors=${errors}`)
    }
    const items = await response.json()
    console.log(items)
    return items
  }

  async getItem(wikiId) {
    const response = await this.callApi(`/api/v2/wikis/${wikiId}`)
    if (!response.ok) {
      if (response.headers.get('Content-Type') !== 'application/json') {
        const responseBody = await response.text()
        throw new Error(`Failed to get item. message=${responseBody}`)
      }
      const responseBody = await response.json()
      const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
      throw new Error(`Failed to get item. statusCode=${response.status} errors=${errors}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(projectId, name, content, mailNotify = false) {
    const response = await this.callApi('/api/v2/wikis', 'POST', {
      projectId,
      name,
      content,
      mailNotify,
    })
    if (!response.ok) {
      if (response.headers.get('Content-Type') !== 'application/json') {
        const responseBody = await response.text()
        throw new Error(`Failed to post item. message=${responseBody}`)
      }
      const responseBody = await response.json()
      const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
      throw new Error(`Failed to post item. statusCode=${response.status} errors=${errors}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(wikiId, name, content, mailNotify = false) {
    const response = await this.callApi(`/api/v2/wikis/${wikiId}`, 'PATCH', {
      name,
      content,
      mailNotify,
    })
    if (!response.ok) {
      if (response.headers.get('Content-Type') !== 'application/json') {
        const responseBody = await response.text()
        throw new Error(`Failed to update item. message=${responseBody}`)
      }
      const responseBody = await response.json()
      const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
      throw new Error(`Failed to update item. statusCode=${response.status} errors=${errors}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    let postParams = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      postParams = new URLSearchParams()
      Object.entries(body).forEach(([key, value]) => {
        postParams.set(key, value)
      })
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    // Add apiKey param.
    const url = new URL(`${this.baseUrl}${path}`)
    const newSearchParams = new URLSearchParams(url.search)
    newSearchParams.append('apiKey', this.apiKey)
    url.search = newSearchParams
    return this.constructor.accessHttp(url.toString(), method, postParams, headers, restOptions)
  }
}
