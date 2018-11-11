'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import DocBaseService from '../../services/docbase-service'
import Services from '../../models/services'

const docbaseScopes = ['everyone', 'group', 'private']

export default class DocBaseSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <DocBaseSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        docbaseAccessToken={props.docbaseAccessToken}
        docbaseDomain={props.docbaseDomain}
        docbaseTitle={props.docbaseTitle}
        docbaseTags={props.docbaseTags}
        docbaseGroups={props.docbaseGroups}
        docbaseScope={props.docbaseScope}
        docbaseItemUrl={props.docbaseItemUrl}
      />
    )
  }

  constructor(props) {
    super(props)
    this.currentDomain = props.docbaseDomain
  }

  render() {
    return (
      <section className="docbase service accordion">
        <input
          id="docbase-accordion"
          type="checkbox"
          className="label"
          name="docbase-accordion"
          defaultChecked={this.props.docbaseAccessToken != null}
        />
        <label htmlFor="docbase-accordion" className="label">
          <h2>DocBase</h2>
        </label>

        <div className="content">
          <label htmlFor="docbase-access-token">
            <span>APIToken</span>
            <input
              type="text"
              id="docbase-access-token"
              ref="docbaseAccessToken"
              value={this.props.docbaseAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="docbase-domain">
            <span>Domain</span>
            <input
              type="text"
              id="docbase-domain"
              ref="docbaseDomain"
              value={this.props.docbaseDomain || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.docbaseItemUrl || ''}
              style={{ visibility: this.props.docbaseItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.docbaseItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="docbase-title">
            <span>Title</span>
            <input
              type="text"
              id="docbase-title"
              ref="docbaseTitle"
              value={this.props.docbaseTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="docbase-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="docbase-tags"
              ref="docbaseTags"
              value={this.props.docbaseTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="docbase-groups">
            <span>Groups</span>
            <select
              multiple
              id="docbase-groups"
              ref="docbaseGroups"
              value={this.props.docbaseGroups || []}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {(this.props.docbaseBelongingGroups || []).map(group => (
                <option value={group.id} selected={(this.props.docbaseGroups || []).includes(group.id)}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <br />

          <label htmlFor="docbase-scope">
            <span>Scope</span>
            <select
              id="docbase-scope"
              ref="docbaseScope"
              value={this.props.docbaseScope || 'everyone'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {docbaseScopes.map(scope => <option value={scope}>{scope}</option>)}
            </select>
          </label>
          <br />

          <button id="docbase-import" on={{ click: this.importFromDocBase }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="docbase-export" on={{ click: this.exportToDocBase }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.docbaseAccessToken || this.props.docbaseAccessToken
    // Fetch belonging groups when domain modified.
    if (newProps.docbaseDomain && newProps.docbaseDomain !== this.currentDomain) {
      const docbaseService = new DocBaseService(accessToken)
      docbaseService.listGroups(newProps.docbaseDomain).then(groups => {
        this.currentDomain = newProps.docbaseDomain
        super.update({
          docbaseBelongingGroups: groups,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      docbaseAccessToken: this.refs.docbaseAccessToken.value,
      docbaseDomain: this.refs.docbaseDomain.value,
      docbaseTitle: this.refs.docbaseTitle.value,
      docbaseTags: this.refs.docbaseTags.value,
      docbaseGroups: this.refs.docbaseGroups.value,
      docbaseScope: this.refs.docbaseScope.value,
    })
  }

  async importFromDocBase(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToDocBase(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.docbase
  }

  loadRefs() {
    return {
      accessToken: this.refs.docbaseAccessToken.value,
      domain: this.refs.docbaseDomain.value,
      itemTitle: this.refs.docbaseTitle.value,
      itemTags: this.refs.docbaseTags.value,
      itemGroups: Array.from(this.refs.docbaseGroups.selectedOptions).map(option => option.value),
      itemScope: this.refs.docbaseScope.value,
    }
  }

  validateParams(type, props, refs) {
    if (type === SyncType.export && !docbaseScopes.includes(refs.itemScope)) {
      atom.notifications.addError(`Invalid scope specified: ${refs.itemScope}`)
      return false
    }
    return super.validateParams(props, refs)
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'domain', refs.domain)
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
    itemsConfig[item.id] = itemsConfig[item.id] || { domain: refs.domain }
    itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
    itemsConfig[item.id].url = item.url
    itemsConfig[item.id].createdAt = item.created_at
    itemsConfig[item.id].title = item.title
    itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
    itemsConfig[item.id].groups = item.groups
    itemsConfig[item.id].scope = item.scope
    itemsConfig[item.id].digest = file.getDigestSync()
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
    return this.getService(refs).listAllItems(refs.domain)
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(refs.domain, itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).postItem(refs.domain, title, fileBody, tags, refs.itemGroups, refs.itemScope)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).updateItem(refs.domain, itemId, title, fileBody, tags, refs.itemGroups, refs.itemScope)
  }

  getService(refs) {
    return new DocBaseService(refs.accessToken)
  }
}
