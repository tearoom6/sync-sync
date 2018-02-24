'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import WordpressComService from '../../services/wordpress-com-service'
import Config from '../../models/config'
import ConfigUtil from '../../utils/config-util'

export default class WordpressComSectionView extends SectionViewBase {
  render() {
    return (
      <section className="wordpress-com service">
        <h2>Sync with WordPress.com</h2>

        <label htmlFor="wordpress-com-access-token">
          <span>AccessToken</span>
          <input
            type="text"
            id="wordpress-com-access-token"
            ref="wordpressComAccessToken"
            value={this.props.wordpressComAccessToken || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="wordpress-com-site">
          <span>Site</span>
          <input
            type="text"
            id="wordpress-com-site"
            ref="wordpressComSite"
            placeholder="example.wordpress.com"
            value={this.props.wordpressComSite || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="wordpress-com-extension">
          <span>Extension to use in importing</span>
          <select
            id="wordpress-com-extension"
            ref="wordpressComExtension"
            value={this.props.wordpressComExtension || 'html'}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          >
            <option value="html">.html (HTML)</option>
            <option value="md">.md (Markdown)</option>
          </select>
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.wordpressComItemUrl || ''}
            style={{ visibility: (this.props.wordpressComItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.wordpressComItemUrl) ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">🔗</span>
          </a>
        </h3>

        <label htmlFor="wordpress-com-title">
          <span>Title</span>
          <input
            type="text"
            id="wordpress-com-title"
            ref="wordpressComTitle"
            value={this.props.wordpressComTitle || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="wordpress-com-tags">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            id="wordpress-com-tags"
            ref="wordpressComTags"
            value={this.props.wordpressComTags || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="wordpress-com-categories">
          <span>Categories (comma separated)</span>
          <input
            type="text"
            id="wordpress-com-categories"
            ref="wordpressComCategories"
            value={this.props.wordpressComCategories || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <button id="wordpress-com-import" on={{ click: this.importFromWordpressCom }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="wordpress-com-export" on={{ click: this.exportToWordpressCom }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      wordpressComAccessToken: this.refs.wordpressComAccessToken.value,
      wordpressComSite: this.refs.wordpressComSite.value,
      wordpressComExtension: this.refs.wordpressComExtension.value,
      wordpressComTitle: this.refs.wordpressComTitle.value,
      wordpressComTags: this.refs.wordpressComTags.value,
      wordpressComCategories: this.refs.wordpressComCategories.value,
    })
  }

  importFromWordpressCom(event) {
    this.handleWordpressComEvent(event, 'import')
  }

  exportToWordpressCom(event) {
    this.handleWordpressComEvent(event, 'export')
  }

  handleWordpressComEvent(event, type = 'import') {
    try {
      console.log(`Start WordpressCom ${type}.`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.wordpressComAccessToken.value
      const site = this.refs.wordpressComSite.value
      const extension = this.refs.wordpressComExtension.value
      const wordpressComTitle = this.refs.wordpressComTitle.value
      const wordpressComTags = this.refs.wordpressComTags.value
      const wordpressComCategories = this.refs.wordpressComCategories.value
      WordpressComSectionView.startHandlingWordpressComEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        site,
        extension,
        wordpressComTitle,
        wordpressComTags,
        wordpressComCategories,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingWordpressComEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    site,
    extension,
    wordpressComTitle,
    wordpressComTags,
    wordpressComCategories,
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

    const loadConfigPromise = Config.load(configFile).then((config) => {
      config.setProp('wordpressCom', 'site', site)
      // TODO For legacy implementation. To be removed.
      config.deleteProp('wordpressCom', 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('wordpressCom', 'accessToken', accessToken)
      } else {
        config.deleteProp('wordpressCom', 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('wordpressCom', 'items') || {}

      const wordpressComService = new WordpressComService(site, accessToken)
      let handledProcess

      if (fs.isDirectorySync(localPath)) {
        //
        // 1. In case of selecting directory.
        //
        if (type === 'export') {
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
        handledProcess = wordpressComService.listAllItems((items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })
          // Save files.
          const fileSaveProcesses = []
          items.forEach((item) => {
            const filePath = this.resolveWordpressComItemPath(
              localPath,
              configDir.getPath(),
              item,
              itemsConfig[item.ID],
              optionKeepFilePath,
              extension,
            )
            const file = new File(filePath)
            if (file.existsSync()) {
              // Check not-synced local modification.
              const syncedDigest = (itemsConfig[item.ID]) ? itemsConfig[item.ID].digest : null
              if (file.getDigestSync() !== syncedDigest) {
                atom.notifications.addError(
                  'Cannot import because of not-synced local modification.',
                  { detail: file.getPath() },
                )
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return
              }
            }

            itemsConfig[item.ID] = {
              path: config.relativizeItemPath(file.getPath()),
              url: item.URL,
              updatedAt: item.modified,
              title: item.title,
              tags: Object.keys(item.tags),
              categories: Object.keys(item.categories),
              status: item.status,
              sticky: item.sticky,
              type: item.type,
              format: item.format,
              parent: item.parent,
              authorId: item.author.ID,
              siteId: item.site_ID,
            }

            const fileSaveProcess = file.write(this.normalizeNewLine(item.content)).then(() => {
              console.log('File saved: ', file.getPath())
              itemsConfig[item.ID].digest = file.getDigestSync()
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
        if (type === 'import') {
          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('wordpressCom', localPath)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
          }

          // Call get API.
          handledProcess = wordpressComService.getItem(itemId)
            .then((item) => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.ID]) ? itemsConfig[item.ID].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: targetFile.getPath() },
                  )
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.content)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.ID].updatedAt = item.modified
                itemsConfig[item.ID].title = item.title
                itemsConfig[item.ID].tags = Object.keys(item.tags)
                itemsConfig[item.ID].categories = Object.keys(item.categories)
                itemsConfig[item.ID].status = item.status
                itemsConfig[item.ID].sticky = item.sticky
                itemsConfig[item.ID].type = item.type
                itemsConfig[item.ID].format = item.format
                itemsConfig[item.ID].parent = item.parent
                itemsConfig[item.ID].authorId = item.author.ID
                itemsConfig[item.ID].digest = targetFile.getDigestSync()
                itemsConfig[item.ID].siteId = item.site_ID
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
        } else {
          //
          // 2-b. In case of exporting.
          //
          handledProcess = targetFile.read().then((fileBody) => {
            let title = wordpressComTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath('wordpressCom', localPath)
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return wordpressComService.postItem(title, fileBody, wordpressComTags, wordpressComCategories)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.ID] = {
                    path: config.relativizeItemPath(localPath),
                    url: item.URL,
                    updatedAt: item.modified,
                    title: item.title,
                    tags: Object.keys(item.tags),
                    categories: Object.keys(item.categories),
                    status: item.status,
                    sticky: item.sticky,
                    type: item.type,
                    format: item.format,
                    parent: item.parent,
                    authorId: item.author.ID,
                    digest: targetFile.getDigestSync(),
                    siteId: item.site_ID,
                  }
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return wordpressComService.updateItem(itemId, title, fileBody, wordpressComTags, wordpressComCategories)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.ID].updatedAt = item.modified
                itemsConfig[item.ID].title = item.title
                itemsConfig[item.ID].tags = Object.keys(item.tags)
                itemsConfig[item.ID].categories = Object.keys(item.categories)
                itemsConfig[item.ID].status = item.status
                itemsConfig[item.ID].sticky = item.sticky
                itemsConfig[item.ID].type = item.type
                itemsConfig[item.ID].format = item.format
                itemsConfig[item.ID].parent = item.parent
                itemsConfig[item.ID].authorId = item.author.ID
                itemsConfig[item.ID].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.setProp('wordpressCom', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in WordpressComService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in WordpressComService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static resolveWordpressComItemPath(localPath, configPath, item, currentItem, optionKeepFilePath, extension) {
    if (optionKeepFilePath && currentItem) {
      return `${configPath}/${currentItem.path}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.${extension}`
  }
}
