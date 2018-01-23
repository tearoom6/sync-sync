'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import QiitaService from '../services/qiita-service'

export default class SyncSyncView {
  constructor(props) {
    this.props = props || {}
    etch.initialize(this)
  }

  render() {
    return (
      <div className="sync-sync native-key-bindings">
        <h1>Sync-Sync Import/Export</h1>

        <form>
          <label htmlFor="project-path">
            <span>ProjectPath</span>
            <input
              type="text"
              id="project-path"
              ref="projectPath"
              value={this.props.projectPath || ''}
              tabIndex={1}
            />
          </label><br />

          <label htmlFor="config-path">
            <span>ConfigPath</span>
            <input
              type="text"
              id="config-path"
              ref="configPath"
              value={this.props.configPath || ''}
              tabIndex={2}
            />
          </label><br />

          <label htmlFor="local-path">
            <span>LocalPath</span>
            <input
              type="text"
              id="local-path"
              ref="localPath"
              value={this.props.localPath || ''}
              tabIndex={3}
            />
          </label><br />

          <section className="qiita">
            <h2>Sync with Qiita</h2>

            <label htmlFor="qiita-access-token">
              <span>AccessToken</span>
              <input
                type="text"
                id="qiita-access-token"
                ref="qiitaAccessToken"
                value={this.props.qiitaAccessToken || ''}
                tabIndex={4}
              />
            </label><br />

            <label htmlFor="qiita-user-name">
              <span>UserName</span>
              <input
                type="text"
                id="qiita-user-name"
                ref="qiitaUserName"
                value={this.props.qiitaUserName || ''}
                tabIndex={5}
              />
            </label><br />

            <label htmlFor="qiita-tags">
              <span>Tags</span>
              <input
                type="text"
                id="qiita-tags"
                ref="qiitaTags"
                value={this.props.qiitaTags || ''}
                tabIndex={6}
              />
            </label><br />

            <button id="qiita-import" on={{ click: this.importFromQiita }} tabIndex={7}>
              Import
            </button>
            <button id="qiita-export" on={{ click: this.exportToQiita }} tabIndex={8}>
              Export
            </button>
          </section>

        </form>
      </div>
    )
  }

  update(newProps) {
    Object.entries(newProps).forEach(([key, newValue]) => {
      this.props[key] = newValue
    })
    return etch.update(this)
  }

  async destroy() {
    await etch.destroy(this)
  }

  getElement() {
    return this.element
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
      const localPath = this.refs.localPath.value
      const accessToken = this.refs.qiitaAccessToken.value
      const userName = this.refs.qiitaUserName.value
      const projectPath = this.refs.projectPath.value
      const configPath = this.refs.configPath.value
      const qiitaTags = this.refs.qiitaTags.value
      SyncSyncView.startHandlingQiitaEvent(type, configPath, localPath, accessToken, userName, qiitaTags)
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingQiitaEvent(type, configPath, localPath, accessToken, userName, qiitaTags) {
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
            items.forEach((item) => {
              const file = new File(`${localPath}/${item.title}.md`)
              const relativeItemPath = configDir.relativize(file.getPath())
              itemsConfig[item.id] = {
                path: relativeItemPath,
                url: item.url,
                updatedAt: item.updated_at,
                tags: item.tags.map(tag => tag.name),
                userName,
              }

              file.write(item.body).then(() => {
                console.log('File saved: ', file.getPath())
              })
            })
            return Promise.resolve()
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
              // Save file.
              itemsConfig[item.id].updatedAt = item.updated_at
              itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
              targetFile.write(item.body).then(() => {
                console.log('File saved: ', targetFile.getPath())
              })
              return Promise.resolve()
            })
        } else {
          //
          // 2-b. In case of exporting.
          //
          targetFile.read().then((fileBody) => {
            const relativeItemPath = configDir.relativize(localPath)
            const fileName = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            const itemId = Object.keys(itemsConfig)
              .find(key => itemsConfig[key].path === relativeItemPath)
            const tags = qiitaTags.split(',').map(tag => tag.trim())
            if (!itemId) {
              // In case of posting.
              // Call post API.
              handledProcess = qiitaService.postItem(fileName, fileBody, tags)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = {
                    path: relativeItemPath,
                    url: item.url,
                    updatedAt: item.updated_at,
                    tags: item.tags.map(tag => tag.name),
                    userName,
                  }
                  return Promise.resolve()
                })
            } else {
              // In case of updating.
              // Call update API.
              handledProcess = qiitaService.updateItem(itemId, fileName, fileBody, tags)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id].updatedAt = item.updated_at
                  itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                  return Promise.resolve()
                })
            }
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
