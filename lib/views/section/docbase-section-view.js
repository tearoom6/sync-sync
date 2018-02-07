'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import DocBaseService from '../../services/docbase-service'
import Config from '../../models/config'
import ConfigUtil from '../../utils/config-util'

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
            tabIndex={(this.props.docbaseItemUrl === null) ? 0 : this.props.startTabIndex++}
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
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.docbaseAccessToken.value
      const domain = this.refs.docbaseDomain.value
      const docbaseTitle = this.refs.docbaseTitle.value
      const docbaseTags = this.refs.docbaseTags.value
      const docbaseGroups = this.refs.docbaseGroups.value
      const docbaseScope = this.refs.docbaseScope.value
      DocBaseSectionView.startHandlingDocBaseEvent(
        type,
        configDirPath,
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
    configDirPath,
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

    // Load config files.
    const configDir = new Directory(configDirPath)
    if (!configDir.existsSync()) {
      atom.notifications.addError(`Cannot find config directory: ${configDir.getPath()}`)
      return
    }
    const configFile = new File(`${configDirPath}/${ConfigUtil.getConfigBaseName()}`)
    if (!configFile.existsSync()) {
      atom.notifications.addError(`Cannot find config file: ${configFile.getPath()}`)
      return
    }
    const secretConfigFile = new File(`${configDirPath}/${ConfigUtil.getSecretConfigBaseName()}`)
    if (!secretConfigFile.existsSync()) {
      atom.notifications.addError(`Cannot find secret config file: ${secretConfigFile.getPath()}`)
      return
    }

    const loadConfigPromise = Config.load(configFile).then((config) => {
      config.setProp('docbase', 'domain', domain)
      // TODO For legacy implementation. To be removed.
      config.deleteProp('docbase', 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('docbase', 'accessToken', accessToken)
      } else {
        config.deleteProp('docbase', 'accessToken')
      }
      return config
    })

    const progressModal = this.showProgressModal('Now Processing', 'Please wait for the process finished...')

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('docbase', 'items')

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
          return Promise.reject()
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
                  return Promise.reject()
                }
              }

              itemsConfig[item.id] = {
                path: config.relativizeItemPath(file.getPath()),
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
          const { itemId } = config.findItemByPath('docbase', localPath)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
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
            let title = docbaseTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath('docbase', localPath)
            const tags = docbaseTags.split(',').map(tag => tag.trim())
            const groups = docbaseGroups.split(',').map(group => group.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return docbaseService.postItem(domain, title, fileBody, tags, groups, docbaseScope)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = {
                    path: config.relativizeItemPath(localPath),
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
        config.setProp('docbase', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        return Promise.reject()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in DocBaseService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }
}
