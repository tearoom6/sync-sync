'use babel'

import stringify from 'json-stable-stringify'

export default class Config {
  static load(configFile) {
    return configFile.read().then((configBody) => {
      const config = new Config(configFile, configBody)
      return config
    })
  }

  constructor(configFile, configJsonText = '{}') {
    this.configFile = configFile
    this.config = JSON.parse(configJsonText)
  }

  props(serviceName) {
    return this.config[serviceName] || {}
  }

  prop(serviceName, propName) {
    return this.props(serviceName)[propName]
  }

  setProps(serviceName, props) {
    this.config[serviceName] = props
  }

  setProp(serviceName, propName, value) {
    const props = this.props(serviceName)
    props[propName] = value
    this.setProps(serviceName, props)
  }

  deleteProp(serviceName, propName) {
    if (this.config[serviceName]) {
      delete this.config[serviceName][propName]
    }
  }

  findItemByPath(serviceName, itemPath) {
    const relativeItemPath = this.relativizeItemPath(itemPath)
    const items = this.prop(serviceName, 'items')
    if (items) {
      const itemId = Object.keys(items)
        .find(key => items[key].path === relativeItemPath)
      if (itemId) {
        return { itemId, item: items[itemId] }
      }
    }
    return {}
  }

  findItemsByDirectoryPath(serviceName, directoryPath) {
    const relativeDirPath = this.relativizeItemPath(directoryPath)
    const items = this.prop(serviceName, 'items')
    if (items) {
      const itemIds = Object.keys(items)
        .filter(key => items[key].path.startsWith(`${relativeDirPath}/`))
      return itemIds
    }
    return []
  }

  relativizeItemPath(itemPath) {
    return this.configFile.getParent().relativize(itemPath)
  }

  save() {
    // See [javascript - sort object properties and JSON.stringify - Stack Overflow](https://stackoverflow.com/questions/16167581/).
    return this.configFile.write(stringify(this.config, { space: 2 }))
  }
}
