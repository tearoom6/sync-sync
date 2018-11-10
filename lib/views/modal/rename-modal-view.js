'use babel'

/** @jsx etch.dom */

import { File, Point, Range, TextBuffer, TextEditor } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import fse from 'fs-extra'
import path from 'path'
import Config from '../../models/config'
import Services from '../../models/services'
import ConfigUtil from '../../utils/config-util'
import ViewBase from '../view-base'

export default class RenameModalView extends ViewBase {
  constructor(props) {
    super(props)
    this.isDirectory = fs.isDirectorySync(props.targetPath)
    this.baseName = path.basename(props.targetPath)
    this.extension = path.extname(props.targetPath)
    const configFile = ConfigUtil.findConfigFile(props.targetPath)
    if (configFile) {
      this.basePath = configFile.getParent().getPath()
      Config.load(configFile).then(config => {
        this.config = config
        const relativeTargetPath = config.relativizeItemPath(props.targetPath)
        this.update({ originPath: relativeTargetPath, destinationPath: relativeTargetPath })
      })
    } else {
      const [projectPath, relativeLocalPath] = atom.project.relativizePath(props.targetPath)
      this.basePath = projectPath
      this.config = null
      this.update({ originPath: relativeLocalPath, destinationPath: relativeLocalPath })
    }
  }

  render() {
    return (
      // Don't use native-key-bindings if you use TextEditor.
      // See [Backspace not working in TextEditorView - support - Atom Discussion](https://discuss.atom.io/t/18746).
      <div className="sync-sync modal">
        <h1>Rename</h1>
        <div className="message">
          <span>Input destination path:</span>
        </div>

        <TextEditor
          ref="destinationPathEditor"
          mini
        />

        <button id="rename-ok" on={{ click: this.executeRename }}>
          Rename
        </button>
        <button id="rename-cancel" on={{ click: this.cancelRename }}>
          Cancel
        </button>
      </div>
    )
  }

  update(newProps) {
    if (newProps.destinationPath) {
      // Set initial text & selection.
      // See also [tree-view/dialog.coffee](https://github.com/atom/tree-view/blob/master/lib/dialog.coffee).
      this.refs.destinationPathEditor.setText(newProps.destinationPath)
      const selectionStart = newProps.destinationPath.length - (this.baseName || '').length
      const selectionEnd = newProps.destinationPath.length - (this.extension || '').length
      this.refs.destinationPathEditor.setSelectedBufferRange(Range(Point(0, selectionStart), Point(0, selectionEnd)))
      this.refs.destinationPathEditor.getElement().getComponent().didFocus()
    }
    return super.update(newProps)
  }

  async executeRename(event) {
    const { originPath } = this.props
    const destinationPath = this.refs.destinationPathEditor.getText()

    if (await this.renameFile(originPath, destinationPath)) {
      await this.renameConfigItem(originPath, destinationPath)
    }

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

  async renameFile(originPath, destinationPath) {
    const error = await fse.move(`${this.basePath}/${originPath}`, `${this.basePath}/${destinationPath}`)
    if (error) {
      atom.notifications.addError('Failed to rename.')
      console.log('Failed to rename.', error)
      return false
    }
    console.log(`Successfully renamed: ${originPath} -> ${destinationPath}`)
    return true
  }

  async renameConfigItem(originPath, destinationPath) {
    if (!this.config) {
      console.log('Config file not found.')
      return false
    }

    Object.values(Services).forEach(serviceName => {
      const itemsConfig = this.config.prop(serviceName, 'items') || {}

      if (this.isDirectory) {
        // In case of directory.
        const itemIds = this.config.findItemsByDirectoryPath(serviceName, originPath)
        itemIds.forEach(itemId => {
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

    await this.config.save()
    console.log('Config file saved.')
    return true
  }
}
