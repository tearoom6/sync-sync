'use babel'

import ServiceBase from './service-base'

export default class WordpressOrgService extends ServiceBase {
  constructor(baseUrl, accessToken) {
    super()
    this.baseUrl = `${baseUrl}/wp-json/wp/v2`
    this.accessToken = accessToken
  }

  async listAllTags(context = 'edit') {
    const listPartialTags = async (alreadyFoundTags = [], page = 1, perPage = 100) => {
      const tags = await this.listTags(context, page, perPage)
      const allTags = alreadyFoundTags.concat(tags)
      if (tags.length === perPage) {
        return listPartialTags(allTags, page + 1, perPage)
      }
      return Promise.resolve(allTags)
    }
    return listPartialTags()
  }

  async listTags(context = 'edit', page = 1, perPage = 100) {
    const response = await this.callApi(`/tags?context=${context}&page=${page}&per_page=${perPage}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list tags. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const tags = await response.json()
    console.log(tags)
    return tags
  }

  async createTag(name) {
    const response = await this.callApi('/tags', 'POST', {
      name,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create tag. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const tag = await response.json()
    console.log(tag)
    return tag
  }

  async listAllCategories(context = 'edit') {
    const listPartialCategories = async (alreadyFoundCategories = [], page = 1, perPage = 100) => {
      const categories = await this.listCategories(context, page, perPage)
      const allCategories = alreadyFoundCategories.concat(categories)
      if (categories.length === perPage) {
        return listPartialCategories(allCategories, page + 1, perPage)
      }
      return Promise.resolve(allCategories)
    }
    return listPartialCategories()
  }

  async listCategories(context = 'edit', page = 1, perPage = 100) {
    const response = await this.callApi(`/categories?context=${context}&page=${page}&per_page=${perPage}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list categories. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const categories = await response.json()
    console.log(categories)
    return categories
  }

  async createCategory(name) {
    const response = await this.callApi('/categories', 'POST', {
      name,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create category. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const category = await response.json()
    console.log(category)
    return category
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
    const response = await this.callApi(`/posts?context=${context}&page=${page}&per_page=${perPage}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to list items. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const posts = await response.json()
    console.log(posts)
    return posts
  }

  async getItem(itemId, context = 'edit') {
    const response = await this.callApi(`/posts/${itemId}?context=${context}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get item. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async postItem(title, content, tags, categories, format = 'standard', status = 'publish') {
    const response = await this.callApi('/posts?context=edit', 'POST', {
      title,
      content,
      tags,
      categories,
      format,
      status,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to post item. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async updateItem(itemId, title, content, tags, categories, format = 'standard', status = 'publish') {
    const response = await this.callApi(`/posts/${itemId}?context=edit`, 'POST', {
      title,
      content,
      tags,
      categories,
      format,
      status,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update item. statusCode=${response.status} error=${error.code}(${error.message})`)
    }
    const item = await response.json()
    console.log(item)
    return item
  }

  async callApi(path, method = 'GET', body = null, additionalHeaders = {}, restOptions = {}) {
    const headers = additionalHeaders
    headers.authorization = `Basic ${this.accessToken}`
    let submitBody = body
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      submitBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return this.constructor.accessHttp(`${this.baseUrl}${path}`, method, submitBody, headers, restOptions)
  }
}
