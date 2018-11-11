'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import WordpressComService from '../../services/wordpress-com-service'
import Services from '../../models/services'

export default class WordpressComSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <WordpressComSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        wordpressComSite={props.wordpressComSite}
        wordpressComAccessToken={props.wordpressComAccessToken}
        wordpressComTitle={props.wordpressComTitle}
        wordpressComTags={props.wordpressComTags}
        wordpressComCategories={props.wordpressComCategories}
        wordpressComItemUrl={props.wordpressComItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="wordpress-com service accordion">
        <input
          id="wordpress-com-accordion"
          type="checkbox"
          className="label"
          name="wordpress-com-accordion"
          defaultChecked={this.props.wordpressComAccessToken != null}
        />
        <label htmlFor="wordpress-com-accordion" className="label">
          <h2>WordPress.com</h2>
        </label>

        <div className="content">
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
          </label>
          <br />

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
          </label>
          <br />

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
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.wordpressComItemUrl || ''}
              style={{ visibility: this.props.wordpressComItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.wordpressComItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
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
          </label>
          <br />

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
          </label>
          <br />

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
          </label>
          <br />

          <button id="wordpress-com-import" on={{ click: this.importFromWordpressCom }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="wordpress-com-export" on={{ click: this.exportToWordpressCom }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
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

  async importFromWordpressCom(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToWordpressCom(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.wordpressCom
  }

  loadRefs() {
    return {
      accessToken: this.refs.wordpressComAccessToken.value,
      site: this.refs.wordpressComSite.value,
      extension: this.refs.wordpressComExtension.value,
      itemTitle: this.refs.wordpressComTitle.value,
      itemTags: this.refs.wordpressComTags.value,
      itemCategories: this.refs.wordpressComCategories.value,
    }
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'site', refs.site)
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
    itemsConfig[itemId] = itemsConfig[itemId] || { site: refs.site }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.URL
    itemsConfig[itemId].updatedAt = item.modified
    itemsConfig[itemId].publishedAt = item.date
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].tags = Object.keys(item.tags)
    itemsConfig[itemId].categories = Object.keys(item.categories)
    itemsConfig[itemId].status = item.status
    itemsConfig[itemId].sticky = item.sticky
    itemsConfig[itemId].type = item.type
    itemsConfig[itemId].format = item.format
    itemsConfig[itemId].parent = item.parent
    itemsConfig[itemId].authorId = item.author.ID
    itemsConfig[itemId].digest = file.getDigestSync()
    itemsConfig[itemId].siteId = item.site_ID
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.title)}.${refs.extension}`
  }

  async saveItemFile(item, file, config, props, refs) {
    await file.write(this.constructor.normalizeNewLine(item.content))
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
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).updateItem(itemId, title, fileBody, refs.itemTags, refs.itemCategories)
  }

  static getItemId(item) {
    return item.ID
  }

  getService(refs) {
    return new WordpressComService(refs.site, refs.accessToken)
  }
}
