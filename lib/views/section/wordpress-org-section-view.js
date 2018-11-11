'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import WordpressOrgService from '../../services/wordpress-org-service'
import Services from '../../models/services'
import InputModalView from '../modal/input-modal-view'

export default class WordpressOrgSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <WordpressOrgSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        wordpressOrgBaseUrl={props.wordpressOrgBaseUrl}
        wordpressOrgAccessToken={props.wordpressOrgAccessToken}
        wordpressOrgTitle={props.wordpressOrgTitle}
        wordpressOrgTags={props.wordpressOrgTags}
        wordpressOrgCategories={props.wordpressOrgCategories}
        wordpressOrgItemUrl={props.wordpressOrgItemUrl}
      />
    )
  }

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

  async createTag(props) {
    console.log('Create tag.')
    const accessToken = this.refs.wordpressOrgAccessToken.value
    const baseUrl = this.refs.wordpressOrgBaseUrl.value
    const wordpressOrgService = new WordpressOrgService(baseUrl, accessToken)
    const tag = await wordpressOrgService.createTag(props.inputText)
    super.update({
      wordpressOrgTagLists: this.props.wordpressOrgTagLists.concat([tag]),
    })
  }

  async createCategory(props) {
    console.log('Create category.')
    const accessToken = this.refs.wordpressOrgAccessToken.value
    const baseUrl = this.refs.wordpressOrgBaseUrl.value
    const wordpressOrgService = new WordpressOrgService(baseUrl, accessToken)
    const category = await wordpressOrgService.createCategory(props.inputText)
    super.update({
      wordpressOrgCategoryLists: this.props.wordpressOrgCategoryLists.concat([category]),
    })
  }

  async importFromWordpressOrg(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToWordpressOrg(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.wordpressOrg
  }

  loadRefs() {
    return {
      accessToken: this.refs.wordpressOrgAccessToken.value,
      baseUrl: this.refs.wordpressOrgBaseUrl.value,
      extension: this.refs.wordpressOrgExtension.value,
      itemTitle: this.refs.wordpressOrgTitle.value,
      itemTags: Array.from(this.refs.wordpressOrgTags.selectedOptions)
        .map(option => option.value)
        .join(','),
      itemCategories: Array.from(this.refs.wordpressOrgCategories.selectedOptions)
        .map(option => option.value)
        .join(','),
    }
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'baseUrl', refs.baseUrl)
  }

  saveServiceSecretConfig(config, refs) {
    if (atom.config.get('sync-sync.keepSecrets')) {
      config.setProp(this.getServiceKey(), 'accessToken', refs.accessToken)
    } else {
      config.deleteProp(this.getServiceKey(), 'accessToken')
    }
  }

  saveItemConfig(itemsConfig, item, file, type, config, props, refs) {
    const itemId = this.constructor.getItemId(item)
    itemsConfig[itemId] = itemsConfig[itemId] || { baseUrl: refs.baseUrl }
    itemsConfig[itemId].url = item.link
    itemsConfig[itemId].updatedAt = item.modified_gmt
    itemsConfig[itemId].publishedAt = item.date_gmt
    itemsConfig[itemId].title = item.title.raw
    itemsConfig[itemId].tags = item.tags
    itemsConfig[itemId].categories = item.categories
    itemsConfig[itemId].status = item.status
    itemsConfig[itemId].sticky = item.sticky
    itemsConfig[itemId].type = item.type
    itemsConfig[itemId].format = item.format
    itemsConfig[itemId].parent = item.parent
    itemsConfig[itemId].authorId = item.author
    if (type === SyncType.import) {
      itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
      itemsConfig[itemId].digest = file.getDigestSync()
    } else if (file.getPath().endsWith('.html')) {
      itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
      itemsConfig[itemId].digest = file.getDigestSync()
    } else {
      // Not HTML documents are only for export.
      // You can use [WP-Markdown — WordPress Plugins](https://wordpress.org/plugins/wp-markdown/) only for export.
      itemsConfig[itemId].pathOnlyExport = config.relativizeItemPath(file.getPath())
    }
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.title.raw)}.${refs.extension}`
  }

  async saveItemFile(item, file, config, props, refs) {
    await file.write(this.constructor.normalizeNewLine(item.content.raw))
    console.log('File saved: ', file.getPath())
  }

  async getItems(props, refs) {
    return this.getService(refs).listAllItems()
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs).postItem(title, fileBody, refs.itemTags, refs.itemCategories)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs).updateItem(itemId, title, fileBody, refs.itemTags, refs.itemCategories)
  }

  getService(refs) {
    return new WordpressOrgService(refs.baseUrl, refs.accessToken)
  }
}
