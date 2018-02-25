'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import QiitaService from '../../services/qiita-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'

export default class QiitaSectionView extends SectionViewBase {
  render() {
    return (
      <section className="qiita service">
        <h2>Sync with Qiita</h2>

        <label htmlFor="qiita-access-token">
          <span>AccessToken</span>
          <input
            type="text"
            id="qiita-access-token"
            ref="qiitaAccessToken"
            value={this.props.qiitaAccessToken || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="qiita-user-name">
          <span>UserName</span>
          <input
            type="text"
            id="qiita-user-name"
            ref="qiitaUserName"
            value={this.props.qiitaUserName || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.qiitaItemUrl || ''}
            style={{ visibility: (this.props.qiitaItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.qiitaItemUrl) ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">🔗</span>
          </a>
        </h3>

        <label htmlFor="qiita-title">
          <span>Title</span>
          <input
            type="text"
            id="qiita-title"
            ref="qiitaTitle"
            value={this.props.qiitaTitle || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="qiita-tags">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            id="qiita-tags"
            ref="qiitaTags"
            value={this.props.qiitaTags || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <button id="qiita-import" on={{ click: this.importFromQiita }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="qiita-export" on={{ click: this.exportToQiita }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      qiitaAccessToken: this.refs.qiitaAccessToken.value,
      qiitaUserName: this.refs.qiitaUserName.value,
      qiitaTitle: this.refs.qiitaTitle.value,
      qiitaTags: this.refs.qiitaTags.value,
    })
  }

  importFromQiita(event) {
    this.handleQiitaEvent(event, SyncType.import)
  }

  exportToQiita(event) {
    this.handleQiitaEvent(event, SyncType.export)
  }

  handleQiitaEvent(event, type = SyncType.import) {
    try {
      console.log(`Start Qiita: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.qiitaAccessToken.value
      const userName = this.refs.qiitaUserName.value
      const qiitaTitle = this.refs.qiitaTitle.value
      const qiitaTags = this.refs.qiitaTags.value
      QiitaSectionView.startHandlingQiitaEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        userName,
        qiitaTitle,
        qiitaTags,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingQiitaEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    userName,
    qiitaTitle,
    qiitaTags,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    if (type === SyncType.export && qiitaTags === '') {
      atom.notifications.addError('Need to specify tag in exporting.')
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
      config.setProp(Services.qiita, 'userName', userName)
      // TODO For legacy implementation. To be removed.
      config.deleteProp(Services.qiita, 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.qiita, 'accessToken', accessToken)
      } else {
        config.deleteProp(Services.qiita, 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop(Services.qiita, 'items') || {}

      const qiitaService = new QiitaService(accessToken)
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
        handledProcess = qiitaService.listAllItems(userName, (items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })
          // Save files.
          const fileSaveProcesses = []
          items.forEach((item) => {
            const filePath = this.resolveQiitaItemPath(
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

            itemsConfig[item.id] = itemsConfig[item.id] || { userName }
            itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
            itemsConfig[item.id].url = item.url
            itemsConfig[item.id].updatedAt = item.updated_at
            itemsConfig[item.id].title = item.title
            itemsConfig[item.id].tags = item.tags.map(tag => tag.name)

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
          const { itemId } = config.findItemByPath(Services.qiita, localPath, MatchType.exceptExport)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
          }

          // Call get API.
          handledProcess = qiitaService.getItem(itemId)
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
                itemsConfig[item.id].updatedAt = item.updated_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
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
            let title = qiitaTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath(Services.qiita, localPath, MatchType.exceptImport)
            const tags = qiitaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return qiitaService.postItem(title, fileBody, tags)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { userName }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].updatedAt = item.updated_at
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return qiitaService.updateItem(itemId, title, fileBody, tags)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.id].updatedAt = item.updated_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
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
        config.setProp(Services.qiita, 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess('Completed!')
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in QiitaService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in QiitaService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static resolveQiitaItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.md`
  }
}
