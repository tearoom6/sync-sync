'use babel'

import { CompositeDisposable, File } from 'atom'
import ConfigUtil from './utils/config-util'
import SyncSyncView from './views/sync-sync-view'

export default {
  config: {
    keepSecrets: {
      title: 'Whether or not to save secrets info',
      type: 'boolean',
      default: true,
      order: 1,
    },
  },

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
          const esaConfig = config.esa || {}
          const docbaseConfig = config.docbase || {}
          this.syncSyncView.update({
            qiitaAccessToken: qiitaConfig.accessToken,
            qiitaUserName: qiitaConfig.userName,
            qiitaItemUrl: null,
            esaAccessToken: esaConfig.accessToken,
            esaTeamName: esaConfig.teamName,
            esaItemUrl: null,
            docbaseAccessToken: docbaseConfig.accessToken,
            docbaseDomain: docbaseConfig.domain,
            docbaseItemUrl: null,
          })
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
