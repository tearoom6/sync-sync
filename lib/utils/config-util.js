'use babel'

import { Directory, File } from 'atom'
import fs from 'fs-plus'

export default class ConfigUtil {
  static getConfigBaseName() {
    return '.sync-sync.json'
  }

  static getSecretConfigBaseName() {
    return '.sync-sync.secret.json'
  }

  static findConfigFile(currentPath) {
    return this.findConfigFileWithBaseName(currentPath, this.getConfigBaseName())
  }

  static findSecretConfigFile(currentPath) {
    return this.findConfigFileWithBaseName(currentPath, this.getSecretConfigBaseName())
  }

  static findConfigFileWithBaseName(currentPath, baseName) {
    console.log(`Call findConfigFileWithBaseName: ${currentPath}, ${baseName}`)
    if (!currentPath) {
      throw new Error('currentPath cannot be null.')
    }
    if (!baseName) {
      throw new Error('baseName cannot be null.')
    }

    const currentDir = new Directory(currentPath)
    if (!currentDir.existsSync()) {
      throw new Error('Specified currentPath does not exist.')
    }

    if (fs.isFileSync(currentPath)) {
      return this.findConfigFileWithBaseName(currentDir.getParent().getPath(), baseName)
    }

    if (currentDir.isRoot()) {
      // Config file not found.
      return null
    }

    const configFile = new File(`${currentPath}/${baseName}`)
    if (configFile.existsSync()) {
      return configFile
    }

    const [projectPath, relativeLocalPath] = atom.project.relativizePath(currentPath)
    if (relativeLocalPath === '') {
      // Config file not found.
      return null
    }
    return this.findConfigFileWithBaseName(currentDir.getParent().getPath(), baseName)
  }

  static createEmptyConfigFile(configDir) {
    return this.createEmptyConfigFileWithBaseName(configDir, this.getConfigBaseName())
  }

  static createEmptySecretConfigFile(configDir) {
    return this.createEmptyConfigFileWithBaseName(configDir, this.getSecretConfigBaseName())
  }

  static createEmptyConfigFileWithBaseName(configDir, baseName) {
    const configFile = new File(`${configDir}/${baseName}`)
    configFile.create().then(isCreated => {
      configFile.writeSync('{}')
      console.log(`Empty config file is created: ${configFile.getPath()}`)
    })
    return configFile
  }
}
