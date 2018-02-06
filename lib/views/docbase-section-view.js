'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import DocBaseService from '../services/docbase-service'

const docbaseScopes = ['everyone', 'group', 'private']

export default class DocBaseSectionView extends SectionViewBase {
  render() {
    return (
      <section className="docbase service">
        <h2>Sync with DocBase</h2>

        <label htmlFor="docbase-access-token">
          <span>AccessToken</span>
          <input
            type="text"
            id="docbase-access-token"
            ref="docbaseAccessToken"
            value={this.props.docbaseAccessToken || ''}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="docbase-domain">
          <span>Domain</span>
          <input
            type="text"
            id="docbase-domain"
            ref="docbaseDomain"
            value={this.props.docbaseDomain || ''}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.docbaseItemUrl || ''}
            style={{ visibility: (this.props.docbaseItemUrl === null) ? 'hidden' : 'visible' }}
            tabIndex={this.props.startTabIndex++}
          >
            <span role="img" aria-label="Link">🔗</span>
          </a>
        </h3>

        <label htmlFor="docbase-title">
          <span>Title</span>
          <input
            type="text"
            id="docbase-title"
            ref="docbaseTitle"
            value={this.props.docbaseTitle || ''}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="docbase-tags">
          <span>Tags</span>
          <input
            type="text"
            id="docbase-tags"
            ref="docbaseTags"
            value={this.props.docbaseTags || ''}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="docbase-groups">
          <span>Groups</span>
          <input
            type="text"
            id="docbase-groups"
            ref="docbaseGroups"
            value={this.props.docbaseGroups || ''}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="docbase-scope">
          <span>Scope</span>
          <select
            id="docbase-scope"
            ref="docbaseScope"
            value={this.props.docbaseScope || ''}
            tabIndex={this.props.startTabIndex++}
          >
            {
              docbaseScopes.map((scope) => {
                if (scope === this.props.docbaseScope) {
                  return <option value={scope} selected>{scope}</option>
                }
                return <option value={scope}>{scope}</option>
              })
            }
          </select>
        </label><br />

        <button id="docbase-import" on={{ click: this.importFromDocBase }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="docbase-export" on={{ click: this.exportToDocBase }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  importFromDocBase(event) {
    this.handleDocBaseEvent(event, 'import')
  }

  exportToDocBase(event) {
    this.handleDocBaseEvent(event, 'export')
  }

  handleDocBaseEvent(event, type = 'import') {
    try {
      console.log(`Start DocBase ${type}.`)
      const { localPath, configPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.docbaseAccessToken.value
      const domain = this.refs.docbaseDomain.value
      const docbaseTitle = this.refs.docbaseTitle.value
      const docbaseTags = this.refs.docbaseTags.value
      const docbaseGroups = this.refs.docbaseGroups.value
      const docbaseScope = this.refs.docbaseScope.value
      DocBaseSectionView.startHandlingDocBaseEvent(
        type,
        configPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        domain,
        docbaseTitle,
        docbaseTags,
        docbaseGroups,
        docbaseScope,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingDocBaseEvent(
    type,
    configPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    domain,
    docbaseTitle,
    docbaseTags,
    docbaseGroups,
    docbaseScope,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    if (type === 'export' && !docbaseScopes.includes(docbaseScope)) {
      atom.notifications.addError(`Invalid scope specified: ${docbaseScope}`)
      return
    }

    // Load config file.
    const configFile = new File(configPath)
    if (!configFile.existsSync()) {
      atom.notifications.addError(`Cannot find config file: ${configPath}`)
      return
    }
    const configDir = configFile.getParent()
    configFile.read().then((configBody) => {
      const config = JSON.parse(configBody)
      config.docbase = config.docbase || {}
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.docbase.accessToken = accessToken
      } else {
        delete config.docbase.accessToken
      }
      config.docbase.domain = domain
      const itemsConfig = config.docbase.items || {}

      const docbaseService = new DocBaseService(accessToken)
      let handledProcess

      if (fs.isDirectorySync(localPath)) {
        //
        // 1. In case of selecting directory.
        //
        if (type === 'export') {
          //
          // 1-a. In case of exporting.
          //
          atom.notifications.addError('You can only specify files in exporting.')
          return
        }

        //
        // 1-b. In case of importing.
        //

        // Call listing API.
        handledProcess = docbaseService.listAllItems(domain)
          .then((items) => {
            // Save files.
            const fileSaveProcesses = []
            items.forEach((item) => {
              let file = new File(`${localPath}/${item.title}.md`)
              if (optionKeepFilePath && itemsConfig[item.id]) {
                file = new File(`${configDir.getPath()}/${itemsConfig[item.id].path}`)
              }
              if (file.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
                if (file.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: file.getPath() },
                  )
                  return
                }
              }

              const relativeItemPath = configDir.relativize(file.getPath())
              itemsConfig[item.id] = {
                path: relativeItemPath,
                url: item.url,
                createdAt: item.created_at,
                title: item.title,
                tags: item.tags.map(tag => tag.name),
                groups: item.groups,
                scope: item.scope,
                domain,
              }

              const fileSaveProcess = file.write(this.normalizeNewLine(item.body)).then(() => {
                console.log('File saved: ', file.getPath())
                itemsConfig[item.id].digest = file.getDigestSync()
                return Promise.resolve()
              })
              fileSaveProcesses.push(fileSaveProcess)
            })
            return Promise.all(fileSaveProcesses)
          })
      } else if (fs.isFileSync(localPath)) {
        //
        // 2. In case of selecting file.
        //
        const targetFile = new File(localPath)
        if (type === 'import') {
          //
          // 2-a. In case of importing.
          //
          const relativeItemPath = configDir.relativize(localPath)
          const itemId = Object.keys(itemsConfig)
            .find(key => itemsConfig[key].path === relativeItemPath)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return
          }

          // Call get API.
          handledProcess = docbaseService.getItem(domain, itemId)
            .then((item) => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: targetFile.getPath() },
                  )
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.body)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].createdAt = item.created_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].groups = item.groups
                itemsConfig[item.id].scope = item.scope
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                return Promise.resolve()
              })
            })
        } else {
          //
          // 2-b. In case of exporting.
          //
          handledProcess = targetFile.read().then((fileBody) => {
            const relativeItemPath = configDir.relativize(localPath)
            let title = docbaseTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const itemId = Object.keys(itemsConfig)
              .find(key => itemsConfig[key].path === relativeItemPath)
            const tags = docbaseTags.split(',').map(tag => tag.trim())
            const groups = docbaseGroups.split(',').map(group => group.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return docbaseService.postItem(domain, title, fileBody, tags, groups, docbaseScope)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = {
                    path: relativeItemPath,
                    url: item.url,
                    createdAt: item.created_at,
                    title: item.title,
                    tags: item.tags.map(tag => tag.name),
                    groups: item.groups,
                    scope: item.scope,
                    domain,
                    digest: targetFile.getDigestSync(),
                  }
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return docbaseService.updateItem(domain, itemId, title, fileBody, tags, groups, docbaseScope)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.id].createdAt = item.created_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].groups = item.groups
                itemsConfig[item.id].scope = item.scope
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                return Promise.resolve()
              })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.docbase.items = itemsConfig
        configFile.write(JSON.stringify(config, null, 2)).then(() => {
          console.log('Config file saved.')
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in DocBaseService: ', error)
      })
    })
  }
}
