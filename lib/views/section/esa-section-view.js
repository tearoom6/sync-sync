'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import EsaService from '../../services/esa-service'
import Config from '../../models/config'
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
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.esaItemUrl || ''}
            style={{ visibility: (this.props.esaItemUrl === null) ? 'hidden' : 'visible' }}
            tabIndex={(this.props.esaItemUrl === null) ? 0 : this.props.startTabIndex++}
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
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="esa-tags">
          <span>Tags</span>
          <input
            type="text"
            id="esa-tags"
            ref="esaTags"
            value={this.props.esaTags || ''}
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

  importFromEsa(event) {
    this.handleEsaEvent(event, 'import')
  }

  exportToEsa(event) {
    this.handleEsaEvent(event, 'export')
  }

  handleEsaEvent(event, type = 'import') {
    try {
      console.log(`Start Esa ${type}.`)
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
      console.error(`Error occurred in ${type}: `, error)
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

    const progressModal = this.showProgressModal('Now Processing', 'Please wait for the process finished...')

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('esa', 'items') || {}

      const esaService = new EsaService(accessToken)
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
        handledProcess = esaService.listAllItems(teamName)
          .then((items) => {
            // Save files.
            const fileSaveProcesses = []
            items.forEach((item) => {
              // Use category as directory.
              let fileDirectory = ''
              if (item.category && item.category !== '') {
                fileDirectory = `${item.category}/`
              }
              let file = new File(`${localPath}/${item.title}.md`)
              if (optionKeepFilePath && itemsConfig[item.id]) {
                file = new File(`${configDir.getPath()}/${itemsConfig[item.id].path}`)
              }
              if (file.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.number]) ? itemsConfig[item.number].digest : null
                if (file.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: file.getPath() },
                  )
                  return
                }
              }

              itemsConfig[item.number] = {
                path: config.relativizeItemPath(file.getPath()),
                url: item.url,
                updatedAt: item.updated_at,
                title: item.name,
                tags: item.tags,
                category: item.category,
                revision: item.revision_number,
                wip: item.wip,
                message: item.message,
                teamName,
              }

              const fileSaveProcess = file.write(this.normalizeNewLine(item.body_md)).then(() => {
                console.log('File saved: ', file.getPath())
                itemsConfig[item.number].digest = file.getDigestSync()
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
          const { itemId } = config.findItemByPath('esa', localPath)
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
            const { itemId } = config.findItemByPath('esa', localPath)
            const tags = esaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return esaService.postItem(teamName, title, fileBody, tags, esaCategory)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.number] = {
                    path: config.relativizeItemPath(localPath),
                    url: item.url,
                    updatedAt: item.updated_at,
                    title: item.name,
                    tags: item.tags,
                    category: item.category,
                    revision: item.revision_number,
                    wip: item.wip,
                    message: item.message,
                    teamName,
                    digest: targetFile.getDigestSync(),
                  }
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
          atom.notifications.addSuccess(`${type} completed!`)
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
}
