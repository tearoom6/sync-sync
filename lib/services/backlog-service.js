'use babel'

import { URL } from 'url'
import URLSearchParams from 'url-search-params'
import ServiceBase from './service-base'

export default class BacklogService extends ServiceBase {
  constructor(spaceKey, apiKey) {
    super()
    this.baseUrl = `https://${spaceKey}.backlog.jp`
    this.apiKey = apiKey
  }

  async listProjects() {
    return this.callApi('/api/v2/projects').then(response => {
      if (!response.ok) {
        if (response.headers.get('Content-Type') !== 'application/json') {
          return response.text().then(responseBody => {
            throw new Error(`Failed to list projects. message=${responseBody}`)
          })
        }
        return response.json().then(responseBody => {
          const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
          throw new Error(`Failed to list projects. statusCode=${response.status} errors=${errors}`)
        })
      }
      return response.json().then(projects => {
        console.log(projects)
        return projects
      })
    })
  }

  async listItems(projectIdOrKey) {
    return this.callApi(`/api/v2/wikis?projectIdOrKey=${projectIdOrKey}`).then(response => {
      if (!response.ok) {
        if (response.headers.get('Content-Type') !== 'application/json') {
          return response.text().then(responseBody => {
            throw new Error(`Failed to list items. message=${responseBody}`)
          })
        }
        return response.json().then(responseBody => {
          const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
          throw new Error(`Failed to list items. statusCode=${response.status} errors=${errors}`)
        })
      }
      return response.json().then(items => {
        console.log(items)
        return items
      })
    })
  }

  async getItem(wikiId) {
    return this.callApi(`/api/v2/wikis/${wikiId}`).then(response => {
      if (!response.ok) {
        if (response.headers.get('Content-Type') !== 'application/json') {
          return response.text().then(responseBody => {
            throw new Error(`Failed to get item. message=${responseBody}`)
          })
        }
        return response.json().then(responseBody => {
          const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
          throw new Error(`Failed to get item. statusCode=${response.status} errors=${errors}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async postItem(projectId, name, content, mailNotify = false) {
    return this.callApi('/api/v2/wikis', 'POST', {
      projectId,
      name,
      content,
      mailNotify,
    }).then(response => {
      if (!response.ok) {
        if (response.headers.get('Content-Type') !== 'application/json') {
          return response.text().then(responseBody => {
            throw new Error(`Failed to post item. message=${responseBody}`)
          })
        }
        return response.json().then(responseBody => {
          const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
          throw new Error(`Failed to post item. statusCode=${response.status} errors=${errors}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async updateItem(wikiId, name, content, mailNotify = false) {
    return this.callApi(`/api/v2/wikis/${wikiId}`, 'PATCH', {
      name,
      content,
      mailNotify,
    }).then(response => {
      if (!response.ok) {
        if (response.headers.get('Content-Type') !== 'application/json') {
          return response.text().then(responseBody => {
            throw new Error(`Failed to update item. message=${responseBody}`)
          })
        }
        return response.json().then(responseBody => {
          const errors = responseBody.errors.map(error => `${error.message}(${error.code}) ${error.moreInfo}`).join(',')
          throw new Error(`Failed to update item. statusCode=${response.status} errors=${errors}`)
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
    return BacklogService.accessHttp(url.toString(), method, postParams, headers, restOptions)
  }
}
