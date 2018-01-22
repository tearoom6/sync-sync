'use babel'

import { Directory, File } from 'atom'
import fs from 'fs-plus'

export default class ConfigUtil {
  static getConfigBaseName() {
    return '.sync-sync'
  }

  static findConfigFile(currentPath) {
    console.log(`Call findConfigFile: ${currentPath}`)
    if (!currentPath) {
      throw new Error('currentPath cannot be null.')
    }

    const currentDir = new Directory(currentPath)
    if (!currentDir.existsSync()) {
      throw new Error('Specified currentPath does not exist.')
    }

    if (fs.isFileSync(currentPath)) {
      return this.findConfigFile(currentDir.getParent().getPath())
    }

    if (currentDir.isRoot()) {
      // Config file not found.
      return null
    }

    const configFile = new File(`${currentPath}/${this.getConfigBaseName()}`)
    if (configFile.existsSync()) {
      return configFile
    }

    const [projectPath, relativeLocalPath] = atom.project.relativizePath(currentPath)
    if (relativeLocalPath === '') {
      // Config file not found.
      return null
    }
    return this.findConfigFile(currentDir.getParent().getPath())
  }
}
