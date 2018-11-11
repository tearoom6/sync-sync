'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import QiitaTeamService from '../../services/qiita-team-service'
import Services from '../../models/services'

export default class QiitaTeamSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <QiitaTeamSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        qiitaTeamAccessToken={props.qiitaTeamAccessToken}
        qiitaTeamTeamId={props.qiitaTeamTeamId}
        qiitaTeamUserName={props.qiitaTeamUserName}
        qiitaTeamTitle={props.qiitaTeamTitle}
        qiitaTeamTags={props.qiitaTeamTags}
        qiitaTeamItemUrl={props.qiitaTeamItemUrl}
        qiitaTeamGroupId={props.qiitaTeamGroupId}
        qiitaTeamCoediting={props.qiitaTeamCoediting}
      />
    )
  }

  constructor(props) {
    super(props)
    this.currentTeamId = null
  }

  render() {
    return (
      <section className="qiita-team service accordion">
        <input
          id="qiita-team-accordion"
          type="checkbox"
          className="label"
          name="qiita-team-accordion"
          defaultChecked={this.props.qiitaTeamAccessToken != null}
        />
        <label htmlFor="qiita-team-accordion" className="label">
          <h2>Qiita:Team</h2>
        </label>

        <div className="content">
          <label htmlFor="qiita-team-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="qiita-team-access-token"
              ref="qiitaTeamAccessToken"
              value={this.props.qiitaTeamAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-team-team-id">
            <span>TeamId</span>
            <input
              type="text"
              id="qiita-team-team-id"
              ref="qiitaTeamTeamId"
              value={this.props.qiitaTeamTeamId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-team-user-name">
            <span>UserName</span>
            <input
              type="text"
              id="qiita-team-user-name"
              ref="qiitaTeamUserName"
              value={this.props.qiitaTeamUserName || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.qiitaTeamItemUrl || ''}
              style={{ visibility: this.props.qiitaTeamItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.qiitaTeamItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="qiita-team-title">
            <span>Title</span>
            <input
              type="text"
              id="qiita-team-title"
              ref="qiitaTeamTitle"
              value={this.props.qiitaTeamTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-team-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="qiita-team-tags"
              ref="qiitaTeamTags"
              value={this.props.qiitaTeamTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="qiita-team-group-id">
            <span>Group</span>
            <select
              id="qiita-team-group-id"
              ref="qiitaTeamGroupId"
              value={this.props.qiitaTeamGroupId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {(this.props.qiitaTeamGroups || [])
                .concat({ url_name: '', name: '(no group)' }) // Add default group.
                .map(group => (
                  <option value={group.url_name} selected={group.url_name === this.props.qiitaTeamGroupId}>
                    {group.name}
                  </option>
                ))}
            </select>
          </label>
          <br />

          <label htmlFor="qiita-team-coediting">
            <input
              type="checkbox"
              id="qiita-team-coediting"
              name="qiitaTeamCoediting"
              ref="qiitaTeamCoediting"
              checked={this.props.qiitaTeamCoediting || false}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
            &nbsp;Co-editing (If you once make it co-editing, it cannot be reverted)
          </label>
          <br />

          <button id="qiita-team-import" on={{ click: this.importFromQiitaTeam }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="qiita-team-export" on={{ click: this.exportToQiitaTeam }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.qiitaTeamAccessToken || this.props.qiitaTeamAccessToken
    // Fetch belonging groups when teamId modified.
    if (newProps.qiitaTeamTeamId && newProps.qiitaTeamTeamId !== this.currentTeamId) {
      const qiitaTeamService = new QiitaTeamService(newProps.qiitaTeamTeamId, accessToken)
      qiitaTeamService.listGroups().then(groups => {
        this.currentTeamId = newProps.qiitaTeamTeamId
        super.update({
          qiitaTeamGroups: groups,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      qiitaTeamAccessToken: this.refs.qiitaTeamAccessToken.value,
      qiitaTeamTeamId: this.refs.qiitaTeamTeamId.value,
      qiitaTeamUserName: this.refs.qiitaTeamUserName.value,
      qiitaTeamTitle: this.refs.qiitaTeamTitle.value,
      qiitaTeamTags: this.refs.qiitaTeamTags.value,
      qiitaTeamGroupId: this.refs.qiitaTeamGroupId.value,
      qiitaTeamCoediting: this.refs.qiitaTeamCoediting.checked,
    })
  }

  async importFromQiitaTeam(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToQiitaTeam(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.qiitaTeam
  }

  loadRefs() {
    return {
      accessToken: this.refs.qiitaTeamAccessToken.value,
      teamId: this.refs.qiitaTeamTeamId.value,
      userName: this.refs.qiitaTeamUserName.value,
      itemTitle: this.refs.qiitaTeamTitle.value,
      itemTags: this.refs.qiitaTeamTags.value,
      itemGroupId: this.refs.qiitaTeamGroupId.value,
      itemCoediting: this.refs.qiitaTeamCoediting.checked,
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
    config.setProp(this.getServiceKey(), 'teamId', refs.teamId)
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
    itemsConfig[itemId] = itemsConfig[itemId] || { teamId: refs.teamId, userName: refs.userName }
    itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    itemsConfig[itemId].url = item.url
    itemsConfig[itemId].updatedAt = item.updated_at
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].tags = item.tags.map(tag => tag.name)
    itemsConfig[itemId].group = item.group ? item.group.url_name : null
    itemsConfig[itemId].coediting = item.coediting
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
    return this.getService(refs).postItem(title, fileBody, tags, refs.itemGroupId, refs.itemCoediting)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    const tags = refs.itemTags.split(',').map(tag => tag.trim())
    return this.getService(refs).updateItem(itemId, title, fileBody, tags, refs.itemGroupId, refs.itemCoediting)
  }

  getService(refs) {
    return new QiitaTeamService(refs.teamId, refs.accessToken)
  }
}
