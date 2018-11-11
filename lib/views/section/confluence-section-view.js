'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import ConfluenceService from '../../services/confluence-service'
import Services from '../../models/services'

const confluenceItemTypes = ['page', 'blogpost']
const confluenceItemFormats = ['storage', 'view']

export default class ConfluenceSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <ConfluenceSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        confluenceUserName={props.confluenceUserName}
        confluenceAccessToken={props.confluenceAccessToken}
        confluenceBaseUrl={props.confluenceBaseUrl}
        confluenceSpace={props.confluenceSpace}
        confluenceFlatImport={props.confluenceFlatImport}
        confluenceTitle={props.confluenceTitle}
        confluenceParentId={props.confluenceParentId}
        confluenceType={props.confluenceType}
        confluenceFormat={props.confluenceFormat}
        confluenceItemUrl={props.confluenceItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="confluence service accordion">
        <input
          id="confluence-accordion"
          type="checkbox"
          className="label"
          name="confluence-accordion"
          defaultChecked={this.props.confluenceAccessToken != null}
        />
        <label htmlFor="confluence-accordion" className="label">
          <h2>Confluence</h2>
        </label>

        <div className="content">

          <label htmlFor="confluence-user-name">
            <span>UserName (Email)</span>
            <input
              type="text"
              id="confluence-user-name"
              ref="confluenceUserName"
              value={this.props.confluenceUserName || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-access-token">
            <span>APIToken (or Password)</span>
            <input
              type="text"
              id="confluence-access-token"
              ref="confluenceAccessToken"
              value={this.props.confluenceAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-base-url">
            <span>BaseURL</span>
            <input
              type="text"
              id="confluence-base-url"
              ref="confluenceBaseUrl"
              placeholder="https://example.atlassian.net/wiki"
              value={this.props.confluenceBaseUrl || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-space">
            <span>Space</span>
            <input
              type="text"
              id="confluence-space"
              ref="confluenceSpace"
              value={this.props.confluenceSpace || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-flat-import">
            <input
              type="checkbox"
              id="confluence-flat-import"
              name="confluenceFlatImport"
              ref="confluenceFlatImport"
              defaultChecked={this.props.confluenceFlatImport}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
            &nbsp;Flat directory on importing
          </label>
          <br />

          <label htmlFor="confluence-markdown-import">
            <input
              type="checkbox"
              id="confluence-markdown-import"
              name="confluenceMarkdownImport"
              ref="confluenceMarkdownImport"
              defaultChecked={this.props.confluenceMarkdownImport || false}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
            &nbsp;Convert to Markdown (import only)
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.confluenceItemUrl || ''}
              style={{ visibility: this.props.confluenceItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.confluenceItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="confluence-title">
            <span>Title</span>
            <input
              type="text"
              id="confluence-title"
              ref="confluenceTitle"
              value={this.props.confluenceTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-parentId">
            <span>ParentId</span>
            <input
              type="text"
              id="confluence-parentId"
              ref="confluenceParentId"
              value={this.props.confluenceParentId || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="confluence-type">
            <span>Type</span>
            <select
              id="confluence-type"
              ref="confluenceType"
              value={this.props.confluenceType || 'page'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {confluenceItemTypes.map(type => <option value={type}>{type}</option>)}
            </select>
          </label>
          <br />

          <label htmlFor="confluence-format">
            <span>Format</span>
            <select
              id="confluence-format"
              ref="confluenceFormat"
              value={this.props.confluenceFormat || 'storage'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              {confluenceItemFormats.map(format => <option value={format}>{format}</option>)}
            </select>&nbsp;(view is import only)
          </label>
          <br />

          <button id="confluence-import" on={{ click: this.importFromConfluence }} tabIndex={this.props.startTabIndex++}>
            Import
          </button>
          <button id="confluence-export" on={{ click: this.exportToConfluence }} tabIndex={this.props.startTabIndex++}>
            Export
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      confluenceUserName: this.refs.confluenceUserName.value,
      confluenceAccessToken: this.refs.confluenceAccessToken.value,
      confluenceBaseUrl: this.refs.confluenceBaseUrl.value,
      confluenceSpace: this.refs.confluenceSpace.value,
      confluenceFlatImport: this.refs.confluenceFlatImport.checked,
      confluenceMarkdownImport: this.refs.confluenceMarkdownImport.checked,
      confluenceTitle: this.refs.confluenceTitle.value,
      confluenceParentId: this.refs.confluenceParentId.value,
      confluenceType: this.refs.confluenceType.value,
      confluenceFormat: this.refs.confluenceFormat.value,
    })
  }

  async importFromConfluence(event) {
    await this.handleSyncEvent(event, SyncType.import)
  }

  async exportToConfluence(event) {
    await this.handleSyncEvent(event, SyncType.export)
  }

  getServiceKey() {
    return Services.confluence
  }

  loadRefs() {
    return {
      userName: this.refs.confluenceUserName.value,
      accessToken: this.refs.confluenceAccessToken.value,
      baseUrl: this.refs.confluenceBaseUrl.value,
      space: this.refs.confluenceSpace.value,
      flatImport: this.refs.confluenceFlatImport.checked,
      markdownImport: this.refs.confluenceMarkdownImport.checked,
      itemTitle: this.refs.confluenceTitle.value,
      itemParentId: this.refs.confluenceParentId.value,
      itemType: this.refs.confluenceType.value,
      itemFormat: this.refs.confluenceFormat.value,
    }
  }

  saveServiceConfig(config, refs) {
    config.setProp(this.getServiceKey(), 'userName', refs.userName)
    config.setProp(this.getServiceKey(), 'baseUrl', refs.baseUrl)
    config.setProp(this.getServiceKey(), 'space', refs.space)
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
    const parentItem = item.ancestors[item.ancestors.length - 1]
    itemsConfig[itemId] = itemsConfig[itemId] || { userName: refs.userName, baseUrl: refs.baseUrl, space: refs.space }
    itemsConfig[itemId].url = `${refs.baseUrl}${item._links.webui}`
    itemsConfig[itemId].updatedAt = item.version.when
    itemsConfig[itemId].title = item.title
    itemsConfig[itemId].parentId = parentItem ? parentItem.id : null
    itemsConfig[itemId].type = item.type
    itemsConfig[itemId].format = refs.itemFormat
    itemsConfig[itemId].status = item.status
    itemsConfig[itemId].version = item.version.number
    // Markdown documents are only for import.
    if (type === SyncType.import && refs.markdownImport) {
      itemsConfig[itemId].pathOnlyImport = config.relativizeItemPath(file.getPath())
    } else {
      itemsConfig[itemId].digest = file.getDigestSync()
      itemsConfig[itemId].path = config.relativizeItemPath(file.getPath())
    }
  }

  resolveItemFilePath(item, itemConfig, type, config, props, refs) {
    if (props.optionKeepFilePath && itemConfig) {
      if (itemConfig.path) return config.absolutizeItemPath(itemConfig.path)
      if (itemConfig.pathOnlyImport) return config.absolutizeItemPath(itemConfig.pathOnlyImport)
    }
    if (refs.flatImport) {
      return `${props.localPath}/${this.constructor.escapeFileName(item.title)}.${refs.markdownImport ? 'md' : 'html'}`
    }
    const parentsDir = item.ancestors.map(ancestor => this.constructor.escapeFileName(ancestor.title)).join('/')
    return `${props.localPath}/${parentsDir}/${this.constructor.escapeFileName(item.title)}.${refs.markdownImport ? 'md' : 'html'}`
  }

  async saveItemFile(item, file, config, props, refs) {
    let targetFile = file
    if (fs.isFileSync(props.localPath) && refs.markdownImport) {
      targetFile = new File(props.localPath.replace(/.html$/, '.md'))
    }

    const turndownOptions = config.options('turndown')
    const fileBody = this.constructor.convertBodyToSavedStyle(item.body[refs.itemFormat].value, refs.markdownImport, turndownOptions)
    await targetFile.write(this.constructor.normalizeNewLine(fileBody))
    console.log('File saved: ', targetFile.getPath())
  }

  async getItems(props, refs) {
    return this.getService(refs).listAllItems(refs.space, refs.itemType)
  }

  async getItem(itemId, props, refs) {
    return this.getService(refs).getItem(itemId)
  }

  async postItem(file, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs).postItem(refs.space, title, fileBody, refs.itemType, refs.itemParentId, refs.itemFormat)
  }

  async updateItem(itemId, file, itemsConfig, props, refs) {
    const title = this.constructor.getTitle(refs, file)
    const fileBody = await file.read()
    return this.getService(refs)
      .updateItem(itemId, title, fileBody, refs.itemType, itemsConfig[itemId].version + 1, refs.itemParentId, refs.itemFormat)
  }

  static isLocalFileModified(file, itemId, itemsConfig, props, refs) {
    if (file.existsSync()) {
      // Check not-synced local modification.
      const syncedDigest = itemsConfig[itemId] ? itemsConfig[itemId].digest : null
      if (file.getDigestSync() !== syncedDigest && !refs.markdownImport) {
        atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: file.getPath() })
        return true
      }
    }
    return false
  }

  static convertBodyToSavedStyle(htmlBody, markdownImport = false, turndownOptions = {}) {
    if (markdownImport) {
      return this.htmlToMarkdown(htmlBody, turndownOptions)
    }
    return this.normalizeHtmlBody(htmlBody)
  }

  getService(refs) {
    return new ConfluenceService(refs.baseUrl, refs.userName, refs.accessToken)
  }
}
