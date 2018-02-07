'use babel'

import { CompositeDisposable, File } from 'atom'
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
        configFile.read().then((configBody) => {
          const config = JSON.parse(configBody)
          const qiitaConfig = config.qiita || {}
          const esaConfig = config.esa || {}
          const docbaseConfig = config.docbase || {}
          this.syncSyncView.update({
            qiitaUserName: qiitaConfig.userName,
            qiitaItemUrl: null,
            esaTeamName: esaConfig.teamName,
            esaItemUrl: null,
            docbaseDomain: docbaseConfig.domain,
            docbaseItemUrl: null,
          })

          // TODO For legacy implementation. To be removed.
          if (qiitaConfig.accessToken) {
            this.syncSyncView.update({ qiitaAccessToken: qiitaConfig.accessToken })
          }
          if (esaConfig.accessToken) {
            this.syncSyncView.update({ esaAccessToken: esaConfig.accessToken })
          }
          if (docbaseConfig.accessToken) {
            this.syncSyncView.update({ docbaseAccessToken: docbaseConfig.accessToken })
          }

          const relativeItemPath = configFile.getParent().relativize(localPath)
          if (qiitaConfig.items) {
            const qiitaItemId = Object.keys(qiitaConfig.items)
              .find(key => qiitaConfig.items[key].path === relativeItemPath)
            if (qiitaItemId) {
              this.syncSyncView.update({
                qiitaTitle: qiitaConfig.items[qiitaItemId].title,
                qiitaTags: qiitaConfig.items[qiitaItemId].tags.join(','),
                qiitaItemUrl: qiitaConfig.items[qiitaItemId].url,
              })
            }
          }
          if (esaConfig.items) {
            const esaItemId = Object.keys(esaConfig.items)
              .find(key => esaConfig.items[key].path === relativeItemPath)
            if (esaItemId) {
              this.syncSyncView.update({
                esaTitle: esaConfig.items[esaItemId].title,
                esaTags: esaConfig.items[esaItemId].tags.join(','),
                esaCategory: esaConfig.items[esaItemId].category,
                esaItemUrl: esaConfig.items[esaItemId].url,
              })
            }
          }
          if (docbaseConfig.items) {
            const docbaseItemId = Object.keys(docbaseConfig.items)
              .find(key => docbaseConfig.items[key].path === relativeItemPath)
            if (docbaseItemId) {
              this.syncSyncView.update({
                docbaseTitle: docbaseConfig.items[docbaseItemId].title,
                docbaseTags: docbaseConfig.items[docbaseItemId].tags.join(','),
                docbaseGroups: docbaseConfig.items[docbaseItemId].groups.map(group => group.id).join(','),
                docbaseScope: docbaseConfig.items[docbaseItemId].scope,
                docbaseItemUrl: docbaseConfig.items[docbaseItemId].url,
              })
            }
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
        secretConfigFile.read().then((configBody) => {
          const config = JSON.parse(configBody)
          const qiitaConfig = config.qiita || {}
          const esaConfig = config.esa || {}
          const docbaseConfig = config.docbase || {}
          this.syncSyncView.update({
            qiitaAccessToken: qiitaConfig.accessToken,
            esaAccessToken: esaConfig.accessToken,
            docbaseAccessToken: docbaseConfig.accessToken,
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
