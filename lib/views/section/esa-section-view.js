'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import EsaService from '../../services/esa-service'
import Config, { MatchType } from '../../models/config'
import ConfigUtil from '../../utils/config-util'

export default class EsaSectionView extends SectionViewBase {
  render() {
    return (
      <section className="esa service">
        <h2>Sync with esa.io</h2>

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
        </label><br />

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
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.esaItemUrl || ''}
            style={{ visibility: (this.props.esaItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.esaItemUrl) ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">🔗</span>
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
        </label><br />

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
        </label><br />

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
        </label><br />

        <button id="esa-import" on={{ click: this.importFromEsa }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="esa-export" on={{ click: this.exportToEsa }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
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

  importFromEsa(event) {
    this.handleEsaEvent(event, SyncType.import)
  }

  exportToEsa(event) {
    this.handleEsaEvent(event, SyncType.export)
  }

  handleEsaEvent(event, type = SyncType.import) {
    try {
      console.log(`Start Esa: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.esaAccessToken.value
      const teamName = this.refs.esaTeamName.value
      const esaTitle = this.refs.esaTitle.value
      const esaTags = this.refs.esaTags.value
      const esaCategory = this.refs.esaCategory.value
      EsaSectionView.startHandlingEsaEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        teamName,
        esaTitle,
        esaTags,
        esaCategory,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingEsaEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    teamName,
    esaTitle,
    esaTags,
    esaCategory,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
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
      config.setProp('esa', 'teamName', teamName)
      // TODO For legacy implementation. To be removed.
      config.deleteProp('esa', 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('esa', 'accessToken', accessToken)
      } else {
        config.deleteProp('esa', 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('esa', 'items') || {}

      const esaService = new EsaService(accessToken)
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
        handledProcess = esaService.listAllItems(teamName, (items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })
          // Save files.
          const fileSaveProcesses = []
          items.forEach((item) => {
            const filePath = this.resolveEsaItemPath(
              localPath,
              configDir.getPath(),
              item,
              itemsConfig[item.number],
              optionKeepFilePath,
            )
            const file = new File(filePath)
            if (file.existsSync()) {
              // Check not-synced local modification.
              const syncedDigest = (itemsConfig[item.number]) ? itemsConfig[item.number].digest : null
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

            itemsConfig[item.number] = itemsConfig[item.number] || { teamName }
            itemsConfig[item.number].path = config.relativizeItemPath(file.getPath())
            itemsConfig[item.number].url = item.url
            itemsConfig[item.number].updatedAt = item.updated_at
            itemsConfig[item.number].title = item.name
            itemsConfig[item.number].tags = item.tags
            itemsConfig[item.number].category = item.category
            itemsConfig[item.number].revision = item.revision_number
            itemsConfig[item.number].wip = item.wip
            itemsConfig[item.number].message = item.message

            const fileSaveProcess = file.write(this.normalizeNewLine(item.body_md)).then(() => {
              console.log('File saved: ', file.getPath())
              itemsConfig[item.number].digest = file.getDigestSync()
              // Update progress.
              if (modalView) modalView.update({ currentProgress: ++currentProgress })
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
        if (type === SyncType.import) {
          // Set total progress (100%).
          if (modalView) modalView.update({ totalProgress: 100 })

          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('esa', localPath, MatchType.exceptExport)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
          }

          // Call get API.
          handledProcess = esaService.getItem(teamName, itemId)
            .then((item) => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.number]) ? itemsConfig[item.number].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: targetFile.getPath() },
                  )
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.body_md)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.number].updatedAt = item.updated_at
                itemsConfig[item.number].title = item.name
                itemsConfig[item.number].tags = item.tags
                itemsConfig[item.number].category = item.category
                itemsConfig[item.number].revision = item.revision_number
                itemsConfig[item.number].wip = item.wip
                itemsConfig[item.number].message = item.message
                itemsConfig[item.number].digest = targetFile.getDigestSync()
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
            let title = esaTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath('esa', localPath, MatchType.exceptImport)
            const tags = esaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return esaService.postItem(teamName, title, fileBody, tags, esaCategory)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.number] = itemsConfig[item.number] || { teamName }
                  itemsConfig[item.number].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.number].url = item.url
                  itemsConfig[item.number].updatedAt = item.updated_at
                  itemsConfig[item.number].title = item.name
                  itemsConfig[item.number].tags = item.tags
                  itemsConfig[item.number].category = item.category
                  itemsConfig[item.number].revision = item.revision_number
                  itemsConfig[item.number].wip = item.wip
                  itemsConfig[item.number].message = item.message
                  itemsConfig[item.number].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return esaService.updateItem(teamName, itemId, title, fileBody, tags, esaCategory)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.number].updatedAt = item.updated_at
                itemsConfig[item.number].title = item.name
                itemsConfig[item.number].tags = item.tags
                itemsConfig[item.number].category = item.category
                itemsConfig[item.number].revision = item.revision_number
                itemsConfig[item.number].wip = item.wip
                itemsConfig[item.number].message = item.message
                itemsConfig[item.number].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.setProp('esa', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess('Completed!')
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in EsaService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in EsaService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static resolveEsaItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    if (item.category && item.category !== '') {
      // Use category as directory.
      return `${localPath}/${item.category}/${item.name}.md`
    }
    return `${localPath}/${item.name}.md`
  }
}
