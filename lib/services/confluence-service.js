'use babel'

import ServiceBase from './service-base'

export default class ConfluenceService extends ServiceBase {
  constructor(baseUrl, userName, apiToken) {
    super()
    this.baseUrl = baseUrl
    this.userName = userName
    this.apiToken = apiToken
  }

  async listAllItems(space, type = 'page', callback) {
    const listPartialItems = (page = 1, perPage = 25) =>
      this.listItems(space, type, page, perPage).then(items =>
        callback(items).then(() => {
          if (items.length === perPage) {
            return listPartialItems(page + 1, perPage)
          }
          return Promise.resolve()
        }))
    return listPartialItems()
  }

  async listItems(space, type = 'page', page = 1, perPage = 25, expand = 'body.storage,body.view,ancestors,version', depth = 'all') {
    return this.callApi(
      `/rest/api/space/${space}/content/${type}?start=${(page - 1) * perPage}&limit=${perPage}&expand=${expand}&depth=${depth}`
    ).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to list items. statusCode=${response.status} error=${error.message}`)
        })
      }
      return response.json().then(responseBody => {
        console.log(responseBody)
        return responseBody.results
      })
    })
  }

  async getItem(itemId, expand = 'body.storage,body.view,ancestors,version') {
    return this.callApi(`/rest/api/content/${itemId}?expand=${expand}`).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to get item. statusCode=${response.status} error=${error.message}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async postItem(
    space,
    title,
    body,
    type = 'page',
    parentItemId = null,
    format = 'storage',
    status = 'current',
    expand = 'body.storage,body.view,ancestors,version'
  ) {
    const params = {
      space: { key: space },
      title,
      body: ConfluenceService.composeBody(body, format),
      type,
      status,
    }
    if (parentItemId && parentItemId !== '') params.ancestors = [{ id: parentItemId }]

    return this.callApi(`/rest/api/content?expand=${expand}`, 'POST', params).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to post item. statusCode=${response.status} error=${error.message}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item
      })
    })
  }

  async updateItem(
    itemId,
    title,
    body,
    type,
    version,
    parentItemId = null,
    format = 'storage',
    status = 'current',
    conflictPolicy = 'abort',
    expand = 'body.storage,body.view,ancestors,version'
  ) {
    const params = {
      title,
      body: ConfluenceService.composeBody(body, format),
      type,
      version: { number: version },
      status,
    }
    if (parentItemId && parentItemId !== '') params.ancestors = [{ id: parentItemId }]

    return this.callApi(`/rest/api/content/${itemId}?conflictPolicy=${conflictPolicy}&expand=${expand}`, 'PUT', params).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(`Failed to update item. statusCode=${response.status} error=${error.message}`)
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
    // Equivalent to browser js [btoa](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa).
    // See below:
    // - [Node.js - "btoa is not defined" error - Stack Overflow](https://stackoverflow.com/questions/23097928/)
    // - [node-browser-compat/btoa: A port of the browser's `btoa` function](https://github.com/node-browser-compat/btoa)
    // - [javascript - How to use Basic Auth with jQuery and AJAX? - Stack Overflow](https://stackoverflow.com/questions/5507234/)
    const basicAuthToken = Buffer.from(`${this.userName}:${this.apiToken}`, 'binary').toString('base64')
    headers.authorization = `Basic ${basicAuthToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return ConfluenceService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }

  static composeBody(body, format) {
    const bodyParam = {}
    bodyParam[format] = { representation: format, value: body }
    return bodyParam
  }
}
