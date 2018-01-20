'use babel'

import SyncSyncView from './views/sync-sync-view'
import { CompositeDisposable } from 'atom'

export default {

  syncSyncView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.syncSyncView = new SyncSyncView({})
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.syncSyncView.getElement(),
      visible: false,
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sync-sync:toggle': (event) => { this.toggle(event) },
    }))
  },

  deactivate() {
    this.modalPanel.destroy()
    this.subscriptions.dispose()
    this.syncSyncView.destroy()
  },

  serialize() {
    return {
    }
  },

  toggle(event) {
    console.log('SyncSync was toggled!', event)
    try {
      // Receive local path if exists.
      const { target } = event
      const localPath = target.dataset.path
      console.log(`Local path is ${localPath}`)
      this.syncSyncView.update({ qiitaLocalPath: localPath })

      return (
        this.modalPanel.isVisible() ? this.modalPanel.hide() : this.modalPanel.show()
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in toggle method: ', error)
    }
    return false
  },

}
