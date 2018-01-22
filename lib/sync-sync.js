'use babel'

import ConfigUtil from './utils/config-util'
import SyncSyncView from './views/sync-sync-view'
import { CompositeDisposable, File } from 'atom'

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

      const [projectPath, relativeLocalPath] = atom.project.relativizePath(localPath)
      console.log(projectPath, relativeLocalPath)
      if (!projectPath) {
        atom.notifications.addError('Cannot find projectPath.')
        return false
      }
      let configFile = ConfigUtil.findConfigFile(localPath)
      if (!configFile) {
        configFile = new File(`${projectPath}/${ConfigUtil.getConfigBaseName()}`)
        configFile.create().then((isCreated) => {
          configFile.writeSync('{}')
          console.log(`Config file is created: ${configFile.getPath()}`)
        })
      }
      this.syncSyncView.update({ localPath, projectPath, configPath: configFile.getPath() })

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
