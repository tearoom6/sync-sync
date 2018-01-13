'use babel';
/** @jsx etch.dom */

const etch = require('etch')

export default class SyncSyncView {
  constructor (properties) {
    this.properties = properties
    etch.initialize(this)
  }

  render () {
    return (
      <div className="sync-sync">
        <div className="message">
          The SyncSync package is Alive! It's ALIVE!
        </div>
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

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  getElement() {
    return this.element
  }
}
