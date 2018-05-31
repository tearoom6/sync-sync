'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase, { SyncType } from './section-view-base'
import MediumService from '../../services/medium-service'
import Config, { MatchType } from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'

export default class MediumSectionView extends SectionViewBase {
  static show(props, tabIndex) {
    return (
      <MediumSectionView
        startTabIndex={tabIndex}
        localPath={props.localPath}
        configDirPath={props.configDirPath}
        optionKeepFilePath={props.optionKeepFilePath}
        mediumAccessToken={props.mediumAccessToken}
        mediumTitle={props.mediumTitle}
        mediumTags={props.mediumTags}
        mediumStatus={props.mediumStatus}
        mediumItemUrl={props.mediumItemUrl}
      />
    )
  }

  render() {
    return (
      <section className="medium service accordion">
        <input
          id="medium-accordion"
          type="checkbox"
          className="label"
          name="medium-accordion"
          defaultChecked={this.props.mediumAccessToken != null}
        />
        <label htmlFor="medium-accordion" className="label">
          <h2>Medium</h2>
        </label>

        <div className="content">
          <label htmlFor="medium-access-token">
            <span>AccessToken</span>
            <input
              type="text"
              id="medium-access-token"
              ref="mediumAccessToken"
              value={this.props.mediumAccessToken || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <h3>
            Item properties&nbsp;
            <a
              href={this.props.mediumItemUrl || ''}
              style={{ visibility: this.props.mediumItemUrl ? 'visible' : 'hidden' }}
              tabIndex={this.props.mediumItemUrl ? this.props.startTabIndex++ : 0}
            >
              <span role="img" aria-label="Link">
                🔗
              </span>
            </a>
          </h3>

          <label htmlFor="medium-title">
            <span>Title</span>
            <input
              type="text"
              id="medium-title"
              ref="mediumTitle"
              value={this.props.mediumTitle || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="medium-tags">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              id="medium-tags"
              ref="mediumTags"
              value={this.props.mediumTags || ''}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            />
          </label>
          <br />

          <label htmlFor="medium-status">
            <span>Status</span>
            <select
              id="medium-status"
              ref="mediumStatus"
              value={this.props.mediumStatus || 'public'}
              on={{ change: this.optionChanged }}
              tabIndex={this.props.startTabIndex++}
            >
              <option value="public">public</option>
              <option value="draft">draft</option>
              <option value="unlisted">unlisted</option>
            </select>
          </label>
          <br />

          {
          // Import API is not provided in Medium.
          // <button id="medium-import" on={{ click: this.importFromMedium }} tabIndex={this.props.startTabIndex++}>
          //   Import
          // </button>
          }
          <button id="medium-export" on={{ click: this.exportToMedium }} tabIndex={this.props.startTabIndex++}>
            Create
          </button>
        </div>
      </section>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      mediumAccessToken: this.refs.mediumAccessToken.value,
      mediumTitle: this.refs.mediumTitle.value,
      mediumTags: this.refs.mediumTags.value,
      mediumStatus: this.refs.mediumStatus.value,
    })
  }

  importFromMedium(event) {
    this.handleMediumEvent(event, SyncType.import)
  }

  exportToMedium(event) {
    this.handleMediumEvent(event, SyncType.export)
  }

  handleMediumEvent(event, type = SyncType.import) {
    try {
      console.log(`Start Medium: ${type}`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.mediumAccessToken.value
      const mediumTitle = this.refs.mediumTitle.value
      const mediumTags = this.refs.mediumTags.value
      const mediumStatus = this.refs.mediumStatus.value
      MediumSectionView.startHandlingMediumEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        mediumTitle,
        mediumTags,
        mediumStatus,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred: ${type}`, error)
    }
  }

  static startHandlingMediumEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    mediumTitle,
    mediumTags,
    mediumStatus,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
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

    const loadConfigPromise = Config.load(configFile).then(config => config)
    const loadSecretConfigPromise = Config.load(secretConfigFile).then(config => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp(Services.medium, 'accessToken', accessToken)
      } else {
        config.deleteProp(Services.medium, 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise])
      .then(configs => {
        const [config, secretConfig] = configs
        const itemsConfig = config.prop(Services.medium, 'items') || {}

        const mediumService = new MediumService(accessToken)
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
          handledProcess = mediumService.listAllItems(items => {
            // Set total progress.
            totalProgress += items.length
            if (modalView) modalView.update({ totalProgress })
            // Save files.
            const fileSaveProcesses = []
            items.forEach(item => {
              const filePath = this.resolveMediumItemPath(localPath, configDir.getPath(), item, itemsConfig[item.id], optionKeepFilePath)
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

              itemsConfig[item.id] = itemsConfig[item.id] || {}
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = item.url
              itemsConfig[item.id].publishedAt = new Date(item.publishedAt)
              itemsConfig[item.id].title = item.title
              itemsConfig[item.id].authorId = item.authorId
              itemsConfig[item.id].tags = item.tags
              itemsConfig[item.id].status = item.publishStatus
              itemsConfig[item.id].license = item.license

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
            const { itemId } = config.findItemByPath(Services.medium, localPath, MatchType.exceptExport)
            if (!itemId) {
              atom.notifications.addError('Not synced file cannot be imported.')
              return Promise.reject()
            }

            // Call get API.
            handledProcess = mediumService.getItem(itemId).then(item => {
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
                itemsConfig[item.id].publishedAt = new Date(item.publishedAt)
                itemsConfig[item.id].title = item.title
                itemsConfig[item.id].authorId = item.authorId
                itemsConfig[item.id].tags = item.tags
                itemsConfig[item.id].status = item.publishStatus
                itemsConfig[item.id].license = item.license
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
              let title = mediumTitle
              if (!title || title === '') {
                title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
              }
              let format = 'markdown'
              if (targetFile.getBaseName().endsWith('.html') || targetFile.getBaseName().endsWith('.htm')) {
                format = 'html'
              }
              const { itemId } = config.findItemByPath(Services.medium, localPath, MatchType.exceptImport)
              const tags = mediumTags.split(',').map(tag => tag.trim())
              if (!itemId) {
                // In case of posting.
                // Call post API.
                return mediumService.postItem(title, fileBody, tags, format, mediumStatus).then(item => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || {}
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = item.url
                  itemsConfig[item.id].publishedAt = new Date(item.publishedAt)
                  itemsConfig[item.id].title = item.title
                  itemsConfig[item.id].authorId = item.authorId
                  itemsConfig[item.id].tags = item.tags
                  itemsConfig[item.id].status = item.publishStatus
                  itemsConfig[item.id].license = item.license
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
              }

              // In case of updating.
              // Call update API.
              // TODO: - updateItem API is not provided in Medium.
              atom.notifications.addError('Update operation is not provided to Medium.')
              return Promise.reject()
              // return mediumService.updateItem(itemId, title, fileBody, tags, format, mediumStatus).then(item => {
              //   // Save meta data to config.
              //   itemsConfig[item.id].publishedAt = new Date(item.publishedAt)
              //   itemsConfig[item.id].title = item.title
              //   itemsConfig[item.id].authorId = item.authorId
              //   itemsConfig[item.id].tags = item.tags
              //   itemsConfig[item.id].status = item.publishStatus
              //   itemsConfig[item.id].license = item.license
              //   itemsConfig[item.id].digest = targetFile.getDigestSync()
              //   // Update progress (100%).
              //   if (modalView) modalView.update({ currentProgress: 100 })
              //   return Promise.resolve()
              // })
            })
          }
        }

        handledProcess
          .then(() => {
            // Save meta data to config.
            config.setProp(Services.medium, 'items', itemsConfig)
            Promise.all([config.save(), secretConfig.save()]).then(() => {
              console.log('Config files saved.')
              if (progressModal) progressModal.destroy()
              atom.notifications.addSuccess('Completed!')
            })
          })
          .catch(error => {
            // Handle error.
            atom.notifications.addError('Something went wrong.')
            console.error('Error occurred in MediumService: ', error)
            if (progressModal) progressModal.destroy()
          })
        return Promise.resolve()
      })
      .catch(error => {
        console.error('Error occurred in MediumService: ', error)
        if (progressModal) progressModal.destroy()
      })
  }

  static resolveMediumItemPath(localPath, configPath, item, currentItem, optionKeepFilePath) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    return `${localPath}/${this.escapeFileName(item.title)}.html`
  }
}
