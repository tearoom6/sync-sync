'use babel'

/* global atom */

import { CompositeDisposable, File } from 'atom'
import Config from './models/config'
import Services from './models/services'
import ConfigUtil from './utils/config-util'
import SyncSyncView from './views/sync-sync-view'
import DeleteModalView from './views/modal/delete-modal-view'
import RenameModalView from './views/modal/rename-modal-view'

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
    confluenceFlatImport: {
      title: 'Flat directory on importing. (Confluence)',
      type: 'boolean',
      default: false,
      order: 3,
    },
  },

  syncSyncView: null,
  syncSyncViewItem: null,
  subscriptions: null,

  activate(state) {
    this.syncSyncView = new SyncSyncView({})
    this.syncSyncViewItem = {
      getTitle() {
        return 'Sync-Sync'
      },
      element: this.syncSyncView.getElement(),
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable.
    this.subscriptions = new CompositeDisposable()

    // Register commands.
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'sync-sync:openMainView': event => {
          this.openMainView(event)
        },
        'sync-sync:rename': event => {
          this.rename(event)
        },
        'sync-sync:delete': event => {
          this.delete(event)
        },
        'sync-sync:openSettingsView': event => {
          this.openSettingsView(event)
        },
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose()
    this.syncSyncView.destroy()
  },

  serialize() {
    return {}
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
      let configDirPath = projectPath
      const configFile = ConfigUtil.findConfigFile(localPath)
      if (configFile) {
        configDirPath = configFile.getParent().getPath()
        // Load default value.
        Config.load(configFile).then(config => {
          this.syncSyncView.update({
            qiitaUserName: config.prop(Services.qiita, 'userName'),
            qiitaItemUrl: null,
            qiitaTeamTeamId: config.prop(Services.qiitaTeam, 'teamId'),
            qiitaTeamUserName: config.prop(Services.qiitaTeam, 'userName'),
            qiitaTeamItemUrl: null,
            esaTeamName: config.prop(Services.esa, 'teamName'),
            esaItemUrl: null,
            docbaseDomain: config.prop(Services.docbase, 'domain'),
            docbaseItemUrl: null,
            wordpressComSite: config.prop(Services.wordpressCom, 'site'),
            wordpressComItemUrl: null,
            wordpressOrgBaseUrl: config.prop(Services.wordpressOrg, 'baseUrl'),
            wordpressOrgItemUrl: null,
            confluenceUserName: config.prop(Services.confluence, 'userName'),
            confluenceBaseUrl: config.prop(Services.confluence, 'baseUrl'),
            confluenceSpace: config.prop(Services.confluence, 'space'),
            confluenceItemUrl: null,
            backlogSpaceKey: config.prop(Services.backlog, 'spaceKey'),
            backlogProjectId: config.prop(Services.backlog, 'projectId'),
            backlogItemUrl: null,
          })

          // TODO For legacy implementation. To be removed.
          const qiitaAccessToken = config.prop(Services.qiita, 'accessToken')
          if (qiitaAccessToken) this.syncSyncView.update({ qiitaAccessToken })
          const esaAccessToken = config.prop(Services.esa, 'accessToken')
          if (esaAccessToken) this.syncSyncView.update({ esaAccessToken })
          const docbaseAccessToken = config.prop(Services.docbase, 'accessToken')
          if (docbaseAccessToken) this.syncSyncView.update({ docbaseAccessToken })

          const qiitaItem = config.findItemByPath(Services.qiita, localPath).item
          if (qiitaItem) {
            this.syncSyncView.update({
              qiitaTitle: qiitaItem.title,
              qiitaTags: qiitaItem.tags.join(','),
              qiitaItemUrl: qiitaItem.url,
            })
          }
          const qiitaTeamItem = config.findItemByPath(Services.qiitaTeam, localPath).item
          if (qiitaTeamItem) {
            this.syncSyncView.update({
              qiitaTeamTitle: qiitaTeamItem.title,
              qiitaTeamTags: qiitaTeamItem.tags.join(','),
              qiitaTeamItemUrl: qiitaTeamItem.url,
              qiitaTeamGroupId: qiitaTeamItem.group,
              qiitaTeamCoediting: qiitaTeamItem.coediting,
            })
          }
          const esaItem = config.findItemByPath(Services.esa, localPath).item
          if (esaItem) {
            this.syncSyncView.update({
              esaTitle: esaItem.title,
              esaTags: esaItem.tags.join(','),
              esaCategory: esaItem.category,
              esaItemUrl: esaItem.url,
            })
          }
          const docbaseItem = config.findItemByPath(Services.docbase, localPath).item
          if (docbaseItem) {
            this.syncSyncView.update({
              docbaseTitle: docbaseItem.title,
              docbaseTags: docbaseItem.tags.join(','),
              docbaseGroups: docbaseItem.groups.map(group => group.id),
              docbaseScope: docbaseItem.scope,
              docbaseItemUrl: docbaseItem.url,
            })
          }
          const wordpressComItem = config.findItemByPath(Services.wordpressCom, localPath).item
          if (wordpressComItem) {
            this.syncSyncView.update({
              wordpressComTitle: wordpressComItem.title,
              wordpressComTags: wordpressComItem.tags.join(','),
              wordpressComCategories: wordpressComItem.categories.join(','),
              wordpressComItemUrl: wordpressComItem.url,
            })
          }
          const wordpressOrgItem = config.findItemByPath(Services.wordpressOrg, localPath).item
          if (wordpressOrgItem) {
            this.syncSyncView.update({
              wordpressOrgTitle: wordpressOrgItem.title,
              wordpressOrgTags: wordpressOrgItem.tags,
              wordpressOrgCategories: wordpressOrgItem.categories,
              wordpressOrgItemUrl: wordpressOrgItem.url,
            })
          }
          const confluenceItem = config.findItemByPath(Services.confluence, localPath).item
          if (confluenceItem) {
            this.syncSyncView.update({
              confluenceTitle: confluenceItem.title,
              confluenceParentId: confluenceItem.parentId,
              confluenceType: confluenceItem.type,
              confluenceFormat: confluenceItem.format,
              confluenceSpace: confluenceItem.space,
              confluenceItemUrl: confluenceItem.url,
            })
          }
          const backlogItem = config.findItemByPath(Services.backlog, localPath).item
          if (backlogItem) {
            this.syncSyncView.update({
              backlogProjectId: backlogItem.projectId,
              backlogTitle: backlogItem.title,
              backlogTags: backlogItem.tags.join(','),
              backlogItemUrl: backlogItem.url,
            })
          }
        })
      }

      // Find secret config file.
      const secretConfigFile = ConfigUtil.findSecretConfigFile(localPath)
      if (secretConfigFile) {
        // Load default value.
        Config.load(secretConfigFile).then(config => {
          this.syncSyncView.update({
            qiitaAccessToken: config.prop(Services.qiita, 'accessToken'),
            qiitaTeamAccessToken: config.prop(Services.qiitaTeam, 'accessToken'),
            esaAccessToken: config.prop(Services.esa, 'accessToken'),
            docbaseAccessToken: config.prop(Services.docbase, 'accessToken'),
            wordpressComAccessToken: config.prop(Services.wordpressCom, 'accessToken'),
            wordpressOrgAccessToken: config.prop(Services.wordpressOrg, 'accessToken'),
            confluenceAccessToken: config.prop(Services.confluence, 'accessToken'),
            backlogAccessToken: config.prop(Services.backlog, 'accessToken'),
          })
        })
      }

      const optionKeepFilePath = atom.config.get('sync-sync.keepFilePath')
      const confluenceFlatImport = atom.config.get('sync-sync.confluenceFlatImport')
      this.syncSyncView.update({
        localPath,
        projectPath,
        configDirPath,
        optionKeepFilePath,
        confluenceFlatImport,
      })

      // Open main view.
      const mainPane = atom.workspace.getPanes()[0]
      mainPane.addItem(this.syncSyncViewItem, { pending: true })
      mainPane.activateItem(this.syncSyncViewItem, { pending: true })
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in openMainView method: ', error)
      return false
    }
    return true
  },

  rename(event) {
    console.log('Call rename.', event)
    try {
      const targetPath = this.findSelectedPath(event)
      console.log(`Target path is ${targetPath}`)
      if (!targetPath) {
        atom.notifications.addError('targetPath must be selected.')
        return false
      }

      atom.workspace.addModalPanel({ item: new RenameModalView({ targetPath }).getElement() })
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in rename method: ', error)
      return false
    }
    return true
  },

  delete(event) {
    console.log('Call delete.', event)
    try {
      const targetPath = this.findSelectedPath(event)
      console.log(`Target path is ${targetPath}`)
      if (!targetPath) {
        atom.notifications.addError('targetPath must be selected.')
        return false
      }

      atom.workspace.addModalPanel({ item: new DeleteModalView({ targetPath }).getElement() })
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred in delete method: ', error)
      return false
    }
    return true
  },

  openSettingsView(event) {
    console.log('Try to open Sync-Sync settings view.', event)
    atom.workspace.open('atom://config/packages/sync-sync', { pending: false }).then(textEditor => {
      console.log('Opened Sync-Sync settings view:', textEditor.getTitle())
    })
    return true
  },

  findSelectedPath(event) {
    const { target } = event
    let localPath = target.dataset.path
    if (!localPath && target.children[0]) {
      localPath = target.children[0].dataset.path
    }
    return localPath
  },
}
