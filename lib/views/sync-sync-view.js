'use babel'

/** @jsx etch.dom */

import etch from 'etch'
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

        <section className="qiita">
          <h2>Sync with Qiita</h2>
          <form>

            <label htmlFor="qiita-access-token">
              <span>AccessToken</span>
              <input
                type="text"
                id="qiita-access-token"
                ref="qiitaAccessToken"
                value={this.props.qiitaAccessToken || ''}
              />
            </label><br />

            <label htmlFor="qiita-user-name">
              <span>UserName</span>
              <input
                type="text"
                id="qiita-user-name"
                ref="qiitaUserName"
                value={this.props.qiitaUserName || ''}
              />
            </label><br />

            <label htmlFor="qiita-local-path">
              <span>Local</span>
              <input
                type="text"
                id="qiita-local-path"
                ref="qiitaLocalPath"
                value={this.props.qiitaLocalPath || ''}
              />
            </label><br />

            <button id="qiita-import" on={{ click: this.importFromQiita }}>Import</button>
            <button id="qiita-export" on={{ click: this.exportToQiita }}>Export</button>
          </form>
        </section>

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
    console.log('Start importing from Qiita.')
    const qiitaService = new QiitaService(this.refs.qiitaAccessToken.value)
    qiitaService.listAllItems(this.refs.qiitaUserName.value)
  }

  exportToQiita(event) {
    console.log('Start exporting to Qiita.')
  }
}
