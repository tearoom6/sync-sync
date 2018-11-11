'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import MediumService from '../../services/medium-service'
import Services from '../../models/services'

export default class MediumSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <MediumSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        mediumAccessToken={props.mediumAccessToken}
        mediumTitle={props.mediumTitle}
        mediumTags={props.mediumTags}
        mediumStatus={props.mediumStatus}
        mediumItemUrl={props.mediumItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="medium service accordion">
        <input
          id="medium-accordion"
          type="checkbox"
          className="label"
          name="medium-accordion"
          defaultChecked={this.props.mediumAccessToken != null}
        />
        <label htmlFor="medium-accordion" className="label">
          <h2>Medium</h2>
        </label>

        <div className="content">
          <label htmlFor="medium-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="medium-access-token"
              ref="mediumAccessToken"
              value={this.props.mediumAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.mediumItemUrl || ''}
              style={{ visibility: this.props.mediumItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.mediumItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="medium-title">
            <span>Title</span>
            <input
              type="text"
              id="medium-title"
              ref="mediumTitle"
              value={this.props.mediumTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="medium-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="medium-tags"
              ref="mediumTags"
              value={this.props.mediumTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="medium-status">
            <span>Status</span>
            <select
              id="medium-status"
              ref="mediumStatus"
              value={this.props.mediumStatus || 'public'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              <option value="public">public</option>
              <option value="draft">draft</option>
              <option value="unlisted">unlisted</option>
            </select>
          </label>
          <br />

          {
          // Import API is not provided in Medium.
          // <button id="medium-import" on={{ click: this.importFromMedium }} tabIndex={this.props.startTabIndex++}>
          //   Import
          // </button>
          }
          <button id="medium-export" on={{ click: this.exportToMedium }} tabIndex={this.props.startTabIndex++}>
            Create
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      mediumAccessToken: this.refs.mediumAccessToken.value,
      mediumTitle: this.refs.mediumTitle.value,
      mediumTags: this.refs.mediumTags.value,
      mediumStatus: this.refs.mediumStatus.value,
    })
  }

  async importFromMedium(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToMedium(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.medium
  }

  loadRefs() {
    return {
      accessToken: this.refs.mediumAccessToken.value,
      itemTitle: this.refs.mediumTitle.value,
      itemTags: this.refs.mediumTags.value,
      itemStatus: this.refs.mediumStatus.value,
    }
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
    itemsConfig[itemId] = itemsConfig[itemId] || {}
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].publishedAt = new Date(item.publishedAt)
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].authorId = item.authorId
    itemsConfig[itemId].tags = item.tags
    itemsConfig[itemId].status = item.publishStatus
    itemsConfig[itemId].license = item.license
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
    await file.write(this.constructor.normalizeNewLine(item.body))
    console.log('File saved: ', file.getPath())
  }

  async getItems(props, refs) {
    // TODO: - getList API is not provided in Medium.
    atom.notifications.addError('Get List operation is not provided to Medium.')
    return Promise.reject()
  }

  async getItem(itemId, props, refs) {
    // TODO: - getItem API is not provided in Medium.
    atom.notifications.addError('Get Item operation is not provided to Medium.')
    return Promise.reject()
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    let format = 'markdown'
    if (file.getBaseName().endsWith('.html') || file.getBaseName().endsWith('.htm')) {
      format = 'html'
    }
    return this.getService(refs).postItem(title, fileBody, tags, format, refs.itemStatus)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    // TODO: - updateItem API is not provided in Medium.
    atom.notifications.addError('Update operation is not provided to Medium.')
    return Promise.reject()
  }

  getService(refs) {
    return new MediumService(refs.accessToken)
  }
}
