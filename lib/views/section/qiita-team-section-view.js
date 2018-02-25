'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import QiitaTeamService from '../../services/qiita-team-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'

export default class QiitaTeamSectionView extends SectionViewBase {
  constructor(props) {
    super(props)
    this.currentTeamId = null
  }

  render() {
    return (
      <section className="qiita-team service">
        <h2>Sync with Qiita:Team</h2>

        <label htmlFor="qiita-team-access-token">
          <span>AccessToken</span>
          <input
            type="text"
            id="qiita-team-access-token"
            ref="qiitaTeamAccessToken"
            value={this.props.qiitaTeamAccessToken || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label>
        <br />

        <label htmlFor="qiita-team-team-id">
          <span>TeamId</span>
          <input
            type="text"
            id="qiita-team-team-id"
            ref="qiitaTeamTeamId"
            value={this.props.qiitaTeamTeamId || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label>
        <br />

        <label htmlFor="qiita-team-user-name">
          <span>UserName</span>
          <input
            type="text"
            id="qiita-team-user-name"
            ref="qiitaTeamUserName"
            value={this.props.qiitaTeamUserName || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label>
        <br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.qiitaTeamItemUrl || ''}
            style={{ visibility: this.props.qiitaTeamItemUrl ? 'visible' : 'hidden' }}
            tabIndex={this.props.qiitaTeamItemUrl ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">
              🔗
            </span>
          </a>
        </h3>

        <label htmlFor="qiita-team-title">
          <span>Title</span>
          <input
            type="text"
            id="qiita-team-title"
            ref="qiitaTeamTitle"
            value={this.props.qiitaTeamTitle || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label>
        <br />

        <label htmlFor="qiita-team-tags">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            id="qiita-team-tags"
            ref="qiitaTeamTags"
            value={this.props.qiitaTeamTags || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label>
        <br />

        <label htmlFor="qiita-team-group-id">
          <span>Group</span>
          <select
            id="qiita-team-group-id"
            ref="qiitaTeamGroupId"
            value={this.props.qiitaTeamGroupId || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          >
            {(this.props.qiitaTeamGroups || [])
              .concat({ url_name: '', name: '(no group)' }) // Add default group.
              .map(group => (
                <option value={group.url_name} selected={group.url_name === this.props.qiitaTeamGroupId}>
                  {group.name}
                </option>
              ))}
          </select>
        </label>
        <br />

        <label htmlFor="qiita-team-coediting">
          <input
            type="checkbox"
            id="qiita-team-coediting"
            name="qiitaTeamCoediting"
            ref="qiitaTeamCoediting"
            checked={this.props.qiitaTeamCoediting || false}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
          &nbsp;Co-editing (If you once make it co-editing, it cannot be reverted)
        </label>
        <br />

        <button id="qiita-team-import" on={{ click: this.importFromQiitaTeam }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="qiita-team-export" on={{ click: this.exportToQiitaTeam }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.qiitaTeamAccessToken || this.props.qiitaTeamAccessToken
    // Fetch belonging groups when teamId modified.
    if (newProps.qiitaTeamTeamId && newProps.qiitaTeamTeamId !== this.currentTeamId) {
      const qiitaTeamService = new QiitaTeamService(newProps.qiitaTeamTeamId, accessToken)
      qiitaTeamService.listGroups().then(groups => {
        this.currentTeamId = newProps.qiitaTeamTeamId
        super.update({
          qiitaTeamGroups: groups,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      qiitaTeamAccessToken: this.refs.qiitaTeamAccessToken.value,
      qiitaTeamTeamId: this.refs.qiitaTeamTeamId.value,
      qiitaTeamUserName: this.refs.qiitaTeamUserName.value,
      qiitaTeamTitle: this.refs.qiitaTeamTitle.value,
      qiitaTeamTags: this.refs.qiitaTeamTags.value,
      qiitaTeamGroupId: this.refs.qiitaTeamGroupId.value,
      qiitaTeamCoediting: this.refs.qiitaTeamCoediting.checked,
    })
  }

  importFromQiitaTeam(event) {
    this.handleQiitaTeamEvent(event, SyncType.import)
  }

  exportToQiitaTeam(event) {
    this.handleQiitaTeamEvent(event, SyncType.export)
  }

  handleQiitaTeamEvent(event, type = SyncType.import) {
    try {
      console.log(`Start QiitaTeam: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.qiitaTeamAccessToken.value
      const teamId = this.refs.qiitaTeamTeamId.value
      const userName = this.refs.qiitaTeamUserName.value
      const qiitaTeamTitle = this.refs.qiitaTeamTitle.value
      const qiitaTeamTags = this.refs.qiitaTeamTags.value
      const qiitaTeamGroupId = this.refs.qiitaTeamGroupId.value
      const qiitaTeamCoediting = this.refs.qiitaTeamCoediting.checked
      QiitaTeamSectionView.startHandlingQiitaTeamEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        teamId,
        userName,
        qiitaTeamTitle,
        qiitaTeamTags,
        qiitaTeamGroupId,
        qiitaTeamCoediting
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingQiitaTeamEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    teamId,
    userName,
    qiitaTeamTitle,
    qiitaTeamTags,
    qiitaTeamGroupId,
    qiitaTeamCoediting
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    if (type === SyncType.export && qiitaTeamTags === '') {
      atom.notifications.addError('Need to specify tag in exporting.')
      return
    }

    // Load config files.
    const configDir = new Directory(configDirPath)
    if (!configDir.existsSync()) {
      atom.notifications.addError(`Cannot find config directory: ${configDir.getPath()}`)
      return
    }
    const configFile = new File(`${configDirPath}/${ConfigUtil.getConfigBaseName()}`)
    const secretConfigFile = new File(`${configDirPath}/${ConfigUtil.getSecretConfigBaseName()}`)

    const loadConfigPromise = Config.load(configFile).then(config => {
      config.setProp(Services.qiitaTeam, 'teamId', teamId)
      config.setProp(Services.qiitaTeam, 'userName', userName)
      // TODO For legacy implementation. To be removed.
      config.deleteProp(Services.qiitaTeam, 'accessToken')
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then(config => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.qiitaTeam, 'accessToken', accessToken)
      } else {
        config.deleteProp(Services.qiitaTeam, 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise])
      .then(configs => {
        const [config, secretConfig] = configs
        const itemsConfig = config.prop(Services.qiitaTeam, 'items') || {}

        const qiitaTeamService = new QiitaTeamService(teamId, accessToken)
        let handledProcess

        if (fs.isDirectorySync(localPath)) {
          //
          // 1. In case of selecting directory.
          //
          if (type === SyncType.export) {
            //
            // 1-a. In case of exporting.
            //
            atom.notifications.addError('You can only specify files in exporting.')
            return Promise.reject()
          }

          //
          // 1-b. In case of importing.
          //

          // Call listing API.
          let totalProgress = 0
          let currentProgress = 0
          handledProcess = qiitaTeamService.listAllItems(userName, items => {
            // Set total progress.
            totalProgress += items.length
            if (modalView) modalView.update({ totalProgress })
            // Save files.
            const fileSaveProcesses = []
            items.forEach(item => {
              const filePath = this.resolveQiitaTeamItemPath(localPath, configDir.getPath(), item, itemsConfig[item.id], optionKeepFilePath)
              const file = new File(filePath)
              if (file.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = itemsConfig[item.id] ? itemsConfig[item.id].digest : null
                if (file.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: file.getPath() })
                  // Update progress.
                  if (modalView) modalView.update({ currentProgress: ++currentProgress })
                  return
                }
              }

              itemsConfig[item.id] = itemsConfig[item.id] || { teamId, userName }
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = item.url
              itemsConfig[item.id].updatedAt = item.updated_at
              itemsConfig[item.id].title = item.title
              itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
              itemsConfig[item.id].group = item.group ? item.group.url_name : null
              itemsConfig[item.id].coediting = item.coediting

              const fileSaveProcess = file.write(this.normalizeNewLine(item.body)).then(() => {
                console.log('File saved: ', file.getPath())
                itemsConfig[item.id].digest = file.getDigestSync()
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return Promise.resolve()
              })
              fileSaveProcesses.push(fileSaveProcess)
            })
            return Promise.all(fileSaveProcesses)
          })
        } else if (fs.isFileSync(localPath)) {
          // Set total progress (100%).
          if (modalView) modalView.update({ totalProgress: 100 })

          //
          // 2. In case of selecting file.
          //
          const targetFile = new File(localPath)
          if (type === SyncType.import) {
            //
            // 2-a. In case of importing.
            //
            const { itemId } = config.findItemByPath(Services.qiitaTeam, localPath, MatchType.exceptExport)
            if (!itemId) {
              atom.notifications.addError('Not synced file cannot be imported.')
              return Promise.reject()
            }

            // Call get API.
            handledProcess = qiitaTeamService.getItem(itemId).then(item => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = itemsConfig[item.id] ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError('Cannot import because of not-synced local modification.', { detail: targetFile.getPath() })
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.body)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].updatedAt = item.updated_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].group = item.group ? item.group.url_name : null
                itemsConfig[item.id].coediting = item.coediting
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
          } else {
            //
            // 2-b. In case of exporting.
            //
            handledProcess = targetFile.read().then(fileBody => {
              let title = qiitaTeamTitle
              if (!title || title === '') {
                title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
              }
              const { itemId } = config.findItemByPath(Services.qiitaTeam, localPath, MatchType.exceptImport)
              const tags = qiitaTeamTags.split(',').map(tag => tag.trim())
              if (!itemId) {
                // In case of posting.
                // Call post API.
                return qiitaTeamService.postItem(title, fileBody, tags, qiitaTeamGroupId, qiitaTeamCoediting).then(item => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { teamId, userName }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].updatedAt = item.updated_at
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                  itemsConfig[item.id].group = item.group ? item.group.url_name : null
                  itemsConfig[item.id].coediting = item.coediting
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
              }

              // In case of updating.
              // Call update API.
              return qiitaTeamService.updateItem(itemId, title, fileBody, tags, qiitaTeamGroupId, qiitaTeamCoediting).then(item => {
                // Save meta data to config.
                itemsConfig[item.id].updatedAt = item.updated_at
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].group = item.group ? item.group.url_name : null
                itemsConfig[item.id].coediting = item.coediting
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
          }
        }

        handledProcess
          .then(() => {
            // Save meta data to config.
            config.setProp(Services.qiitaTeam, 'items', itemsConfig)
            Promise.all([config.save(), secretConfig.save()]).then(() => {
              console.log('Config files saved.')
              if (progressModal) progressModal.destroy()
              atom.notifications.addSuccess('Completed!')
            })
          })
          .catch(error => {
            // Handle error.
            atom.notifications.addError('Something went wrong.')
            console.error('Error occurred in QiitaTeamService: ', error)
            if (progressModal) progressModal.destroy()
          })
        return Promise.resolve()
      })
      .catch(error => {
        console.error('Error occurred in QiitaTeamService: ', error)
        if (progressModal) progressModal.destroy()
      })
  }

  static resolveQiitaTeamItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.md`
  }
}
