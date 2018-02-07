'use babel'

import { CompositeDisposable, File } from 'atom'
import Config from './models/config'
import ConfigUtil from './utils/config-util'
import SyncSyncView from './views/sync-sync-view'

export default {
  config: {
    keepSecrets: {
      title: 'Save secrets info.',
      type: 'boolean',
      default: true,
      order: 1,
    },
    keepFilePath: {
      title: 'Keep file path on importing.',
      type: 'boolean',
      default: true,
      order: 2,
    },
  },

  syncSyncView: null,
  syncSyncViewItem: null,
  subscriptions: null,

  activate(state) {
    this.syncSyncView = new SyncSyncView({})
    this.syncSyncViewItem = {
      getTitle() { return 'Sync-Sync' },
      element: this.syncSyncView.getElement(),
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable.
    this.subscriptions = new CompositeDisposable()

    // Register commands.
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sync-sync:openMainView': (event) => { this.openMainView(event) },
      'sync-sync:rename': (event) => { this.rename(event) },
      'sync-sync:delete': (event) => { this.delete(event) },
      'sync-sync:openSettingsView': (event) => { this.openSettingsView(event) },
    }))
  },

  deactivate() {
    this.subscriptions.dispose()
    this.syncSyncView.destroy()
  },

  serialize() {
    return {
    }
  },

  openMainView(event) {
    console.log('Open Sync-Sync main view.', event)
    try {
      // Receive local path if exists.
      const localPath = this.findSelectedPath(event)
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
        configFile = ConfigUtil.createEmptyConfigFile(projectPath)
      } else {
        // Load default value.
        Config.load(configFile).then((config) => {
          this.syncSyncView.update({
            qiitaUserName: config.prop('qiita', 'userName'),
            qiitaItemUrl: null,
            esaTeamName: config.prop('esa', 'teamName'),
            esaItemUrl: null,
            docbaseDomain: config.prop('docbase', 'domain'),
            docbaseItemUrl: null,
          })

          // TODO For legacy implementation. To be removed.
          const qiitaAccessToken = config.prop('qiita', 'accessToken')
          if (qiitaAccessToken) this.syncSyncView.update({ qiitaAccessToken })
          const esaAccessToken = config.prop('esa', 'accessToken')
          if (esaAccessToken) this.syncSyncView.update({ esaAccessToken })
          const docbaseAccessToken = config.prop('docbase', 'accessToken')
          if (docbaseAccessToken) this.syncSyncView.update({ docbaseAccessToken })

          const qiitaItem = config.findItemByPath('qiita', localPath).item
          if (qiitaItem) {
            this.syncSyncView.update({
              qiitaTitle: qiitaItem.title,
              qiitaTags: qiitaItem.tags.join(','),
              qiitaItemUrl: qiitaItem.url,
            })
          }
          const esaItem = config.findItemByPath('esa', localPath).item
          if (esaItem) {
            this.syncSyncView.update({
              esaTitle: esaItem.title,
              esaTags: esaItem.tags.join(','),
              esaCategory: esaItem.category,
              esaItemUrl: esaItem.url,
            })
          }
          const docbaseItem = config.findItemByPath('docbase', localPath).item
          if (docbaseItem) {
            this.syncSyncView.update({
              docbaseTitle: docbaseItem.title,
              docbaseTags: docbaseItem.tags.join(','),
              docbaseGroups: docbaseItem.groups.map(group => group.id).join(','),
              docbaseScope: docbaseItem.scope,
              docbaseItemUrl: docbaseItem.url,
            })
          }
        })
      }

      // Find secret config file.
      let secretConfigFile = ConfigUtil.findSecretConfigFile(localPath)
      if (!secretConfigFile) {
        // Create new config file.
        secretConfigFile = ConfigUtil.createEmptySecretConfigFile(projectPath)
      } else {
        // Load default value.
        Config.load(secretConfigFile).then((config) => {
          const qiitaConfig = config.qiita || {}
          const esaConfig = config.esa || {}
          const docbaseConfig = config.docbase || {}
          this.syncSyncView.update({
            qiitaAccessToken: config.prop('qiita', 'accessToken'),
            esaAccessToken: config.prop('esa', 'accessToken'),
            docbaseAccessToken: config.prop('docbase', 'accessToken'),
          })
        })
      }

      const optionKeepFilePath = atom.config.get('sync-sync.keepFilePath')
      this.syncSyncView.update({
        localPath,
        projectPath,
        optionKeepFilePath,
        configDirPath: configFile.getParent().getPath(),
      })

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

  rename(event) {
    console.log('Call rename.', event)
    return true
  },

  delete(event) {
    console.log('Call delete.', event)
    return true
  },

  openSettingsView(event) {
    console.log('Try to open Sync-Sync settings view.', event)
    atom.workspace.open('atom://config/packages/sync-sync', { pending: false }).then((textEditor) => {
      console.log('Opened Sync-Sync settings view:', textEditor.getTitle())
    })
    return true
  },

  findSelectedPath(event) {
    const { target } = event
    let localPath = target.dataset.path
    if (localPath === null && target.children[0]) {
      localPath = target.children[0].dataset.path
    }
    return localPath
  },

}
