'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import QiitaService from '../../services/qiita-service'
import Services from '../../models/services'

export default class QiitaSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <QiitaSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        qiitaAccessToken={props.qiitaAccessToken}
        qiitaUserName={props.qiitaUserName}
        qiitaTitle={props.qiitaTitle}
        qiitaTags={props.qiitaTags}
        qiitaItemUrl={props.qiitaItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="qiita service accordion">
        <input
          id="qiita-accordion"
          type="checkbox"
          className="label"
          name="qiita-accordion"
          defaultChecked={this.props.qiitaAccessToken != null}
        />
        <label htmlFor="qiita-accordion" className="label">
          <h2>Qiita</h2>
        </label>

        <div className="content">
          <label htmlFor="qiita-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="qiita-access-token"
              ref="qiitaAccessToken"
              value={this.props.qiitaAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-user-name">
            <span>UserName</span>
            <input
              type="text"
              id="qiita-user-name"
              ref="qiitaUserName"
              value={this.props.qiitaUserName || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.qiitaItemUrl || ''}
              style={{ visibility: this.props.qiitaItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.qiitaItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="qiita-title">
            <span>Title</span>
            <input
              type="text"
              id="qiita-title"
              ref="qiitaTitle"
              value={this.props.qiitaTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="qiita-tags"
              ref="qiitaTags"
              value={this.props.qiitaTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <button id="qiita-import" on={{ click: this.importFromQiita }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="qiita-export" on={{ click: this.exportToQiita }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      qiitaAccessToken: this.refs.qiitaAccessToken.value,
      qiitaUserName: this.refs.qiitaUserName.value,
      qiitaTitle: this.refs.qiitaTitle.value,
      qiitaTags: this.refs.qiitaTags.value,
    })
  }

  async importFromQiita(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToQiita(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.qiita
  }

  loadRefs() {
    return {
      accessToken: this.refs.qiitaAccessToken.value,
      userName: this.refs.qiitaUserName.value,
      itemTitle: this.refs.qiitaTitle.value,
      itemTags: this.refs.qiitaTags.value,
    }
  }

  validateParams(type, props, refs) {
    if (type === SyncType.export && refs.itemTags === '') {
      atom.notifications.addError('Need to specify tag in exporting.')
      return false
    }
    return super.validateParams(props, refs)
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'userName', refs.userName)
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
    itemsConfig[itemId] = itemsConfig[itemId] || { userName: refs.userName }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].updatedAt = item.updated_at
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].tags = item.tags.map(tag => tag.name)
    itemsConfig[itemId].digest = file.getDigestSync()
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.title)}.md`
  }

  async saveItemFile(item, file, config, props, refs) {
    await file.write(this.constructor.normalizeNewLine(item.body))
    console.log('File saved: ', file.getPath())
  }

  async getItems(props, refs) {
    return this.getService(refs).listAllItems(refs.userName)
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).postItem(title, fileBody, tags)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).updateItem(itemId, title, fileBody, tags)
  }

  getService(refs) {
    return new QiitaService(refs.accessToken)
  }
}
