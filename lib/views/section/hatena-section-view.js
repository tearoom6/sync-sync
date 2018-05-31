'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import HatenaService from '../../services/hatena-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'

export default class HatenaSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <HatenaSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        hatenaApiKey={props.hatenaApiKey}
        hatenaUserId={props.hatenaUserId}
        hatenaBlogId={props.hatenaBlogId}
        hatenaTitle={props.hatenaTitle}
        hatenaCategories={props.hatenaCategories}
        hatenaItemUrl={props.hatenaItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="hatena service accordion">
        <input
          id="hatena-accordion"
          type="checkbox"
          className="label"
          name="hatena-accordion"
          defaultChecked={this.props.hatenaApiKey != null}
        />
        <label htmlFor="hatena-accordion" className="label">
          <h2>Hatena Blog</h2>
        </label>

        <div className="content">
          <label htmlFor="hatena-user-id">
            <span>UserId</span>
            <input
              type="text"
              id="hatena-user-id"
              ref="hatenaUserId"
              value={this.props.hatenaUserId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="hatena-blog-id">
            <span>BlogId</span>
            <input
              type="text"
              id="hatena-blog-id"
              ref="hatenaBlogId"
              value={this.props.hatenaBlogId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="hatena-api-key">
            <span>ApiKey</span>
            <input
              type="text"
              id="hatena-api-key"
              ref="hatenaApiKey"
              value={this.props.hatenaApiKey || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.hatenaItemUrl || ''}
              style={{ visibility: this.props.hatenaItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.hatenaItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="hatena-title">
            <span>Title</span>
            <input
              type="text"
              id="hatena-title"
              ref="hatenaTitle"
              value={this.props.hatenaTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="hatena-categories">
            <span>Categories (comma separated)</span>
            <input
              type="text"
              id="hatena-categories"
              ref="hatenaCategories"
              value={this.props.hatenaCategories || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <button id="hatena-import" on={{ click: this.importFromHatena }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="hatena-export" on={{ click: this.exportToHatena }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      hatenaUserId: this.refs.hatenaUserId.value,
      hatenaBlogId: this.refs.hatenaBlogId.value,
      hatenaApiKey: this.refs.hatenaApiKey.value,
      hatenaTitle: this.refs.hatenaTitle.value,
      hatenaCategories: this.refs.hatenaCategories.value,
    })
  }

  importFromHatena(event) {
    this.handleHatenaEvent(event, SyncType.import)
  }

  exportToHatena(event) {
    this.handleHatenaEvent(event, SyncType.export)
  }

  handleHatenaEvent(event, type = SyncType.import) {
    try {
      console.log(`Start Hatena: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const userId = this.refs.hatenaUserId.value
      const blogId = this.refs.hatenaBlogId.value
      const apiKey = this.refs.hatenaApiKey.value
      const hatenaTitle = this.refs.hatenaTitle.value
      const hatenaCategories = this.refs.hatenaCategories.value
      HatenaSectionView.startHandlingHatenaEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        userId,
        blogId,
        apiKey,
        hatenaTitle,
        hatenaCategories,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingHatenaEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    userId,
    blogId,
    apiKey,
    hatenaTitle,
    hatenaCategories,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    // Load config files.
    const configDir = new Directory(configDirPath)
    if (!configDir.existsSync()) {
      atom.notifications.addError(`Cannot find config directory: ${configDir.getPath()}`)
      return
    }
    const configFile = new File(`${configDirPath}/${ConfigUtil.getConfigBaseName()}`)
    const secretConfigFile = new File(`${configDirPath}/${ConfigUtil.getSecretConfigBaseName()}`)

    const loadConfigPromise = Config.load(configFile).then(config => {
      config.setProp(Services.hatena, 'userId', userId)
      config.setProp(Services.hatena, 'blogId', blogId)
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then(config => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.hatena, 'apiKey', apiKey)
      } else {
        config.deleteProp(Services.hatena, 'apiKey')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise])
      .then(configs => {
        const [config, secretConfig] = configs
        const itemsConfig = config.prop(Services.hatena, 'items') || {}

        const hatenaService = new HatenaService(userId, blogId, apiKey)
        let handledProcess

        if (fs.isDirectorySync(localPath)) {
          //
          // 1. In case of selecting directory.
          //
          if (type === SyncType.export) {
            //
            // 1-a. In case of exporting.
            //
            atom.notifications.addError('You can only specify files in exporting.')
            return Promise.reject()
          }

          //
          // 1-b. In case of importing.
          //

          // Call listing API.
          let totalProgress = 0
          let currentProgress = 0
          handledProcess = hatenaService.listAllItems(items => {
            // Set total progress.
            totalProgress += items.length
            if (modalView) modalView.update({ totalProgress })
            // Save files.
            const fileSaveProcesses = []
            items.forEach(item => {
              const filePath = this.resolveHatenaItemPath(localPath, configDir.getPath(), item, itemsConfig[item.id], optionKeepFilePath)
              const file = new File(filePath)
              if (file.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = itemsConfig[item.id] ? itemsConfig[item.id].digest : null
                if (file.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: file.getPath() })
                  // Update progress.
                  if (modalView) modalView.update({ currentProgress: ++currentProgress })
                  return
                }
              }

              itemsConfig[item.id] = itemsConfig[item.id] || { userId, blogId }
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = item.url
              itemsConfig[item.id].updatedAt = item.updatedAt
              itemsConfig[item.id].publishedAt = item.publishedAt
              itemsConfig[item.id].title = item.title
              itemsConfig[item.id].author = item.author
              itemsConfig[item.id].categories = item.categories
              itemsConfig[item.id].contentType = item.contentType
              itemsConfig[item.id].isDraft = item.isDraft

              const fileSaveProcess = file.write(this.normalizeNewLine(item.content)).then(() => {
                console.log('File saved: ', file.getPath())
                itemsConfig[item.id].digest = file.getDigestSync()
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return Promise.resolve()
              })
              fileSaveProcesses.push(fileSaveProcess)
            })
            return Promise.all(fileSaveProcesses)
          })
        } else if (fs.isFileSync(localPath)) {
          // Set total progress (100%).
          if (modalView) modalView.update({ totalProgress: 100 })

          //
          // 2. In case of selecting file.
          //
          const targetFile = new File(localPath)
          if (type === SyncType.import) {
            //
            // 2-a. In case of importing.
            //
            const { itemId } = config.findItemByPath(Services.hatena, localPath, MatchType.exceptExport)
            if (!itemId) {
              atom.notifications.addError('Not synced file cannot be imported.')
              return Promise.reject()
            }

            // Call get API.
            handledProcess = hatenaService.getItem(itemId).then(item => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = itemsConfig[item.id] ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: targetFile.getPath() })
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.content)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].updatedAt = item.updatedAt
                itemsConfig[item.id].publishedAt = item.publishedAt
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].author = item.author
                itemsConfig[item.id].categories = item.categories
                itemsConfig[item.id].contentType = item.contentType
                itemsConfig[item.id].isDraft = item.isDraft
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
          } else {
            //
            // 2-b. In case of exporting.
            //
            handledProcess = targetFile.read().then(fileBody => {
              let title = hatenaTitle
              if (!title || title === '') {
                title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
              }
              const { itemId } = config.findItemByPath(Services.hatena, localPath, MatchType.exceptImport)
              const categories = hatenaCategories.split(',').map(category => category.trim())
              if (!itemId) {
                // In case of posting.
                // Call post API.
                return hatenaService.postItem(title, fileBody, categories).then(item => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { userId, blogId }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].updatedAt = item.updatedAt
                  itemsConfig[item.id].publishedAt = item.publishedAt
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].author = item.author
                  itemsConfig[item.id].categories = item.categories
                  itemsConfig[item.id].contentType = item.contentType
                  itemsConfig[item.id].isDraft = item.isDraft
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
              }

              // In case of updating.
              // Call update API.
              return hatenaService.updateItem(itemId, title, fileBody, categories).then(item => {
                // Save meta data to config.
                itemsConfig[item.id].updatedAt = item.updatedAt
                itemsConfig[item.id].publishedAt = item.publishedAt
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].author = item.author
                itemsConfig[item.id].categories = item.categories
                itemsConfig[item.id].contentType = item.contentType
                itemsConfig[item.id].isDraft = item.isDraft
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
          }
        }

        handledProcess
          .then(() => {
            // Save meta data to config.
            config.setProp(Services.hatena, 'items', itemsConfig)
            Promise.all([config.save(), secretConfig.save()]).then(() => {
              console.log('Config files saved.')
              if (progressModal) progressModal.destroy()
              atom.notifications.addSuccess('Completed!')
            })
          })
          .catch(error => {
            // Handle error.
            atom.notifications.addError('Something went wrong.')
            console.error('Error occurred in HatenaService: ', error)
            if (progressModal) progressModal.destroy()
          })
        return Promise.resolve()
      })
      .catch(error => {
        console.error('Error occurred in HatenaService: ', error)
        if (progressModal) progressModal.destroy()
      })
  }

  static resolveHatenaItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    const extension = (contentType => {
      switch (contentType) {
        case 'text/x-markdown':
          return 'md'
        case 'text/x-hatena-syntax':
          return 'txt'
        case 'text/html':
          return 'htm'
        default:
          return 'txt'
      }
    })(item.contentType)
    return `${localPath}/${this.escapeFileName(item.title)}.${extension}`
  }
}
