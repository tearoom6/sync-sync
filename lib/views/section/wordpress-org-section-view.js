'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import WordpressOrgService from '../../services/wordpress-org-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'
import InputModalView from '../modal/input-modal-view'

export default class WordpressOrgSectionView extends SectionViewBase {
  constructor(props) {
    super(props)
    this.currentBaseUrl = props.wordpressOrgBaseUrl
  }

  render() {
    return (
      <section className="wordpress-org service accordion">
        <input
          id="wordpress-org-accordion"
          type="checkbox"
          className="label"
          name="wordpress-org-accordion"
          defaultChecked={this.props.wordpressOrgAccessToken != null}
        />
        <label htmlFor="wordpress-org-accordion" className="label">
          <h2>WordPress.org</h2>
        </label>

        <div className="content">
          <label htmlFor="wordpress-org-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="wordpress-org-access-token"
              ref="wordpressOrgAccessToken"
              value={this.props.wordpressOrgAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="wordpress-org-base-url">
            <span>BaseURL</span>
            <input
              type="text"
              id="wordpress-org-base-url"
              ref="wordpressOrgBaseUrl"
              placeholder="https://example.wordpress.org"
              value={this.props.wordpressOrgBaseUrl || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="wordpress-org-extension">
            <span>Extension to use in importing</span>
            <select
              id="wordpress-org-extension"
              ref="wordpressOrgExtension"
              value={this.props.wordpressOrgExtension || 'html'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              <option value="html">.html (HTML)</option>
            </select>
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.wordpressOrgItemUrl || ''}
              style={{ visibility: this.props.wordpressOrgItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.wordpressOrgItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="wordpress-org-title">
            <span>Title</span>
            <input
              type="text"
              id="wordpress-org-title"
              ref="wordpressOrgTitle"
              value={this.props.wordpressOrgTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="wordpress-org-tags">
            <span>Tags</span>
            <select
              multiple
              id="wordpress-org-tags"
              ref="wordpressOrgTags"
              value={this.props.wordpressOrgTags || []}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {(this.props.wordpressOrgTagLists || []).map(tag => (
                <option value={tag.id} selected={(this.props.wordpressOrgTags || []).includes(tag.id)}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
          <br />

          <label htmlFor="wordpress-org-categories">
            <span>Categories</span>
            <select
              multiple
              id="wordpress-org-categories"
              ref="wordpressOrgCategories"
              value={this.props.wordpressOrgCategories || []}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {(this.props.wordpressOrgCategoryLists || []).map(category => (
                <option value={category.id} selected={(this.props.wordpressOrgCategories || []).includes(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <br />

          <button id="wordpress-org-create-tag" on={{ click: this.confirmToCreateTag }} tabIndex={this.props.startTabIndex++}>
            <span role="img" aria-label="Link">
              ➕ Create new tag
            </span>
          </button>
          <button id="wordpress-org-create-category" on={{ click: this.confirmToCreateCategory }} tabIndex={this.props.startTabIndex++}>
            <span role="img" aria-label="Link">
              ➕ Create new category
            </span>
          </button>
          <br />

          <button id="wordpress-org-import" on={{ click: this.importFromWordpressOrg }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="wordpress-org-export" on={{ click: this.exportToWordpressOrg }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.wordpressOrgAccessToken || this.props.wordpressOrgAccessToken
    // Fetch tags & categories when base URL modified.
    if (newProps.wordpressOrgBaseUrl && newProps.wordpressOrgBaseUrl !== this.currentBaseUrl) {
      const wordpressOrgService = new WordpressOrgService(newProps.wordpressOrgBaseUrl, accessToken)
      wordpressOrgService.listAllTags().then(tags => {
        this.currentBaseUrl = newProps.wordpressOrgBaseUrl
        super.update({
          wordpressOrgTagLists: tags,
        })
      })
      wordpressOrgService.listAllCategories().then(categories => {
        this.currentBaseUrl = newProps.wordpressOrgBaseUrl
        super.update({
          wordpressOrgCategoryLists: categories,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      wordpressOrgAccessToken: this.refs.wordpressOrgAccessToken.value,
      wordpressOrgBaseUrl: this.refs.wordpressOrgBaseUrl.value,
      wordpressOrgExtension: this.refs.wordpressOrgExtension.value,
      wordpressOrgTitle: this.refs.wordpressOrgTitle.value,
      wordpressOrgTags: this.refs.wordpressOrgTags.value,
      wordpressOrgCategories: this.refs.wordpressOrgCategories.value,
    })
  }

  confirmToCreateTag(event) {
    const modalView = new InputModalView({ title: 'Create tag', fieldName: 'Tag' }, this, 'createTag')
    const modalPanel = atom.workspace.addModalPanel({ item: modalView.getElement() })
  }

  confirmToCreateCategory(event) {
    const modalView = new InputModalView({ title: 'Create category', fieldName: 'Category' }, this, 'createCategory')
    const modalPanel = atom.workspace.addModalPanel({ item: modalView.getElement() })
  }

  callback(requestId, props) {
    if (requestId === 'createTag') {
      this.createTag(props)
    } else if (requestId === 'createCategory') {
      this.createCategory(props)
    }
  }

  createTag(props) {
    console.log('Create tag.')
    const accessToken = this.refs.wordpressOrgAccessToken.value
    const baseUrl = this.refs.wordpressOrgBaseUrl.value
    const wordpressOrgService = new WordpressOrgService(baseUrl, accessToken)
    return wordpressOrgService.createTag(props.inputText).then(tag => {
      super.update({
        wordpressOrgTagLists: this.props.wordpressOrgTagLists.concat([tag]),
      })
    })
  }

  createCategory(props) {
    console.log('Create category.')
    const accessToken = this.refs.wordpressOrgAccessToken.value
    const baseUrl = this.refs.wordpressOrgBaseUrl.value
    const wordpressOrgService = new WordpressOrgService(baseUrl, accessToken)
    return wordpressOrgService.createCategory(props.inputText).then(category => {
      super.update({
        wordpressOrgCategoryLists: this.props.wordpressOrgCategoryLists.concat([category]),
      })
    })
  }

  importFromWordpressOrg(event) {
    this.handleWordpressOrgEvent(event, SyncType.import)
  }

  exportToWordpressOrg(event) {
    this.handleWordpressOrgEvent(event, SyncType.export)
  }

  handleWordpressOrgEvent(event, type = SyncType.import) {
    try {
      console.log(`Start WordpressOrg: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.wordpressOrgAccessToken.value
      const baseUrl = this.refs.wordpressOrgBaseUrl.value
      const extension = this.refs.wordpressOrgExtension.value
      const wordpressOrgTitle = this.refs.wordpressOrgTitle.value
      const wordpressOrgTags = Array.from(this.refs.wordpressOrgTags.selectedOptions)
        .map(option => option.value)
        .join(',')
      const wordpressOrgCategories = Array.from(this.refs.wordpressOrgCategories.selectedOptions)
        .map(option => option.value)
        .join(',')
      WordpressOrgSectionView.startHandlingWordpressOrgEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        baseUrl,
        extension,
        wordpressOrgTitle,
        wordpressOrgTags,
        wordpressOrgCategories
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingWordpressOrgEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    baseUrl,
    extension,
    wordpressOrgTitle,
    wordpressOrgTags,
    wordpressOrgCategories
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
      config.setProp(Services.wordpressOrg, 'baseUrl', baseUrl)
      // TODO For legacy implementation. To be removed.
      config.deleteProp(Services.wordpressOrg, 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then(config => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.wordpressOrg, 'accessToken', accessToken)
      } else {
        config.deleteProp(Services.wordpressOrg, 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise])
      .then(configs => {
        const [config, secretConfig] = configs
        const itemsConfig = config.prop(Services.wordpressOrg, 'items') || {}

        const wordpressOrgService = new WordpressOrgService(baseUrl, accessToken)
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
          handledProcess = wordpressOrgService.listAllItems(items => {
            // Set total progress.
            totalProgress += items.length
            if (modalView) modalView.update({ totalProgress })
            // Save files.
            const fileSaveProcesses = []
            items.forEach(item => {
              const filePath = this.resolveWordpressOrgItemPath(
                localPath,
                configDir.getPath(),
                item,
                itemsConfig[item.id],
                optionKeepFilePath,
                extension
              )
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

              itemsConfig[item.id] = itemsConfig[item.id] || { baseUrl }
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = item.link
              itemsConfig[item.id].updatedAt = item.modified_gmt
              itemsConfig[item.id].publishedAt = item.date_gmt
              itemsConfig[item.id].title = item.title.raw
              itemsConfig[item.id].tags = item.tags
              itemsConfig[item.id].categories = item.categories
              itemsConfig[item.id].status = item.status
              itemsConfig[item.id].sticky = item.sticky
              itemsConfig[item.id].type = item.type
              itemsConfig[item.id].format = item.format
              itemsConfig[item.id].parent = item.parent
              itemsConfig[item.id].authorId = item.author

              const fileSaveProcess = file.write(this.normalizeNewLine(item.content.raw)).then(() => {
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
            const { itemId } = config.findItemByPath(Services.wordpressOrg, localPath, MatchType.exceptExport)
            if (!itemId) {
              atom.notifications.addError('Not synced file cannot be imported.')
              return Promise.reject()
            }

            // Call get API.
            handledProcess = wordpressOrgService.getItem(itemId).then(item => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = itemsConfig[item.id] ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: targetFile.getPath() })
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.content.raw)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].updatedAt = item.modified_gmt
                itemsConfig[item.id].publishedAt = item.date_gmt
                itemsConfig[item.id].title = item.title.raw
                itemsConfig[item.id].tags = item.tags
                itemsConfig[item.id].categories = item.categories
                itemsConfig[item.id].status = item.status
                itemsConfig[item.id].sticky = item.sticky
                itemsConfig[item.id].type = item.type
                itemsConfig[item.id].format = item.format
                itemsConfig[item.id].parent = item.parent
                itemsConfig[item.id].authorId = item.author
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
              let title = wordpressOrgTitle
              if (!title || title === '') {
                title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
              }
              const { itemId } = config.findItemByPath(Services.wordpressOrg, localPath, MatchType.exceptImport)
              if (!itemId) {
                // In case of posting.
                // Call post API.
                return wordpressOrgService.postItem(title, fileBody, wordpressOrgTags, wordpressOrgCategories).then(item => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { baseUrl }
                  itemsConfig[item.id].url = item.link
                  itemsConfig[item.id].updatedAt = item.modified_gmt
                  itemsConfig[item.id].publishedAt = item.date_gmt
                  itemsConfig[item.id].title = item.title.raw
                  itemsConfig[item.id].tags = item.tags
                  itemsConfig[item.id].categories = item.categories
                  itemsConfig[item.id].status = item.status
                  itemsConfig[item.id].sticky = item.sticky
                  itemsConfig[item.id].type = item.type
                  itemsConfig[item.id].format = item.format
                  itemsConfig[item.id].parent = item.parent
                  itemsConfig[item.id].authorId = item.author
                  // Not HTML documents are only for export.
                  // You can use [WP-Markdown — WordPress Plugins](https://wordpress.org/plugins/wp-markdown/) only for export.
                  if (localPath.endsWith('.html')) {
                    itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                    itemsConfig[item.id].digest = targetFile.getDigestSync()
                  } else {
                    itemsConfig[item.id].pathOnlyExport = config.relativizeItemPath(localPath)
                  }
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
              }

              // In case of updating.
              // Call update API.
              return wordpressOrgService.updateItem(itemId, title, fileBody, wordpressOrgTags, wordpressOrgCategories).then(item => {
                // Save meta data to config.
                itemsConfig[item.id].updatedAt = item.modified_gmt
                itemsConfig[item.id].publishedAt = item.date_gmt
                itemsConfig[item.id].title = item.title.raw
                itemsConfig[item.id].tags = item.tags
                itemsConfig[item.id].categories = item.categories
                itemsConfig[item.id].status = item.status
                itemsConfig[item.id].sticky = item.sticky
                itemsConfig[item.id].type = item.type
                itemsConfig[item.id].format = item.format
                itemsConfig[item.id].parent = item.parent
                itemsConfig[item.id].authorId = item.author
                // Not HTML documents are only for export.
                if (localPath.endsWith('.html')) {
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                }
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
            config.setProp(Services.wordpressOrg, 'items', itemsConfig)
            Promise.all([config.save(), secretConfig.save()]).then(() => {
              console.log('Config files saved.')
              if (progressModal) progressModal.destroy()
              atom.notifications.addSuccess('Completed!')
            })
          })
          .catch(error => {
            // Handle error.
            atom.notifications.addError('Something went wrong.')
            console.error('Error occurred in WordpressOrgService: ', error)
            if (progressModal) progressModal.destroy()
          })
        return Promise.resolve()
      })
      .catch(error => {
        console.error('Error occurred in WordpressOrgService: ', error)
        if (progressModal) progressModal.destroy()
      })
  }

  static resolveWordpressOrgItemPath(localPath, configPath, item, currentItem, optionKeepFilePath, extension) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title.raw)}.${extension}`
  }
}
