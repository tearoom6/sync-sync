'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import HatenaService from '../../services/hatena-service'
import Services from '../../models/services'

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

  async importFromHatena(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToHatena(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.hatena
  }

  loadRefs() {
    return {
      userId: this.refs.hatenaUserId.value,
      blogId: this.refs.hatenaBlogId.value,
      apiKey: this.refs.hatenaApiKey.value,
      itemTitle: this.refs.hatenaTitle.value,
      itemCategories: this.refs.hatenaCategories.value,
    }
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'userId', refs.userId)
    config.setProp(this.getServiceKey(), 'blogId', refs.blogId)
  }

  saveServiceSecretConfig(config, refs) {
    if (atom.config.get('sync-sync.keepSecrets')) {
      config.setProp(this.getServiceKey(), 'apiKey', refs.apiKey)
    } else {
      config.deleteProp(this.getServiceKey(), 'apiKey')
    }
  }

  saveItemConfig(itemsConfig, item, file, type, config, props, refs) {
    const itemId = this.constructor.getItemId(item)
    itemsConfig[itemId] = itemsConfig[itemId] || { userId: refs.userId, blogId: refs.blogId }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].updatedAt = item.updatedAt
    itemsConfig[itemId].publishedAt = item.publishedAt
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].author = item.author
    itemsConfig[itemId].categories = item.categories
    itemsConfig[itemId].contentType = item.contentType
    itemsConfig[itemId].isDraft = item.isDraft
    itemsConfig[itemId].digest = file.getDigestSync()
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
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
    return `${props.localPath}/${this.constructor.escapeFileName(item.title)}.${extension}`
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
    const categories = refs.itemCategories.split(',').map(category => category.trim())
    return this.getService(refs).postItem(title, fileBody, categories)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const categories = refs.itemCategories.split(',').map(category => category.trim())
    return this.getService(refs).updateItem(itemId, title, fileBody, itemsConfig[itemId].updatedAt, categories)
  }

  getService(refs) {
    return new HatenaService(refs.userId, refs.blogId, refs.apiKey)
  }
}
