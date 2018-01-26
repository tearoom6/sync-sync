'use babel'

import ServiceBase from './service-base'

export default class DocBaseService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://api.docbase.io'
    this.accessToken = accessToken
  }

  async listAllItems(domain) {
    const listPartialItems = (alreadyFoundItems = [], page = 1, perPage = 100) =>
      this.listItems(domain, page, perPage)
        .then((items) => {
          const allItems = alreadyFoundItems.concat(items)
          if (items.length === perPage) {
            return listPartialItems(allItems, page + 1, perPage)
          }
          return Promise.resolve(allItems)
        })
    return listPartialItems()
  }

  async listItems(domain, page = 1, perPage = 100) {
    return this.callApi(`/teams/${domain}/posts?page=${page}&per_page=${perPage}&q=*`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to list items. statusCode=${response.status}`)
        }
        return response.json().then((responseBody) => {
          console.log(responseBody)
          return responseBody.posts
        })
      })
  }

  async getItem(domain, postId) {
    return this.callApi(`/teams/${domain}/posts/${postId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to get item. statusCode=${response.status}`)
        }
        return response.json().then((item) => {
          console.log(item)
          return item
        })
      })
  }

  async postItem(
    domain, title, body, tags = [], groups = [], scope = 'everyone',
    draft = false, notice = true,
  ) {
    return this.callApi(`/teams/${domain}/posts`, 'POST', {
      title, body, tags, groups, scope, draft, notice,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to post item. statusCode=${response.status}`)
      }
      return response.json().then((item) => {
        console.log(item)
        return item
      })
    })
  }

  async updateItem(
    domain, postId, title, body, tags = [], groups = [], scope = 'everyone',
    draft = false, notice = true,
  ) {
    return this.callApi(`/teams/${domain}/posts/${postId}`, 'PATCH', {
      title, body, tags, groups, scope, draft, notice,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to update item. statusCode=${response.status}`)
      }
      return response.json().then((item) => {
        console.log(item)
        return item
      })
    })
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers['X-DocBaseToken'] = this.accessToken
    headers['X-Api-Version'] = '1' // Specify API version.
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return DocBaseService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
