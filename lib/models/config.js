'use babel'

import stringify from 'json-stable-stringify'

export const MatchType = Object.freeze({
  all: 1,
  strict: 2,
  onlyImport: 3,
  onlyExport: 4,
  exceptImport: 5,
  exceptExport: 6,
})

export default class Config {
  static load(configFile) {
    if (configFile.existsSync()) {
      return configFile.read().then((configBody) => {
        const config = new Config(configFile, configBody)
        return config
      })
    }
    // When file not exists.
    const config = new Config(configFile)
    return Promise.resolve(config)
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

  options(category = null) {
    const options = this.config.options || {}
    if (category) return options[category] || {}
    return options
  }

  setOptions(category, options) {
    this.config.options = this.config.options || {}
    this.config.options[category] = options
  }

  findItemByPath(serviceName, itemPath, matchType = MatchType.all) {
    const relativeItemPath = this.relativizeItemPath(itemPath)
    const items = this.prop(serviceName, 'items')
    if (items) {
      // Find item which matches specified path.
      const itemId = Object.keys(items)
        .find((key) => {
          const item = items[key]
          if (matchType === MatchType.strict) {
            return item.path === relativeItemPath
          } else if (matchType === MatchType.onlyImport) {
            return item.pathOnlyImport === relativeItemPath
          } else if (matchType === MatchType.onlyExport) {
            return item.pathOnlyExport === relativeItemPath
          } else if (matchType === MatchType.exceptImport) {
            return [item.path, item.pathOnlyExport].includes(relativeItemPath)
          } else if (matchType === MatchType.exceptExport) {
            return [item.path, item.pathOnlyImport].includes(relativeItemPath)
          }
          return [item.path, item.pathOnlyImport, item.pathOnlyExport].includes(relativeItemPath)
        })

      if (itemId) {
        const item = items[itemId]
        const matchedAttribute = ['path', 'pathOnlyImport', 'pathOnlyExport'].find(attribute => item[attribute] === relativeItemPath)
        return { itemId, item, matchedAttribute }
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
    if (this.configFile.existsSync()) {
      // Save file.
      return this.saveOnly()
    }
    if (Object.keys(this.config).length === 0) {
      // Don't create if empty.
      return Promise.resolve()
    }
    // Create & Save file. (if not empty)
    return this.configFile.create().then(isCreated => this.saveOnly())
  }

  saveOnly() {
    // See [javascript - sort object properties and JSON.stringify - Stack Overflow](https://stackoverflow.com/questions/16167581/).
    return this.configFile.write(stringify(this.config, { space: 2 }))
  }
}
