'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import ConfluenceService from '../../services/confluence-service'
import Config from '../../models/config'
import ConfigUtil from '../../utils/config-util'

const confluenceItemTypes = ['page', 'blogpost']
const confluenceItemFormats = ['storage', 'view']

export default class ConfluenceSectionView extends SectionViewBase {
  render() {
    return (
      <section className="confluence service">
        <h2>Sync with Confluence</h2>

        <label htmlFor="confluence-user-name">
          <span>UserName (Email)</span>
          <input
            type="text"
            id="confluence-user-name"
            ref="confluenceUserName"
            value={this.props.confluenceUserName || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-access-token">
          <span>APIToken (or Password)</span>
          <input
            type="text"
            id="confluence-access-token"
            ref="confluenceAccessToken"
            value={this.props.confluenceAccessToken || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-base-url">
          <span>BaseURL</span>
          <input
            type="text"
            id="confluence-base-url"
            ref="confluenceBaseUrl"
            placeholder="https://example.atlassian.net/wiki"
            value={this.props.confluenceBaseUrl || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-space">
          <span>Space</span>
          <input
            type="text"
            id="confluence-space"
            ref="confluenceSpace"
            value={this.props.confluenceSpace || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-flat-import">
          <input
            type="checkbox"
            id="confluence-flat-import"
            name="confluenceFlatImport"
            ref="confluenceFlatImport"
            defaultChecked={this.props.confluenceFlatImport}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
          &nbsp;Flat directory on importing
        </label><br />

        <label htmlFor="confluence-markdown-import">
          <input
            type="checkbox"
            id="confluence-markdown-import"
            name="confluenceMarkdownImport"
            ref="confluenceMarkdownImport"
            defaultChecked={this.props.confluenceMarkdownImport || false}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
          &nbsp;Convert to Markdown (import only)
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.confluenceItemUrl || ''}
            style={{ visibility: (this.props.confluenceItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.confluenceItemUrl) ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">🔗</span>
          </a>
        </h3>

        <label htmlFor="confluence-title">
          <span>Title</span>
          <input
            type="text"
            id="confluence-title"
            ref="confluenceTitle"
            value={this.props.confluenceTitle || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-parentId">
          <span>ParentId</span>
          <input
            type="text"
            id="confluence-parentId"
            ref="confluenceParentId"
            value={this.props.confluenceParentId || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="confluence-type">
          <span>Type</span>
          <select
            id="confluence-type"
            ref="confluenceType"
            value={this.props.confluenceType || 'page'}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          >
            {confluenceItemTypes.map(type => <option value={type}>{type}</option>)}
          </select>
        </label><br />

        <label htmlFor="confluence-format">
          <span>Format</span>
          <select
            id="confluence-format"
            ref="confluenceFormat"
            value={this.props.confluenceFormat || 'storage'}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          >
            {confluenceItemFormats.map(format => <option value={format}>{format}</option>)}
          </select>&nbsp;(view is import only)
        </label><br />

        <button id="confluence-import" on={{ click: this.importFromConfluence }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="confluence-export" on={{ click: this.exportToConfluence }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      confluenceUserName: this.refs.confluenceUserName.value,
      confluenceAccessToken: this.refs.confluenceAccessToken.value,
      confluenceBaseUrl: this.refs.confluenceBaseUrl.value,
      confluenceSpace: this.refs.confluenceSpace.value,
      confluenceFlatImport: this.refs.confluenceFlatImport.checked,
      confluenceMarkdownImport: this.refs.confluenceMarkdownImport.checked,
      confluenceTitle: this.refs.confluenceTitle.value,
      confluenceParentId: this.refs.confluenceParentId.value,
      confluenceType: this.refs.confluenceType.value,
      confluenceFormat: this.refs.confluenceFormat.value,
    })
  }

  importFromConfluence(event) {
    this.handleConfluenceEvent(event, 'import')
  }

  exportToConfluence(event) {
    this.handleConfluenceEvent(event, 'export')
  }

  handleConfluenceEvent(event, type = 'import') {
    try {
      console.log(`Start Confluence ${type}.`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const userName = this.refs.confluenceUserName.value
      const accessToken = this.refs.confluenceAccessToken.value
      const baseUrl = this.refs.confluenceBaseUrl.value
      const space = this.refs.confluenceSpace.value
      const flatImport = this.refs.confluenceFlatImport.checked
      const markdownImport = this.refs.confluenceMarkdownImport.checked
      const confluenceTitle = this.refs.confluenceTitle.value
      const confluenceParentId = this.refs.confluenceParentId.value
      const confluenceType = this.refs.confluenceType.value
      const confluenceFormat = this.refs.confluenceFormat.value
      ConfluenceSectionView.startHandlingConfluenceEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        userName,
        accessToken,
        baseUrl,
        space,
        flatImport,
        markdownImport,
        confluenceTitle,
        confluenceParentId,
        confluenceType,
        confluenceFormat,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingConfluenceEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    userName,
    accessToken,
    baseUrl,
    space,
    flatImport,
    markdownImport,
    confluenceTitle,
    confluenceParentId,
    confluenceType,
    confluenceFormat,
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
      config.setProp('confluence', 'userName', userName)
      config.setProp('confluence', 'baseUrl', baseUrl)
      config.setProp('confluence', 'space', space)
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('confluence', 'accessToken', accessToken)
      } else {
        config.deleteProp('confluence', 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('confluence', 'items') || {}

      const confluenceService = new ConfluenceService(baseUrl, userName, accessToken)
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
        handledProcess = confluenceService.listAllItems(space, confluenceType, (items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })
          // Save files.
          const fileSaveProcesses = []
          items.forEach((item) => {
            const filePath = this.resolveConfluenceItemPath(
              localPath,
              configDir.getPath(),
              item,
              itemsConfig[item.id],
              optionKeepFilePath,
              flatImport,
              markdownImport,
            )
            const file = new File(filePath)
            if (file.existsSync()) {
              // Check not-synced local modification.
              const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
              if (file.getDigestSync() !== syncedDigest && !markdownImport) {
                atom.notifications.addError(
                  'Cannot import because of not-synced local modification.',
                  { detail: file.getPath() },
                )
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return
              }
            }

            // Don't save to configs when importing as markdown.
            if (!markdownImport) {
              const parentItem = item.ancestors[item.ancestors.length - 1]
              itemsConfig[item.id] = {
                path: config.relativizeItemPath(file.getPath()),
                url: `${baseUrl}${item._links.webui}`,
                updatedAt: item.version.when,
                title: item.title,
                parentId: (parentItem ? parentItem.id : null),
                type: item.type,
                format: confluenceFormat,
                status: item.status,
                version: item.version.number,
                userName,
                baseUrl,
                space,
              }
            }

            const turndownOptions = config.options('turndown')
            const fileBody = this.convertBodyToSavedStyle(item.body[confluenceFormat].value, markdownImport, turndownOptions)
            const fileSaveProcess = file.write(fileBody).then(() => {
              console.log('File saved: ', file.getPath())
              if (!markdownImport) {
                itemsConfig[item.id].digest = file.getDigestSync()
              }
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
        let targetFile = new File(localPath)
        if (type === 'import') {
          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('confluence', localPath)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
          }

          // Call get API.
          handledProcess = confluenceService.getItem(itemId)
            .then((item) => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest && !markdownImport) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: targetFile.getPath() },
                  )
                  return Promise.reject()
                }
              }

              // Save file.
              if (markdownImport) {
                targetFile = new File(localPath.replace(/.html$/, '.md'))
              }
              const turndownOptions = config.options('turndown')
              const fileBody = this.convertBodyToSavedStyle(item.body[confluenceFormat].value, markdownImport, turndownOptions)
              return targetFile.write(fileBody).then(() => {
                console.log('File saved: ', targetFile.getPath())
                // Don't save to configs when importing as markdown.
                if (!markdownImport) {
                  const parentItem = item.ancestors[item.ancestors.length - 1]
                  itemsConfig[item.id].updatedAt = item.version.when
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].parentId = (parentItem ? parentItem.id : null)
                  itemsConfig[item.id].type = item.type
                  itemsConfig[item.id].format = confluenceFormat
                  itemsConfig[item.id].status = item.status
                  itemsConfig[item.id].version = item.version.number
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                }
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
            let title = confluenceTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath('confluence', localPath)
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return confluenceService.postItem(
                space,
                title,
                fileBody,
                confluenceType,
                confluenceParentId,
                confluenceFormat,
              ).then((item) => {
                // Save meta data to config.
                const parentItem = item.ancestors[item.ancestors.length - 1]
                itemsConfig[item.id] = {
                  path: config.relativizeItemPath(localPath),
                  url: `${baseUrl}${item._links.webui}`,
                  updatedAt: item.version.when,
                  title: item.title,
                  parentId: (parentItem ? parentItem.id : null),
                  type: item.type,
                  format: confluenceFormat,
                  status: item.status,
                  version: item.version.number,
                  userName,
                  baseUrl,
                  space,
                  digest: targetFile.getDigestSync(),
                }
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            }

            // In case of updating.
            // Call update API.
            return confluenceService.updateItem(
              itemId,
              title,
              fileBody,
              confluenceType,
              itemsConfig[itemId].version + 1,
              confluenceParentId,
              confluenceFormat,
            ).then((item) => {
              // Save meta data to config.
              const parentItem = item.ancestors[item.ancestors.length - 1]
              itemsConfig[item.id].updatedAt = item.version.when
              itemsConfig[item.id].title = item.title
              itemsConfig[item.id].parentId = (parentItem ? parentItem.id : null)
              itemsConfig[item.id].type = item.type
              itemsConfig[item.id].format = confluenceFormat
              itemsConfig[item.id].status = item.status
              itemsConfig[item.id].version = item.version.number
              itemsConfig[item.id].digest = targetFile.getDigestSync()
              // Update progress (100%).
              if (modalView) modalView.update({ currentProgress: 100 })
              return Promise.resolve()
            })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.setProp('confluence', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in ConfluenceService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in ConfluenceService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static convertBodyToSavedStyle(htmlBody, markdownImport = false, turndownOptions = {}) {
    if (markdownImport) {
      return this.htmlToMarkdown(htmlBody, turndownOptions)
    }
    return this.normalizeHtmlBody(htmlBody)
  }

  static resolveConfluenceItemPath(localPath, configPath, item, currentItem, optionKeepFilePath, flatImport, markdownImport) {
    if (optionKeepFilePath && currentItem) {
      return `${configPath}/${currentItem.path}`
    }
    if (flatImport) {
      return `${localPath}/${this.escapeFileName(item.title)}.${markdownImport ? 'md' : 'html'}`
    }
    const parentsDir = item.ancestors.map(ancestor => this.escapeFileName(ancestor.title)).join('/')
    return `${localPath}/${parentsDir}/${this.escapeFileName(item.title)}.${markdownImport ? 'md' : 'html'}`
  }
}
