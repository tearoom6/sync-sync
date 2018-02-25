'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import SectionViewBase from './section-view-base'
import BacklogService from '../../services/backlog-service'
import Config, { MatchType } from '../../models/config'
import ConfigUtil from '../../utils/config-util'

export default class BacklogSectionView extends SectionViewBase {
  constructor(props) {
    super(props)
    this.currentSpaceKey = null
  }

  render() {
    return (
      <section className="backlog service">
        <h2>Sync with Backlog</h2>

        <label htmlFor="backlog-access-token">
          <span>AccessToken</span>
          <input
            type="text"
            id="backlog-access-token"
            ref="backlogAccessToken"
            value={this.props.backlogAccessToken || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="backlog-space-key">
          <span>SpaceKey</span>
          <input
            type="text"
            id="backlog-space-key"
            ref="backlogSpaceKey"
            value={this.props.backlogSpaceKey || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="backlog-project-id">
          <span>Project</span>
          <select
            id="backlog-project-id"
            ref="backlogProjectId"
            value={this.props.backlogProjectId || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          >
            {
              (this.props.backlogProjects || [])
                .map(project =>
                  <option value={project.id} selected={project.id.toString() === this.props.backlogProjectId}>{project.name}</option>)
            }
          </select>
        </label><br />

        <h3>
          Item properties&nbsp;
          <a
            href={this.props.backlogItemUrl || ''}
            style={{ visibility: (this.props.backlogItemUrl) ? 'visible' : 'hidden' }}
            tabIndex={(this.props.backlogItemUrl) ? this.props.startTabIndex++ : 0}
          >
            <span role="img" aria-label="Link">🔗</span>
          </a>
        </h3>

        <label htmlFor="backlog-title">
          <span>Title</span>
          <input
            type="text"
            id="backlog-title"
            ref="backlogTitle"
            value={this.props.backlogTitle || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <label htmlFor="backlog-tags">
          <span>Tags (import only)</span>
          <input
            type="text"
            id="backlog-tags"
            ref="backlogTags"
            value={this.props.backlogTags || ''}
            on={{ change: this.optionChanged }}
            tabIndex={this.props.startTabIndex++}
          />
        </label><br />

        <button id="backlog-import" on={{ click: this.importFromBacklog }} tabIndex={this.props.startTabIndex++}>
          Import
        </button>
        <button id="backlog-export" on={{ click: this.exportToBacklog }} tabIndex={this.props.startTabIndex++}>
          Export
        </button>
      </section>
    )
  }

  update(newProps) {
    const accessToken = newProps.backlogAccessToken || this.props.backlogAccessToken
    // Fetch belonging projects when spaceKey modified.
    if (newProps.backlogSpaceKey && newProps.backlogSpaceKey !== this.currentSpaceKey) {
      const backlogService = new BacklogService(newProps.backlogSpaceKey, accessToken)
      backlogService.listProjects().then((projects) => {
        this.currentSpaceKey = newProps.backlogSpaceKey
        super.update({
          backlogProjects: projects,
        })
      })
    }
    return super.update(newProps)
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      backlogAccessToken: this.refs.backlogAccessToken.value,
      backlogSpaceKey: this.refs.backlogSpaceKey.value,
      backlogProjectId: this.refs.backlogProjectId.value,
      backlogTitle: this.refs.backlogTitle.value,
      backlogTags: this.refs.backlogTags.value,
    })
  }

  importFromBacklog(event) {
    this.handleBacklogEvent(event, 'import')
  }

  exportToBacklog(event) {
    this.handleBacklogEvent(event, 'export')
  }

  handleBacklogEvent(event, type = 'import') {
    try {
      console.log(`Start Backlog ${type}.`)
      const { localPath, configDirPath, optionKeepFilePath } = this.props
      const accessToken = this.refs.backlogAccessToken.value
      const spaceKey = this.refs.backlogSpaceKey.value
      const projectId = this.refs.backlogProjectId.value
      const selectedProject = this.props.backlogProjects.find(project => project.id.toString() === projectId)
      const backlogTitle = this.refs.backlogTitle.value
      const backlogTags = this.refs.backlogTags.value
      BacklogSectionView.startHandlingBacklogEvent(
        type,
        configDirPath,
        localPath,
        optionKeepFilePath,
        accessToken,
        spaceKey,
        selectedProject,
        backlogTitle,
        backlogTags,
      )
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error(`Error occurred in ${type}: `, error)
    }
  }

  static startHandlingBacklogEvent(
    type,
    configDirPath,
    localPath,
    optionKeepFilePath,
    accessToken,
    spaceKey,
    selectedProject,
    backlogTitle,
    backlogTags,
  ) {
    if (localPath === '') {
      atom.notifications.addError('LocalPath must be specified.')
      return
    }

    if (!selectedProject) {
      atom.notifications.addError('Project must be specified.')
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

    const loadConfigPromise = Config.load(configFile).then((config) => {
      config.setProp('backlog', 'spaceKey', spaceKey)
      return config
    })
    const loadSecretConfigPromise = Config.load(secretConfigFile).then((config) => {
      if (atom.config.get('sync-sync.keepSecrets')) {
        config.setProp('backlog', 'accessToken', accessToken)
      } else {
        config.deleteProp('backlog', 'accessToken')
      }
      return config
    })

    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    Promise.all([loadConfigPromise, loadSecretConfigPromise]).then((configs) => {
      const [config, secretConfig] = configs
      const itemsConfig = config.prop('backlog', 'items') || {}

      const backlogService = new BacklogService(spaceKey, accessToken)
      let handledProcess

      if (fs.isDirectorySync(localPath)) {
        //
        // 1. In case of selecting directory.
        //
        if (type === 'export') {
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
        let currentProgress = 0
        handledProcess = backlogService.listItems(selectedProject.id).then((listItems) => {
          // Set total progress.
          const totalProgress = listItems.length
          if (modalView) modalView.update({ totalProgress })

          // Save each file.
          const eachItemPromise = (listItem) => {
            const filePath = this.resolveBacklogItemPath(
              localPath,
              configDir.getPath(),
              listItem,
              itemsConfig[listItem.id],
              optionKeepFilePath,
              selectedProject,
            )
            const file = new File(filePath)
            if (file.existsSync()) {
              // Check not-synced local modification.
              const syncedDigest = (itemsConfig[listItem.id]) ? itemsConfig[listItem.id].digest : null
              if (file.getDigestSync() !== syncedDigest) {
                atom.notifications.addError(
                  'Cannot import because of not-synced local modification.',
                  { detail: file.getPath() },
                )
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return Promise.resolve()
              }
            }

            return backlogService.getItem(listItem.id).then((item) => {
              itemsConfig[item.id] = itemsConfig[item.id] || { spaceKey }
              itemsConfig[item.id].path = config.relativizeItemPath(file.getPath())
              itemsConfig[item.id].url = this.resolveBacklogItemUrl(spaceKey, selectedProject, item)
              itemsConfig[item.id].updatedAt = item.updated
              itemsConfig[item.id].title = item.name
              itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
              itemsConfig[item.id].projectId = item.projectId
              return file.write(this.normalizeNewLine(item.content)).then(() => {
                console.log('File saved: ', file.getPath())
                itemsConfig[item.id].digest = file.getDigestSync()
                // Update progress.
                if (modalView) modalView.update({ currentProgress: ++currentProgress })
                return Promise.resolve()
              })
            })
          }

          // See [javascript - Promise with timeout in 'for' loop - Stack Overflow](https://stackoverflow.com/questions/41636866/).
          const runAfterDelayRecursively = delay => new Promise((resolve) => {
            const listItem = listItems.pop()
            if (listItem) {
              // Wait for delay milliseconds to avoid API rate limit.
              setTimeout(() => eachItemPromise(listItem).then(() => {
                runAfterDelayRecursively(delay).then(() => resolve())
              }), delay)
            } else {
              resolve()
            }
          })
          return runAfterDelayRecursively(1000)
        })
      } else if (fs.isFileSync(localPath)) {
        // Set total progress (100%).
        if (modalView) modalView.update({ totalProgress: 100 })

        //
        // 2. In case of selecting file.
        //
        const targetFile = new File(localPath)
        if (type === 'import') {
          //
          // 2-a. In case of importing.
          //
          const { itemId } = config.findItemByPath('backlog', localPath, MatchType.exceptExport)
          if (!itemId) {
            atom.notifications.addError('Not synced file cannot be imported.')
            return Promise.reject()
          }

          // Call get API.
          handledProcess = backlogService.getItem(itemId)
            .then((item) => {
              if (targetFile.existsSync()) {
                // Check not-synced local modification.
                const syncedDigest = (itemsConfig[item.id]) ? itemsConfig[item.id].digest : null
                if (targetFile.getDigestSync() !== syncedDigest) {
                  atom.notifications.addError(
                    'Cannot import because of not-synced local modification.',
                    { detail: targetFile.getPath() },
                  )
                  return Promise.reject()
                }
              }

              // Save file.
              return targetFile.write(this.normalizeNewLine(item.content)).then(() => {
                console.log('File saved: ', targetFile.getPath())
                itemsConfig[item.id].url = this.resolveBacklogItemUrl(spaceKey, selectedProject, item)
                itemsConfig[item.id].updatedAt = item.updated
                itemsConfig[item.id].title = item.name
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                itemsConfig[item.id].projectId = item.projectId
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
            })
        } else {
          //
          // 2-b. In case of exporting.
          //
          handledProcess = targetFile.read().then((fileBody) => {
            let title = backlogTitle
            if (!title || title === '') {
              title = targetFile.getBaseName().replace(/\.[^/.]+$/, '') // remove extension
            }
            const { itemId } = config.findItemByPath('backlog', localPath, MatchType.exceptImport)
            if (!itemId) {
              // In case of posting.
              // Call post API.
              return backlogService.postItem(selectedProject.id, title, fileBody)
                .then((item) => {
                  // Save meta data to config.
                  itemsConfig[item.id] = itemsConfig[item.id] || { spaceKey }
                  itemsConfig[item.id].path = config.relativizeItemPath(localPath)
                  itemsConfig[item.id].url = this.resolveBacklogItemUrl(spaceKey, selectedProject, item)
                  itemsConfig[item.id].updatedAt = item.updated
                  itemsConfig[item.id].title = item.name
                  itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                  itemsConfig[item.id].digest = targetFile.getDigestSync()
                  itemsConfig[item.id].projectId = item.projectId
                  // Update progress (100%).
                  if (modalView) modalView.update({ currentProgress: 100 })
                  return Promise.resolve()
                })
            }

            // In case of updating.
            // Call update API.
            return backlogService.updateItem(itemId, title, fileBody)
              .then((item) => {
                // Save meta data to config.
                itemsConfig[item.id].url = this.resolveBacklogItemUrl(spaceKey, selectedProject, item)
                itemsConfig[item.id].updatedAt = item.updated
                itemsConfig[item.id].title = item.name
                itemsConfig[item.id].tags = item.tags.map(tag => tag.name)
                itemsConfig[item.id].digest = targetFile.getDigestSync()
                itemsConfig[item.id].projectId = item.projectId
                // Update progress (100%).
                if (modalView) modalView.update({ currentProgress: 100 })
                return Promise.resolve()
              })
          })
        }
      }

      handledProcess.then(() => {
        // Save meta data to config.
        config.setProp('backlog', 'items', itemsConfig)
        Promise.all([config.save(), secretConfig.save()]).then(() => {
          console.log('Config files saved.')
          if (progressModal) progressModal.destroy()
          atom.notifications.addSuccess(`${type} completed!`)
        })
      }).catch((error) => {
        // Handle error.
        atom.notifications.addError('Something went wrong.')
        console.error('Error occurred in BacklogService: ', error)
        if (progressModal) progressModal.destroy()
      })
      return Promise.resolve()
    }).catch((error) => {
      console.error('Error occurred in BacklogService: ', error)
      if (progressModal) progressModal.destroy()
    })
  }

  static resolveBacklogItemPath(localPath, configPath, item, currentItem, optionKeepFilePath, selectedProject) {
    if (optionKeepFilePath && currentItem) {
      if (currentItem.path) return `${configPath}/${currentItem.path}`
      if (currentItem.pathOnlyImport) return `${configPath}/${currentItem.pathOnlyImport}`
    }
    if (selectedProject.textFormattingRule === 'markdown') {
      return `${localPath}/${this.escapeFileName(item.name)}.md`
    }
    return `${localPath}/${this.escapeFileName(item.name)}.wiki`
  }

  static resolveBacklogItemUrl(spaceKey, selectedProject, item) {
    return `https://${spaceKey}.backlog.jp/wiki/${selectedProject.projectKey}/${item.name}`
  }
}
