'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import BloggerService from '../../services/blogger-service'
import Services from '../../models/services'

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

  async importFromBlogger(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToBlogger(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.blogger
  }

  loadRefs() {
    return {
      apiKey: this.refs.bloggerApiKey.value,
      blogId: this.refs.bloggerBlogId.value,
      itemTitle: this.refs.bloggerTitle.value,
      itemLabels: this.refs.bloggerLabels.value,
    }
  }

  saveServiceConfig(config, refs) {
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
    itemsConfig[itemId] = itemsConfig[itemId] || { blogId: refs.blogId }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].publishedAt = item.published
    itemsConfig[itemId].updatedAt = item.updated
    itemsConfig[itemId].authorId = item.author.id
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].tags = item.labels
    itemsConfig[itemId].digest = file.getDigestSync()
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.title)}.html`
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
    const labels = refs.itemLabels.split(',').map(label => label.trim())
    return this.getService(refs).postItem(title, fileBody, labels)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const labels = refs.itemLabels.split(',').map(label => label.trim())
    return this.getService(refs).updateItem(itemId, title, fileBody, labels)
  }

  getService(refs) {
    return new BloggerService(refs.blogId, refs.apiKey)
  }
}
