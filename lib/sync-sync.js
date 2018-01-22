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

      // Find project directory.
      const [projectPath, relativeLocalPath] = atom.project.relativizePath(localPath)
      console.log(projectPath, relativeLocalPath)
      if (!projectPath) {
        atom.notifications.addError('Cannot find projectPath.')
        return false
      }

      // Find config file.
      let configFile = ConfigUtil.findConfigFile(localPath)
      if (!configFile) {
        // Create new config file.
        configFile = new File(`${projectPath}/${ConfigUtil.getConfigBaseName()}`)
        configFile.create().then((isCreated) => {
          configFile.writeSync('{}')
          console.log(`Config file is created: ${configFile.getPath()}`)
        })
      } else {
        // Load default value.
        configFile.read().then((configBody) => {
          const config = JSON.parse(configBody)
          const qiitaConfig = config.qiita || {}
          this.syncSyncView.update({
            qiitaAccessToken: qiitaConfig.accessToken,
            qiitaUserName: qiitaConfig.userName,
          })
        })
      }
      this.syncSyncView.update({ localPath, projectPath, configPath: configFile.getPath() })

      // Open main view.
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
