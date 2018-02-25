'use babel'

/** @jsx etch.dom */
/* global atom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import fse from 'fs-extra'
import Config from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'
import ViewBase from '../view-base'

export default class RenameModalView extends ViewBase {
  constructor(props) {
    super(props)
    this.isDirectory = fs.isDirectorySync(props.targetPath)
    const [projectPath, relativeLocalPath] = atom.project.relativizePath(props.targetPath)
    const configFile = ConfigUtil.findConfigFile(props.targetPath)
    if (configFile) {
      this.basePath = configFile.getParent().getPath()
      Config.load(configFile).then((config) => {
        this.config = config
        const relativeTargetPath = config.relativizeItemPath(props.targetPath)
        this.update({ originPath: relativeTargetPath, destinationPath: relativeTargetPath })
      })
    } else {
      this.basePath = projectPath
      this.config = null
      this.update({ originPath: relativeLocalPath, destinationPath: relativeLocalPath })
    }
  }

  render() {
    return (
      // Use native-key-bindings for natural input.
      // See [Backspace isn't working in regular text fields :( - packages - Atom Discussion](https://discuss.atom.io/t/11020).
      <div className="sync-sync native-key-bindings modal">
        <h1>Rename</h1>

        <label htmlFor="origin-path">
          <span>Origin</span>
          <input
            type="text"
            id="origin-path"
            ref="originPath"
            value={this.props.originPath || ''}
            readOnly
          />
        </label><br />

        <label htmlFor="destination-path">
          <span>Destination</span>
          <input
            type="text"
            id="destination-path"
            ref="destinationPath"
            value={this.props.destinationPath || ''}
          />
        </label><br />

        <button id="rename-ok" on={{ click: this.executeRename }}>
          Rename
        </button>
        <button id="rename-cancel" on={{ click: this.cancelRename }}>
          Cancel
        </button>
      </div>
    )
  }

  executeRename(event) {
    const originPath = this.refs.originPath.value
    const destinationPath = this.refs.destinationPath.value

    fse.move(`${this.basePath}/${originPath}`, `${this.basePath}/${destinationPath}`, (error) => {
      if (error) {
        atom.notifications.addError('Failed to rename.')
        console.log('Failed to rename.', error)
        return
      }
      console.log(`Successfully renamed: ${originPath} -> ${destinationPath}`)

      if (!this.config) {
        console.log('Config file not found.')
        return
      }

      Object.values(Services).forEach((serviceName) => {
        const itemsConfig = this.config.prop(serviceName, 'items') || {}

        if (this.isDirectory) {
          // In case of directory.
          const itemIds = this.config.findItemsByDirectoryPath(serviceName, originPath)
          itemIds.forEach((itemId) => {
            // TODO: - Rename pathOnlyImport/pathOnlyExport, too.
            const regex = new RegExp(`^${originPath}/(.+)`)
            const newItemPath = itemsConfig[itemId].path.replace(regex, `${destinationPath}/$1`)
            itemsConfig[itemId].path = newItemPath
          })
        } else {
          // In case of file.
          const { itemId, matchedAttribute } = this.config.findItemByPath(serviceName, originPath)
          if (itemId && itemsConfig[itemId]) itemsConfig[itemId][matchedAttribute] = this.config.relativizeItemPath(destinationPath)
        }
        this.config.setProp(serviceName, 'items', itemsConfig)
      })

      this.config.save().then(() => {
        console.log('Config file saved.')
      })
    })

    this.closeView()
  }

  cancelRename(event) {
    this.closeView()
  }

  closeView() {
    const panel = atom.workspace.panelForItem(this.getElement())
    if (panel) panel.destroy()
    this.destroy()
  }
}
