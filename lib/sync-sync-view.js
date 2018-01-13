'use babel';
/** @jsx etch.dom */

const etch = require('etch')

export default class SyncSyncView {
  constructor (properties) {
    this.properties = properties || {}
    etch.initialize(this)
  }

  render () {
    return (
      <div className="sync-sync">
        <h1>Sync-Sync Import/Export</h1>
        <section className="qiita">
          <h2>Sync with Qiita</h2>
          <form>
            <label for="qiita-access-token">AccessToken</label>
            <input type="text" id="qiita-access-token" value={this.properties.qiitaAccessToken || ''} /><br/>
            <label for="qiita-user-name">UserName</label>
            <input type="text" id="qiita-user-name" value={this.properties.qiitaUserName || ''} /><br/>
            <label for="qiita-local">Local</label>
            <input type="text" id="qiita-local" value={this.properties.qiitaLocal || ''} /><br/>
            <button id="qiita-import" on={{click: this.importFromQiita}}>Import</button>
            <button id="qiita-export" on={{click: this.exportToQiita}}>Export</button>
          </form>
        </section>
      </div>
    )
  }

  update (newProperties) {
    this.properties = newProperties
    return etch.update(this)
  }

  async destroy() {
    await etch.destroy(this)
  }

  getElement() {
    return this.element
  }

  importFromQiita (event) {
    console.log("Start importing from Qiita.")
  }

  exportToQiita (event) {
    console.log("Start exporting to Qiita.")
  }
}
