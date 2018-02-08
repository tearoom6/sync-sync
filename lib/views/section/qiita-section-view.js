'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import QiitaService from '../../services/qiita-service'
import Config from '../../models/config'
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
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.qiitaItemUrl || ''}
            style={{ visibility: (this.props.qiitaItemUrl === null) ? 'hidden' : 'visible' }}
            tabIndex={(this.props.qiitaItemUrl === null) ? 0 : this.props.startTabIndex++}
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
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="qiita-tags">
          <span>Tags</span>
          <input
            type="text"
            id="qiita-tags"
            ref="qiitaTags"
            value={this.props.qiitaTags || ''}
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

  importFromQiita(event) {
    this.handleQiitaEvent(event, 'import')
  }

  exportToQiita(event) {
    this.handleQiitaEvent(event, 'export')
  }

  handleQiitaEvent(event, type = 'import') {
    try {
      console.log(`Start Qiita ${type}.`)
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
      console.error(`Error occurred in ${type}: `, error)
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

    if (type === 'export' && qiitaTags === '') {
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
      config.setProp('qiita', 'userName', userName)
      // TODO For legacy implementation. To be removed.
      config.deleteProp('qiita', 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('qiita', 'accessToken', accessToken)
      } else {
        config.deleteProp('qiita', 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('qiita', 'items') || {}

      const qiitaService = new QiitaService(accessToken)
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
        let totalProgress = 0
        let currentProgress = 0
        handledProcess = qiitaService.listAllItems(userName, (items) => {
          // Set total progress.
          totalProgress += items.length
          if (modalView) modalView.update({ totalProgress })
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
                // Update progress.
                if (modalView) modalView.update({ currentProgress: currentProgress++ })
                return
              }
            }

            itemsConfig[item.id] = {
              path: config.relativizeItemPath(file.getPath()),
              url: item.url,
              updatedAt: item.updated_at,
              title: item.title,
              tags: item.tags.map(tag => tag.name),
              userName,
            }

            const fileSaveProcess = file.write(this.normalizeNewLine(item.body)).then(() => {
              console.log('File saved: ', file.getPath())
              itemsConfig[item.id].digest = file.getDigestSync()
              // Update progress.
              if (modalView) modalView.update({ currentProgress: currentProgress++ })
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
        if (type === 'import') {
          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('qiita', localPath)
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
            const { itemId } = config.findItemByPath('qiita', localPath)
            const tags = qiitaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return qiitaService.postItem(title, fileBody, tags)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = {
                    path: config.relativizeItemPath(localPath),
                    url: item.url,
                    updatedAt: item.updated_at,
                    title: item.title,
                    tags: item.tags.map(tag => tag.name),
                    userName,
                    digest: targetFile.getDigestSync(),
                  }
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
        config.setProp('qiita', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess(`${type} completed!`)
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
}
