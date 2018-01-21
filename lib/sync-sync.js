'use babel'

import SyncSyncView from './views/sync-sync-view'
import { CompositeDisposable } from 'atom'

export default {

  syncSyncView: null,
  syncSyncViewItem: null,
  subscriptions: null,

  activate(state) {
    this.syncSyncView = new SyncSyncView({})
    this.syncSyncViewItem = {
      getTitle() { return 'SyncSync' },
      element: this.syncSyncView.getElement(),
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable.
    this.subscriptions = new CompositeDisposable()

    // Register command that opens the main view.
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sync-sync:openMainView': (event) => { this.openMainView(event) },
    }))
  },

  deactivate() {
    this.syncSyncViewItem.destroy()
    this.subscriptions.dispose()
    this.syncSyncView.destroy()
  },

  serialize() {
    return {
    }
  },

  openMainView(event) {
    console.log('Open SyncSync main view', event)
    try {
      // Receive local path if exists.
      const { target } = event
      let localPath = target.dataset.path
      if (localPath == null && target.children[0]) {
        localPath = target.children[0].dataset.path
      }
      console.log(`Local path is ${localPath}`)
      this.syncSyncView.update({ qiitaLocalPath: localPath })

      const mainPane = atom.workspace.getPanes()[0]
      mainPane.addItem(this.syncSyncViewItem, { pending: true })
      mainPane.activateItem(this.syncSyncViewItem, { pending: true })
      return true
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in openMainView method: ', error)
    }
    return false
  },

}
