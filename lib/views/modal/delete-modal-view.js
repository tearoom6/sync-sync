'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import fse from 'fs-extra'
import Config from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'
import ViewBase from '../view-base'

export default class DeleteModalView extends ViewBase {
  render() {
    return (
      // Use native-key-bindings for natural input.
      // See [Backspace isn't working in regular text fields :( - packages - Atom Discussion](https://discuss.atom.io/t/11020).
      <div className="sync-sync native-key-bindings modal">
        <h1>Are you sure to delete?</h1>
        <div className="message">
          <span>{this.props.targetPath}</span>
        </div>
        <button id="delete-ok" on={{ click: this.executeDelete }}>
          Delete
        </button>
        <button id="delete-cancel" on={{ click: this.cancelDelete }}>
          Cancel
        </button>
      </div>
    )
  }

  async executeDelete(event) {
    const { targetPath } = this.props
    const configFile = ConfigUtil.findConfigFile(targetPath)
    const isDirectory = fs.isDirectorySync(targetPath)

    if (await this.constructor.deleteFile(targetPath)) {
      await this.constructor.deleteConfigItem(configFile, targetPath, isDirectory)
    }

    this.closeView()
  }

  cancelDelete(event) {
    this.closeView()
  }

  closeView() {
    const panel = atom.workspace.panelForItem(this.getElement())
    if (panel) panel.destroy()
    this.destroy()
  }

  static async deleteFile(targetPath) {
    const error = await fse.remove(targetPath)
    if (error) {
      atom.notifications.addError('Failed to delete.')
      console.log('Failed to delete.', error)
      return false
    }
    console.log(`Successfully deleted: ${targetPath}`)
    return true
  }

  static async deleteConfigItem(configFile, targetPath, isDirectory) {
    if (!configFile) {
      console.log('Config file not found.')
      return false
    }

    const config = await Config.load(configFile)
    Object.values(Services).forEach(serviceName => {
      const itemsConfig = config.prop(serviceName, 'items') || {}

      if (isDirectory) {
        // In case of directory.
        const itemIds = config.findItemsByDirectoryPath(serviceName, targetPath)
        itemIds.forEach(itemId => {
          delete itemsConfig[itemId]
        })
      } else {
        // In case of file.
        const { itemId } = config.findItemByPath(serviceName, targetPath)
        if (itemId && itemsConfig[itemId]) delete itemsConfig[itemId]
      }
      config.setProp(serviceName, 'items', itemsConfig)
    })

    await config.save()
    console.log('Config file saved.')
    return true
  }
}
