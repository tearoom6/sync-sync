'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import DocBaseService from '../../services/docbase-service'
import Config, { MatchType } from '../../models/config'
import ConfigUtil from '../../utils/config-util'

const docbaseScopes = ['everyone', 'group', 'private']

export default class DocBaseSectionView extends SectionViewBase {
  constructor(props) {
    super(props)
    this.currentDomain = props.docbaseDomain
  }

  render() {
    return (
      <section className="docbase service">
        <h2>Sync with DocBase</h2>

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
        </label><br />

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
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.docbaseItemUrl || ''}
            style={{ visibility: (this.props.docbaseItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.docbaseItemUrl) ? this.props.startTabIndex++ : 0}
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
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

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
        </label><br />

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
            {
              (this.props.docbaseBelongingGroups || [])
                .map(group => <option value={group.id} selected={(this.props.docbaseGroups || []).includes(group.id)}>{group.name}</option>)
            }
          </select>
        </label><br />

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

  update(newProps) {
    const accessToken = newProps.docbaseAccessToken || this.props.docbaseAccessToken
    // Fetch belonging groups when domain modified.
    if (newProps.docbaseDomain && newProps.docbaseDomain !== this.currentDomain) {
      const docbaseService = new DocBaseService(accessToken)
      docbaseService.listGroups(newProps.docbaseDomain).then((groups) => {
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

  importFromDocBase(event) {
    this.handleDocBaseEvent(event, SyncType.import)
  }

  exportToDocBase(event) {
    this.handleDocBaseEvent(event, SyncType.export)
  }

  handleDocBaseEvent(event, type = SyncType.import) {
    try {
      console.log(`Start DocBase: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.docbaseAccessToken.value
      const domain = this.refs.docbaseDomain.value
      const docbaseTitle = this.refs.docbaseTitle.value
      const docbaseTags = this.refs.docbaseTags.value
      const docbaseGroups = Array.from(this.refs.docbaseGroups.selectedOptions).map(option => option.value)
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
      console.error(`Error occurred: ${type}`, error)
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

    if (type === SyncType.export && !docbaseScopes.includes(docbaseScope)) {
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
    const secretConfigFile = new File(`${configDirPath}/${ConfigUtil.getSecretConfigBaseName()}`)

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

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('docbase', 'items') || {}

      const docbaseService = new DocBaseService(accessToken)
      let handledProcess

      if (fs.isDirectorySync(localPath)) {
        //
        // 1. In case of selecting directory.
        //
        if (type === SyncType.export) {
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
        let totalProgress = 0
        let currentProgress = 0
        handledProcess = docbaseService.listAllItems(domain, (items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })

          // Save files.
          const fileSaveProcesses = []
          items.forEach((item) => {
            const filePath = this.resolveDocBaseItemPath(
              localPath,
              configDir.getPath(),
              item,
              itemsConfig[item.id],
              optionKeepFilePath,
            )
            const file = new File(filePath)
            if (file.existsSync()) {
              // Check not-synced local modification.
              const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
              if (file.getDigestSync() !== syncedDigest) {
                atom.notifications.addError(
                  'Cannot import because of not-synced local modification.',
                  { detail: file.getPath() },
                )
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return
              }
            }

            itemsConfig[item.id] = itemsConfig[item.id] || { domain }
            itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
            itemsConfig[item.id].url = item.url
            itemsConfig[item.id].createdAt = item.created_at
            itemsConfig[item.id].title = item.title
            itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
            itemsConfig[item.id].groups = item.groups
            itemsConfig[item.id].scope = item.scope

            const fileSaveProcess = file.write(this.normalizeNewLine(item.body)).then(() => {
              console.log('File saved: ', file.getPath())
              itemsConfig[item.id].digest = file.getDigestSync()
              // Update progress.
              if (modalView) modalView.update({ currentProgress: ++currentProgress })
              return Promise.resolve()
            })
            fileSaveProcesses.push(fileSaveProcess)
          })
          return Promise.all(fileSaveProcesses)
        })
      } else if (fs.isFileSync(localPath)) {
        // Set total progress (100%).
        if (modalView) modalView.update({ totalProgress: 100 })

        //
        // 2. In case of selecting file.
        //
        const targetFile = new File(localPath)
        if (type === SyncType.import) {
          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('docbase', localPath, MatchType.exceptExport)
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
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
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
            const { itemId } = config.findItemByPath('docbase', localPath, MatchType.exceptImport)
            const tags = docbaseTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return docbaseService.postItem(domain, title, fileBody, tags, docbaseGroups, docbaseScope)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { domain }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].createdAt = item.created_at
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                  itemsConfig[item.id].groups = item.groups
                  itemsConfig[item.id].scope = item.scope
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return docbaseService.updateItem(domain, itemId, title, fileBody, tags, docbaseGroups, docbaseScope)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.id].createdAt = item.created_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].groups = item.groups
                itemsConfig[item.id].scope = item.scope
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
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
          atom.notifications.addSuccess('Completed!')
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in DocBaseService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in DocBaseService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static resolveDocBaseItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.md`
  }
}
