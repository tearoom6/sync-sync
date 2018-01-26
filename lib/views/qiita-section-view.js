'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import QiitaService from '../services/qiita-service'

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
      const { localPath, configPath } = this.props
      const accessToken = this.refs.qiitaAccessToken.value
      const userName = this.refs.qiitaUserName.value
      const qiitaTitle = this.refs.qiitaTitle.value
      const qiitaTags = this.refs.qiitaTags.value
      QiitaSectionView.startHandlingQiitaEvent(type, configPath, localPath, accessToken, userName, qiitaTitle, qiitaTags)
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingQiitaEvent(type, configPath, localPath, accessToken, userName, qiitaTitle, qiitaTags) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    if (type === 'export' && qiitaTags === '') {
      atom.notifications.addError('Need to specify tag in exporting.')
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
      config.qiita = config.qiita || {}
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.qiita.accessToken = accessToken
      } else {
        delete config.qiita.accessToken
      }
      config.qiita.userName = userName
      const itemsConfig = config.qiita.items || {}

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
          return
        }

        //
        // 1-b. In case of importing.
        //

        // Call listing API.
        handledProcess = qiitaService.listAllItems(userName)
          .then((items) => {
            // Save files.
            const fileSaveProcesses = []
            items.forEach((item) => {
              const file = new File(`${localPath}/${item.title}.md`)
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
                updatedAt: item.updated_at,
                title: item.title,
                tags: item.tags.map(tag => tag.name),
                userName,
              }

              const fileSaveProcess = file.write(item.body).then(() => {
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
              return targetFile.write(item.body).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].updatedAt = item.updated_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
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
            let title = qiitaTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const itemId = Object.keys(itemsConfig)
              .find(key => itemsConfig[key].path === relativeItemPath)
            const tags = qiitaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return qiitaService.postItem(title, fileBody, tags)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = {
                    path: relativeItemPath,
                    url: item.url,
                    updatedAt: item.updated_at,
                    title: item.title,
                    tags: item.tags.map(tag => tag.name),
                    userName,
                    digest: targetFile.getDigestSync(),
                  }
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
                return Promise.resolve()
              })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.qiita.items = itemsConfig
        configFile.write(JSON.stringify(config, null, 2)).then(() => {
          console.log('Config file saved.')
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in QiitaService: ', error)
      })
    })
  }
}