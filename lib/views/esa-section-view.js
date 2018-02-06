'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import EsaService from '../services/esa-service'

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
            tabIndex={this.props.startTabIndex++}
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
      const { localPath, configPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.esaAccessToken.value
      const teamName = this.refs.esaTeamName.value
      const esaTitle = this.refs.esaTitle.value
      const esaTags = this.refs.esaTags.value
      const esaCategory = this.refs.esaCategory.value
      EsaSectionView.startHandlingEsaEvent(
        type,
        configPath,
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
    configPath,
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

    // Load config file.
    const configFile = new File(configPath)
    if (!configFile.existsSync()) {
      atom.notifications.addError(`Cannot find config file: ${configPath}`)
      return
    }
    const configDir = configFile.getParent()
    configFile.read().then((configBody) => {
      const config = JSON.parse(configBody)
      config.esa = config.esa || {}
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.esa.accessToken = accessToken
      } else {
        delete config.esa.accessToken
      }
      config.esa.teamName = teamName
      const itemsConfig = config.esa.items || {}

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
          return
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

              const relativeItemPath = configDir.relativize(file.getPath())
              itemsConfig[item.number] = {
                path: relativeItemPath,
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
          const relativeItemPath = configDir.relativize(localPath)
          const itemId = Object.keys(itemsConfig)
            .find(key => itemsConfig[key].path === relativeItemPath)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return
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
            const relativeItemPath = configDir.relativize(localPath)
            let title = esaTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const itemId = Object.keys(itemsConfig)
              .find(key => itemsConfig[key].path === relativeItemPath)
            const tags = esaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return esaService.postItem(teamName, title, fileBody, tags, esaCategory)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.number] = {
                    path: relativeItemPath,
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
        config.esa.items = itemsConfig
        configFile.write(JSON.stringify(config, null, 2)).then(() => {
          console.log('Config file saved.')
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in EsaService: ', error)
      })
    })
  }
}
