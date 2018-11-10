'use babel'

import ServiceBase from './service-base'

export default class QiitaTeamService extends ServiceBase {
  constructor(teamId, accessToken) {
    super()
    this.baseUrl = `https://${teamId}.qiita.com`
    this.accessToken = accessToken
  }

  // MARK: - Non published API.
  async listGroups() {
    const response = await this.callApi('/api/v2/groups')
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list groups. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const groups = await response.json()
    console.log(groups)
    return groups
  }

  async listAllItems(userName, callback) {
    const listPartialItems = async (page = 1, perPage = 100) => {
      const items = await this.listItems(userName, page, perPage)
      await callback(items)
      if (items.length === perPage) {
        return listPartialItems(page + 1, perPage)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(userName, page = 1, perPage = 100) {
    const response = await this.callApi(`/api/v2/items?page=${page}&per_page=${perPage}&query=user%3A${userName}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const items = await response.json()
    console.log(items)
    return items
  }

  async getItem(itemId) {
    const response = await this.callApi(`/api/v2/items/${itemId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(title, body, tags, groupUrlName = null, coediting = false, gist = false, tweet = false) {
    const tagsObj = tags.map(tag => QiitaTeamService.composeTag(tag))
    const group = groupUrlName && groupUrlName.length !== 0 ? groupUrlName : null
    const response = await this.callApi('/api/v2/items', 'POST', {
      title,
      body,
      tags: tagsObj,
      group_url_name: group,
      coediting,
      gist,
      tweet,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.type}:${error.message}`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(itemId, title, body, tags, groupUrlName = null, coediting = false) {
    const tagsObj = tags.map(tag => QiitaTeamService.composeTag(tag))
    const group = groupUrlName && groupUrlName.length !== 0 ? groupUrlName : null
    const response = await this.callApi(`/api/v2/items/${itemId}`, 'PATCH', {
      title,
      body,
      tags: tagsObj,
      group_url_name: group,
      coediting,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.type}:${error.message}`)
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
    return QiitaTeamService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }

  static composeTag(name) {
    return {
      name,
      versions: [],
    }
  }
}
