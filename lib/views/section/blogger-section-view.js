'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import BloggerService from '../../services/blogger-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'

export default class BloggerSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <BloggerSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        bloggerApiKey={props.bloggerApiKey}
        bloggerBlogId={props.bloggerBlogId}
        bloggerTitle={props.bloggerTitle}
        bloggerLabels={props.bloggerLabels}
        bloggerItemUrl={props.bloggerItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="blogger service accordion">
        <input
          id="blogger-accordion"
          type="checkbox"
          className="label"
          name="blogger-accordion"
          defaultChecked={this.props.bloggerApiKey != null}
        />
        <label htmlFor="blogger-accordion" className="label">
          <h2>Blogger</h2>
        </label>

        <div className="content">
          <label htmlFor="blogger-api-key">
            <span>ApiKey</span>
            <input
              type="text"
              id="blogger-api-key"
              ref="bloggerApiKey"
              value={this.props.bloggerApiKey || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="blogger-blog-id">
            <span>BlogID</span>
            <input
              type="text"
              id="blogger-blog-id"
              ref="bloggerBlogId"
              value={this.props.bloggerBlogId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.bloggerItemUrl || ''}
              style={{ visibility: this.props.bloggerItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.bloggerItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="blogger-title">
            <span>Title</span>
            <input
              type="text"
              id="blogger-title"
              ref="bloggerTitle"
              value={this.props.bloggerTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="blogger-labels">
            <span>Labels (comma separated)</span>
            <input
              type="text"
              id="blogger-labels"
              ref="bloggerLabels"
              value={this.props.bloggerLabels || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <button id="blogger-import" on={{ click: this.importFromBlogger }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          {
          // Export API needs to be authorized by OAuth 2.0, and I do not implement it yet.
          // <button id="blogger-export" on={{ click: this.exportToBlogger }} tabIndex={this.props.startTabIndex++}>
          //   Export
          // </button>
          }
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      bloggerApiKey: this.refs.bloggerApiKey.value,
      bloggerBlogId: this.refs.bloggerBlogId.value,
      bloggerTitle: this.refs.bloggerTitle.value,
      bloggerLabels: this.refs.bloggerLabels.value,
    })
  }

  importFromBlogger(event) {
    this.handleBloggerEvent(event, SyncType.import)
  }

  exportToBlogger(event) {
    this.handleBloggerEvent(event, SyncType.export)
  }

  handleBloggerEvent(event, type = SyncType.import) {
    try {
      console.log(`Start Blogger: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const apiKey = this.refs.bloggerApiKey.value
      const blogId = this.refs.bloggerBlogId.value
      const bloggerTitle = this.refs.bloggerTitle.value
      const bloggerLabels = this.refs.bloggerLabels.value
      BloggerSectionView.startHandlingBloggerEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        apiKey,
        blogId,
        bloggerTitle,
        bloggerLabels,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingBloggerEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    apiKey,
    blogId,
    bloggerTitle,
    bloggerLabels,
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
      config.setProp(Services.blogger, 'blogId', blogId)
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then(config => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.blogger, 'apiKey', apiKey)
      } else {
        config.deleteProp(Services.blogger, 'apiKey')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise])
      .then(configs => {
        const [config, secretConfig] = configs
        const itemsConfig = config.prop(Services.blogger, 'items') || {}

        const bloggerService = new BloggerService(blogId, apiKey)
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
          handledProcess = bloggerService.listAllItems(items => {
            // Set total progress.
            totalProgress += items.length
            if (modalView) modalView.update({ totalProgress })
            // Save files.
            const fileSaveProcesses = []
            items.forEach(item => {
              const filePath = this.resolveBloggerItemPath(localPath, configDir.getPath(), item, itemsConfig[item.id], optionKeepFilePath)
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

              itemsConfig[item.id] = itemsConfig[item.id] || { blogId }
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = item.url
              itemsConfig[item.id].publishedAt = item.published
              itemsConfig[item.id].updatedAt = item.updated
              itemsConfig[item.id].authorId = item.author.id
              itemsConfig[item.id].title = item.title
              itemsConfig[item.id].tags = item.labels

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
            const { itemId } = config.findItemByPath(Services.blogger, localPath, MatchType.exceptExport)
            if (!itemId) {
              atom.notifications.addError('Not synced file cannot be imported.')
              return Promise.reject()
            }

            // Call get API.
            handledProcess = bloggerService.getItem(itemId).then(item => {
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
                itemsConfig[item.id].publishedAt = item.published
                itemsConfig[item.id].updatedAt = item.updated
                itemsConfig[item.id].authorId = item.author.id
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.labels
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
              let title = bloggerTitle
              if (!title || title === '') {
                title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
              }
              const { itemId } = config.findItemByPath(Services.blogger, localPath, MatchType.exceptImport)
              const labels = bloggerLabels.split(',').map(label => label.trim())
              if (!itemId) {
                // In case of posting.
                // Call post API.
                return bloggerService.postItem(title, fileBody, labels).then(item => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { blogId }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].publishedAt = item.published
                  itemsConfig[item.id].updatedAt = item.updated
                  itemsConfig[item.id].authorId = item.author.id
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].tags = item.labels
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
              }

              // In case of updating.
              // Call update API.
              return bloggerService.updateItem(itemId, title, fileBody, labels).then(item => {
                // Save meta data to config.
                itemsConfig[item.id].publishedAt = item.published
                itemsConfig[item.id].updatedAt = item.updated
                itemsConfig[item.id].authorId = item.author.id
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.labels
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
            config.setProp(Services.blogger, 'items', itemsConfig)
            Promise.all([config.save(), secretConfig.save()]).then(() => {
              console.log('Config files saved.')
              if (progressModal) progressModal.destroy()
              atom.notifications.addSuccess('Completed!')
            })
          })
          .catch(error => {
            // Handle error.
            atom.notifications.addError('Something went wrong.')
            console.error('Error occurred in BloggerService: ', error)
            if (progressModal) progressModal.destroy()
          })
        return Promise.resolve()
      })
      .catch(error => {
        console.error('Error occurred in BloggerService: ', error)
        if (progressModal) progressModal.destroy()
      })
  }

  static resolveBloggerItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.html`
  }
}
