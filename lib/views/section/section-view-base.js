'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import Config, { MatchType } from '../../models/config'
import ConfigUtil from '../../utils/config-util'
import ViewBase from '../view-base'
import ProgressModalView from '../modal/progress-modal-view'

export const SyncType = Object.freeze({
  import: 1,
  export: 2,
})

export default class SectionViewBase extends ViewBase {
  async handleSyncEvent(event, type = SyncType.import) {
    console.log(`Start sync event: ${type}`)
    const { modalView, modalPanel: progressModal } = this.constructor.showProgressModal()

    try {
      const refs = this.loadRefs()
      if (!this.validateParams(type, this.props, refs)) return

      const [config, secretConfig] = await this.loadConfigs(this.props.configDirPath, refs)
      const itemsConfig = config.prop(this.getServiceKey(), 'items') || {}

      await this.executeSyncing(type, this.props, refs, config, secretConfig, itemsConfig, modalView)

      config.setProp(this.getServiceKey(), 'items', itemsConfig)
      await this.saveConfigFiles(config, secretConfig)

      if (progressModal) progressModal.destroy()
      atom.notifications.addSuccess('Completed!')
    } catch (error) {
      if (progressModal) progressModal.destroy()
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  getServiceKey() {
    return ''
  }

  loadRefs() {
    return {}
  }

  validateParams(type, props, refs) {
    if (props.localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return false
    }
    return true
  }

  async loadConfigs(configDirPath, refs) {
    const configDir = new Directory(configDirPath)
    if (!configDir.existsSync()) {
      atom.notifications.addError(`Cannot find config directory: ${configDir.getPath()}`)
      return Promise.reject()
    }

    const configFile = new File(`${configDirPath}/${ConfigUtil.getConfigBaseName()}`)
    const config = await Config.load(configFile)
    this.saveServiceConfig(config, refs)
    const secretConfigFile = new File(`${configDirPath}/${ConfigUtil.getSecretConfigBaseName()}`)
    const secretConfig = await Config.load(secretConfigFile)
    this.saveServiceSecretConfig(secretConfig, refs)

    return [config, secretConfig]
  }

  saveServiceConfig(config, refs) {
  }

  saveServiceSecretConfig(config, refs) {
  }

  saveItemConfig(itemsConfig, item, file, type, config, props, refs) {
  }

  resolveItemFilePath(item, currentItem, type, config, props, refs) {
  }

  async importSingleItem(itemsConfig, itemId, item, file, type, config, props, refs) {
    if (this.constructor.isLocalFileModified(file, itemId, itemsConfig, props, refs)) {
      return false
    }

    await this.saveItemFile(item, file, config, props, refs)
    this.saveItemConfig(itemsConfig, item, file, type, config, props, refs)
    return true
  }

  async saveItemFile(item, file, config, props, refs) {
    return Promise.resolve()
  }

  async saveConfigFiles(config, secretConfig, itemsConfig) {
    await config.save()
    await secretConfig.save()
    console.log('Config files saved.')
  }

  async executeSyncing(type, props, refs, config, secretConfig, itemsConfig, modalView) {
    if (fs.isDirectorySync(props.localPath)) {
      // 1. In case of selecting directory.
      if (type === SyncType.export) {
        // 1-a. In case of exporting.
        atom.notifications.addError('You can only specify files in exporting.')
        return Promise.reject()
      }

      // 1-b. In case of importing.
      // Call listing API.
      let totalProgress = 0
      let currentProgress = 0
      const items = await this.getItems(props, refs)

      // Set total progress.
      totalProgress += items.length
      if (modalView) modalView.update({ totalProgress })

      // Save files.
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemId = this.constructor.getItemId(item)
        const filePath = this.resolveItemFilePath(item, itemsConfig[itemId], type, config, props, refs)
        const file = new File(filePath)
        /* eslint no-await-in-loop: [0] */
        await this.importSingleItem(itemsConfig, itemId, item, file, type, config, props, refs)

        // Update progress.
        if (modalView) modalView.update({ currentProgress: ++currentProgress })
      }
    } else if (fs.isFileSync(props.localPath)) {
      // Set total progress (100%).
      if (modalView) modalView.update({ totalProgress: 100 })

      // 2. In case of selecting file.
      const targetFile = new File(props.localPath)
      if (type === SyncType.import) {
        // 2-a. In case of importing.
        const { itemId } = config.findItemByPath(this.getServiceKey(), props.localPath, MatchType.exceptExport)
        if (!itemId) {
          atom.notifications.addError('Not synced file cannot be imported.')
          return Promise.reject()
        }

        const item = await this.getItem(itemId, props, refs)
        if (!await this.importSingleItem(itemsConfig, itemId, item, targetFile, type, config, props, refs)) {
          return Promise.reject()
        }
      } else {
        // 2-b. In case of exporting.
        const { itemId } = config.findItemByPath(this.getServiceKey(), props.localPath, MatchType.exceptImport)
        if (!itemId) {
          // In case of posting.
          const item = await this.postItem(targetFile, props, refs)
          this.saveItemConfig(itemsConfig, item, targetFile, type, config, props, refs)
        } else {
          // In case of updating.
          const item = await this.updateItem(itemId, targetFile, itemsConfig, props, refs)
          this.saveItemConfig(itemsConfig, item, targetFile, type, config, props, refs)
        }
      }

      // Update progress (100%).
      if (modalView) modalView.update({ currentProgress: 100 })
    }
    return Promise.resolve()
  }

  async getItems(props, refs) {
    return Promise.resolve()
  }

  async getItem(itemId, props, refs) {
    return Promise.resolve()
  }

  async postItem(file, props, refs) {
    return Promise.resolve()
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    return Promise.resolve()
  }

  static getItemId(item) {
    return item.id
  }

  static getTitle(refs, file) {
    let title = refs.itemTitle
    if (!title || title === '') {
      title = file.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
    }
    return title
  }

  static isLocalFileModified(file, itemId, itemsConfig, props, refs) {
    if (file.existsSync()) {
      // Check not-synced local modification.
      const syncedDigest = itemsConfig[itemId] ? itemsConfig[itemId].digest : null
      if (file.getDigestSync() !== syncedDigest) {
        atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: file.getPath() })
        return true
      }
    }
    return false
  }

  static showProgressModal(title = 'Now Processing', message = 'Please wait for the process finished...') {
    const modalView = new ProgressModalView({ title, message })
    const modalPanel = atom.workspace.addModalPanel({ item: modalView.getElement() })
    return { modalView, modalPanel }
  }
}
