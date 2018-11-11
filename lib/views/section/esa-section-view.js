'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import EsaService from '../../services/esa-service'
import Services from '../../models/services'

export default class EsaSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <EsaSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        esaAccessToken={props.esaAccessToken}
        esaTeamName={props.esaTeamName}
        esaTitle={props.esaTitle}
        esaTags={props.esaTags}
        esaCategory={props.esaCategory}
        esaItemUrl={props.esaItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="esa service accordion">
        <input
          id="esa-accordion"
          type="checkbox"
          className="label"
          name="esa-accordion"
          defaultChecked={this.props.esaAccessToken != null}
        />
        <label htmlFor="esa-accordion" className="label">
          <h2>esa.io</h2>
        </label>

        <div className="content">
          <label htmlFor="esa-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="esa-access-token"
              ref="esaAccessToken"
              value={this.props.esaAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="esa-team-name">
            <span>TeamName</span>
            <input
              type="text"
              id="esa-team-name"
              ref="esaTeamName"
              value={this.props.esaTeamName || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.esaItemUrl || ''}
              style={{ visibility: this.props.esaItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.esaItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="esa-title">
            <span>Title</span>
            <input
              type="text"
              id="esa-title"
              ref="esaTitle"
              value={this.props.esaTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="esa-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="esa-tags"
              ref="esaTags"
              value={this.props.esaTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="esa-category">
            <span>Category</span>
            <input
              type="text"
              id="esa-category"
              ref="esaCategory"
              value={this.props.esaCategory || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <button id="esa-import" on={{ click: this.importFromEsa }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="esa-export" on={{ click: this.exportToEsa }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      esaAccessToken: this.refs.esaAccessToken.value,
      esaTeamName: this.refs.esaTeamName.value,
      esaTitle: this.refs.esaTitle.value,
      esaTags: this.refs.esaTags.value,
      esaCategory: this.refs.esaCategory.value,
    })
  }

  async importFromEsa(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToEsa(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.esa
  }

  loadRefs() {
    return {
      accessToken: this.refs.esaAccessToken.value,
      teamName: this.refs.esaTeamName.value,
      itemTitle: this.refs.esaTitle.value,
      itemTags: this.refs.esaTags.value,
      itemCategory: this.refs.esaCategory.value,
    }
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'teamName', refs.teamName)
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
    itemsConfig[itemId] = itemsConfig[itemId] || { teamName: refs.teamName }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].updatedAt = item.updated_at
    itemsConfig[itemId].title = item.name
    itemsConfig[itemId].tags = item.tags
    itemsConfig[itemId].category = item.category
    itemsConfig[itemId].revision = item.revision_number
    itemsConfig[itemId].wip = item.wip
    itemsConfig[itemId].message = item.message
    itemsConfig[itemId].digest = file.getDigestSync()
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    if (item.category && item.category !== '') {
      // Use category as directory.
      return `${props.localPath}/${item.category}/${this.constructor.escapeFileName(item.name)}.md`
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.name)}.md`
  }

  async saveItemFile(item, file, config, props, refs) {
    await file.write(this.constructor.normalizeNewLine(item.body_md))
    console.log('File saved: ', file.getPath())
  }

  async getItems(props, refs) {
    return this.getService(refs).listAllItems(refs.teamName)
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(refs.teamName, itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).postItem(refs.teamName, title, fileBody, tags, refs.itemCategory)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).updateItem(refs.teamName, itemId, title, fileBody, tags, refs.itemCategory)
  }

  static getItemId(item) {
    return item.number
  }

  getService(refs) {
    return new EsaService(refs.accessToken)
  }
}
