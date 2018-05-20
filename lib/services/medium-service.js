'use babel'

import ServiceBase from './service-base'

export default class MediumService extends ServiceBase {
  constructor(accessToken) {
    super()
    this.baseUrl = 'https://api.medium.com/v1'
    this.accessToken = accessToken
  }

  async getMyUser() {
    return this.callApi('/me').then(response => {
      if (!response.ok) {
        return response.json().then(errorResponse => {
          const errorInfo = errorResponse.errors.map(error => `${error.message}(${error.code})`).join(',')
          throw new Error(`Failed to get my user. statusCode=${response.status} error=${errorInfo}`)
        })
      }
      return response.json().then(user => {
        console.log(user)
        return user.data
      })
    })
  }

  // TODO: - getList/getItem API is not provided in Medium.

  async postItem(title, body, tags, format = 'markdown', status = 'public') {
    const user = await this.getMyUser()
    return this.callApi(`/users/${user.id}/posts`, 'POST', {
      title,
      contentFormat: format,
      content: body,
      tags,
      publishStatus: status,
    }).then(response => {
      if (!response.ok) {
        return response.json().then(errorResponse => {
          const errorInfo = errorResponse.errors.map(error => `${error.message}(${error.code})`).join(',')
          throw new Error(`Failed to post item. statusCode=${response.status} error=${errorInfo}`)
        })
      }
      return response.json().then(item => {
        console.log(item)
        return item.data
      })
    })
  }

  // TODO: - updateItem API is not provided in Medium.

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Bearer ${this.accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return MediumService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
