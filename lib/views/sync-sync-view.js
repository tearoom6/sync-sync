'use babel'

/** @jsx etch.dom */

import etch from 'etch'
import { File } from 'atom'
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

            <button id="qiita-import" on={{ click: this.importFromQiita }} tabIndex={6}>
              Import
            </button>
            <button id="qiita-export" on={{ click: this.exportToQiita }} tabIndex={7}>
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
    try {
      console.log('Start importing from Qiita.')
      const localPath = this.refs.localPath.value
      if (localPath === '') {
        atom.notifications.addError('LocalPath must be specified.')
        return
      }

      const accessToken = this.refs.qiitaAccessToken.value
      const userName = this.refs.qiitaUserName.value
      const projectPath = this.refs.projectPath.value
      const configPath = this.refs.configPath.value
      SyncSyncView.startImportFromQiita(configPath, localPath, accessToken, userName)
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in importFromQiita method: ', error)
    }
  }

  static startImportFromQiita(configPath, localPath, accessToken, userName) {
    const configFile = new File(configPath)
    configFile.read().then((configBody) => {
      const config = JSON.parse(configBody)
      config.qiita = config.qiita || {}
      config.qiita.accessToken = accessToken
      config.qiita.userName = userName

      const qiitaService = new QiitaService(accessToken)
      qiitaService.listAllItems(userName)
        .then((items) => {
          const itemsConfig = config.qiita.items || {}
          items.forEach((item) => {
            const file = new File(`${localPath}/${item.title}.md`)
            const [projectPath, relativeItemPath] = atom.project.relativizePath(file.getPath())
            itemsConfig[item.id] = {
              path: relativeItemPath,
              url: item.url,
              updatedAt: item.updated_at,
              userName,
            }

            file.write(item.body).then(() => {
              console.log('File saved: ', file.getPath())
            })
          })
          config.qiita.items = itemsConfig
          configFile.write(JSON.stringify(config)).then(() => {
            console.log('Config file saved.')
            atom.notifications.addSuccess('Importing completed!')
          })
        })
        .catch((error) => {
          atom.notifications.addError('Something went wrong.')
          console.error('Error occurred in qiitaService.listAllItems: ', error)
        })
    })
  }

  exportToQiita(event) {
    console.log('Start exporting to Qiita.')
  }
}
