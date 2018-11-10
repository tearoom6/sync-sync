'use babel'

import { Parser, Builder } from 'xml2js'
import ServiceBase from './service-base'
import { wrappedArray } from '../utils/common-util'

export default class HatenaService extends ServiceBase {
  constructor(hatenaId, blogId, apiKey) {
    super()
    this.baseUrl = `https://blog.hatena.ne.jp/${hatenaId}/${blogId}/atom`
    this.hatenaId = hatenaId
    this.apiKey = apiKey
  }

  async listAllItems(callback) {
    const listPartialItems = async (page = '') => {
      const result = await this.listItems(page)
      await callback(result.items)
      if (result.nextPage) {
        return listPartialItems(result.nextPage)
      }
      return Promise.resolve()
    }
    return listPartialItems()
  }

  async listItems(page = '') {
    const response = await this.callApi(`/entry?page=${page}`)
    if (!response.ok) {
      throw new Error(`Failed to list items. statusCode=${response.status}`)
    }
    const responseText = await response.text()
    return HatenaService.parseXmlResponse(responseText)
  }

  async getItem(itemId) {
    const response = await this.callApi(`/entry/${itemId}`)
    if (!response.ok) {
      throw new Error(`Failed to get item. statusCode=${response.status}`)
    }
    const responseText = await response.text()
    return HatenaService.parseXmlResponse(responseText)
  }

  async postItem(
    title,
    content,
    categories = [],
    isDraft = false,
  ) {
    const response = await this.callApi('/entry', 'POST', HatenaService.composePostBody(
      title, content, categories, isDraft,
    ))
    if (!response.ok) {
      throw new Error(`Failed to post item. statusCode=${response.status}`)
    }
    const responseText = await response.text()
    return HatenaService.parseXmlResponse(responseText)
  }

  async updateItem(
    itemId,
    title,
    content,
    categories = [],
    isDraft = false,
  ) {
    const response = await this.callApi(`/entry/${itemId}`, 'PUT', HatenaService.composePostBody(
      title, content, categories, isDraft,
    ))
    if (!response.ok) {
      throw new Error(`Failed to update item. statusCode=${response.status}`)
    }
    const responseText = await response.text()
    return HatenaService.parseXmlResponse(responseText)
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    // See [How to do Base64 encoding in node.js? - Stack Overflow](https://stackoverflow.com/questions/6182315/).
    const accessToken = Buffer.from(`${this.hatenaId}:${this.apiKey}`).toString('base64')
    headers.authorization = `Basic ${accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = new Builder().buildObject(body)
      headers['Content-Type'] = 'application/xml'
    }
    return HatenaService.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }

  static async parseXmlResponse(xmlText) {
    return new Promise((resolve, reject) => {
      new Parser({
        trim: false,
        explicitArray: false,
      }).parseString(xmlText, (error, responseBody) => {
        if (error) {
          reject(new Error(`Failed to parse XML. error=${error}`))
        }
        console.log(responseBody)

        if (responseBody.feed) {
          const nextLink = wrappedArray(responseBody.feed.link).find(link => link.$.rel === 'next')
          resolve({
            items: wrappedArray(responseBody.feed.entry).map(item => HatenaService.convertItemFormat(item)),
            nextPage: nextLink ? nextLink.$.href.match(/\?page=(\d+)$/)[1] : null,
          })
        } else {
          resolve(HatenaService.convertItemFormat(responseBody.entry))
        }
      })
    })
  }

  static convertItemFormat(item) {
    const itemLink = wrappedArray(item.link).find(link => link.$.rel === 'alternate')
    return {
      id: item.id.match(/-(\d+)$/)[1],
      title: item.title,
      author: item.author.name,
      categories: wrappedArray(item.category).map(category => category.$.term),
      content: item.content._,
      contentType: item.content.$.type,
      publishedAt: item.published,
      updatedAt: item.updated,
      url: itemLink ? itemLink.$.href : null,
      isDraft: item['app:control']['app:draft'],
    }
  }

  static composePostBody(title, content, categories = [], isDraft = false) {
    const body = {
      entry: {
        $: {
          xmlns: 'http://www.w3.org/2005/Atom',
          'xmlns:app': 'http://www.w3.org/2007/app',
        },
        title,
        content: {
          $: {
            type: 'text/plain'
          },
          _: content,
        },
        'app:control': {
          'app:draft': isDraft ? 'yes' : 'no',
        },
      }
    }
    categories.forEach((category, index) => {
      if (!body.entry.category) body.entry.category = []
      body.entry.category[index] = {
        $: { term: category }
      }
    })
    return body
  }
}
