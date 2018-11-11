'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import SectionViewBase, { SyncType } from './section-view-base'
import BacklogService from '../../services/backlog-service'
import Services from '../../models/services'
import { timeout } from '../../utils/common-util'

export default class BacklogSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <BacklogSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        backlogAccessToken={props.backlogAccessToken}
        backlogSpaceKey={props.backlogSpaceKey}
        backlogDomain={props.backlogDomain}
        backlogProjectId={props.backlogProjectId}
        backlogTitle={props.backlogTitle}
        backlogTags={props.backlogTags}
        backlogItemUrl={props.backlogItemUrl}
      />
    )
  }

  constructor(props) {
    super(props)
    this.currentSpaceKey = null
  }

  render() {
    return (
      <section className="backlog service accordion">
        <input
          id="backlog-accordion"
          type="checkbox"
          className="label"
          name="backlog-accordion"
          defaultChecked={this.props.backlogAccessToken != null}
        />
        <label htmlFor="backlog-accordion" className="label">
          <h2>Backlog</h2>
        </label>

        <div className="content">

          <label htmlFor="backlog-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="backlog-access-token"
              ref="backlogAccessToken"
              value={this.props.backlogAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="backlog-space-key">
            <span>SpaceKey</span>
            <input
              type="text"
              id="backlog-space-key"
              ref="backlogSpaceKey"
              value={this.props.backlogSpaceKey || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="backlog-domain">
            <span>Domain</span>
            <select
              id="backlog-domain"
              ref="backlogDomain"
              value={this.props.backlogDomain || 'backlog.com'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              <option value="backlog.com" selected={this.props.backlogDomain === 'backlog.com'}>backlog.com</option>
              <option value="backlog.jp" selected={this.props.backlogDomain === 'backlog.jp'}>backlog.jp</option>
            </select>
          </label>
          <br />

          <label htmlFor="backlog-project-id">
            <span>Project</span>
            <select
              id="backlog-project-id"
              ref="backlogProjectId"
              value={this.props.backlogProjectId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {(this.props.backlogProjects || []).map(project => (
                <option value={project.id} selected={project.id.toString() === this.props.backlogProjectId}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.backlogItemUrl || ''}
              style={{ visibility: this.props.backlogItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.backlogItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="backlog-title">
            <span>Title</span>
            <input
              type="text"
              id="backlog-title"
              ref="backlogTitle"
              value={this.props.backlogTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="backlog-tags">
            <span>Tags (import only)</span>
            <input
              type="text"
              id="backlog-tags"
              ref="backlogTags"
              value={this.props.backlogTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <button id="backlog-import" on={{ click: this.importFromBacklog }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="backlog-export" on={{ click: this.exportToBacklog }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>

        </div>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.backlogAccessToken || this.props.backlogAccessToken
    // Fetch belonging projects when spaceKey or domain modified.
    if ((newProps.backlogSpaceKey && newProps.backlogSpaceKey !== this.currentSpaceKey)
      || (newProps.backlogDomain && newProps.backlogDomain !== this.currentDomain)) {
      const backlogService = new BacklogService(newProps.backlogSpaceKey, newProps.backlogDomain, accessToken)
      backlogService.listProjects().then(projects => {
        this.currentSpaceKey = newProps.backlogSpaceKey
        this.currentDomain = newProps.backlogDomain
        super.update({
          backlogProjects: projects,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      backlogAccessToken: this.refs.backlogAccessToken.value,
      backlogSpaceKey: this.refs.backlogSpaceKey.value,
      backlogDomain: this.refs.backlogDomain.value,
      backlogProjectId: this.refs.backlogProjectId.value,
      backlogTitle: this.refs.backlogTitle.value,
      backlogTags: this.refs.backlogTags.value,
    })
  }

  async importFromBacklog(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToBacklog(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.backlog
  }

  loadRefs() {
    const projectId = this.refs.backlogProjectId.value
    return {
      accessToken: this.refs.backlogAccessToken.value,
      spaceKey: this.refs.backlogSpaceKey.value,
      domain: this.refs.backlogDomain.value,
      projectId,
      selectedProject: this.props.backlogProjects.find(project => project.id.toString() === projectId),
      itemTitle: this.refs.backlogTitle.value,
      itemTags: this.refs.backlogTags.value,
    }
  }

  validateParams(type, props, refs) {
    if (!refs.selectedProject) {
      atom.notifications.addError('Project must be specified.')
      return false
    }
    return super.validateParams(props, refs)
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'spaceKey', refs.spaceKey)
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
    itemsConfig[item.id] = itemsConfig[item.id] || { spaceKey: refs.spaceKey }
    itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
    itemsConfig[item.id].url = this.constructor.resolveBacklogItemUrl(refs.spaceKey, refs.domain, refs.selectedProject, item)
    itemsConfig[item.id].updatedAt = item.updated
    itemsConfig[item.id].title = item.name
    itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
    itemsConfig[item.id].digest = file.getDigestSync()
    itemsConfig[item.id].projectId = item.projectId
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    if (refs.selectedProject.textFormattingRule === 'markdown') {
      return `${props.localPath}/${this.constructor.escapeFileName(item.name)}.md`
    }
    return `${props.localPath}/${this.constructor.escapeFileName(item.name)}.wiki`
  }

  async importSingleItem(itemsConfig, itemId, item, file, type, config, props, refs) {
    if (this.constructor.isLocalFileModified(file, itemId, itemsConfig, props, refs)) {
      return false
    }

    // [setTimeoutをasync/awaitプログラミングで使う - Qiita](https://qiita.com/yuba/items/2b17f9ac188e5138319c)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const detailItem = await this.getItem(item.id, props, refs)

    await this.saveItemFile(detailItem, file, config, props, refs)
    this.saveItemConfig(itemsConfig, detailItem, file, type, config, props, refs)
    return true
  }

  async saveItemFile(item, file, config, props, refs) {
    await file.write(this.constructor.normalizeNewLine(item.content))
    console.log('File saved: ', file.getPath())
  }

  async getItems(props, refs) {
    return this.getService(refs).listItems(refs.selectedProject.id)
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs).postItem(refs.selectedProject.id, title, fileBody)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs).updateItem(itemId, title, fileBody)
  }

  static resolveBacklogItemUrl(spaceKey, domain, selectedProject, item) {
    return `https://${spaceKey}.${domain}/wiki/${selectedProject.projectKey}/${item.name}`
  }

  getService(refs) {
    return new BacklogService(refs.spaceKey, refs.domain, refs.accessToken)
  }
}
