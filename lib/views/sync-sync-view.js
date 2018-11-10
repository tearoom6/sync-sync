'use babel'

/** @jsx etch.dom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import Config from '../models/config'
import ConfigUtil from '../utils/config-util'
import BacklogSectionView from './section/backlog-section-view'
import BloggerSectionView from './section/blogger-section-view'
import ConfluenceSectionView from './section/confluence-section-view'
import DocBaseSectionView from './section/docbase-section-view'
import EsaSectionView from './section/esa-section-view'
import HatenaSectionView from './section/hatena-section-view'
import MediumSectionView from './section/medium-section-view'
import QiitaSectionView from './section/qiita-section-view'
import QiitaTeamSectionView from './section/qiita-team-section-view'
import WordpressComSectionView from './section/wordpress-com-section-view'
import WordpressOrgSectionView from './section/wordpress-org-section-view'
import ViewBase from './view-base'

export default class SyncSyncView extends ViewBase {
  render() {
    return (
      // Use native-key-bindings for natural input.
      // See [Backspace isn't working in regular text fields :( - packages - Atom Discussion](https://discuss.atom.io/t/11020).
      <div className="sync-sync native-key-bindings">
        <h1>Sync-Sync Import/Export</h1>

        <form>
          <label htmlFor="project-path">
            <span>ProjectPath</span>
            <input
              type="text"
              id="project-path"
              ref="projectPath"
              value={this.props.projectPath || ''}
              on={{ change: this.optionChanged }}
              tabIndex={1}
            />
          </label>
          <br />

          <label htmlFor="config-dir-path">
            <span>ConfigDirPath</span>
            <input
              type="text"
              id="config-dir-path"
              ref="configDirPath"
              value={this.props.configDirPath || ''}
              on={{ change: this.optionChanged }}
              tabIndex={2}
            />
          </label>
          <br />

          <label htmlFor="local-path">
            <span>LocalPath</span>
            <input
              type="text"
              id="local-path"
              ref="localPath"
              value={this.props.localPath || ''}
              on={{ change: this.optionChanged }}
              tabIndex={3}
            />
          </label>
          <br />

          <label htmlFor="option-keep-file-path">
            <input
              type="checkbox"
              id="option-keep-file-path"
              name="optionKeepFilePath"
              ref="optionKeepFilePath"
              defaultChecked={this.props.optionKeepFilePath}
              on={{ change: this.optionChanged }}
              tabIndex={4}
            />
            &nbsp;Keep file path on importing
          </label>
          <br />

          { QiitaSectionView.show(this.props, 101) }
          { QiitaTeamSectionView.show(this.props, 201) }
          { EsaSectionView.show(this.props, 301) }
          { DocBaseSectionView.show(this.props, 401) }
          { WordpressComSectionView.show(this.props, 501) }
          { WordpressOrgSectionView.show(this.props, 601) }
          { ConfluenceSectionView.show(this.props, 701) }
          { BacklogSectionView.show(this.props, 801) }
          { HatenaSectionView.show(this.props, 901) }
          { BloggerSectionView.show(this.props, 1001) }
          { MediumSectionView.show(this.props, 1101) }

          <section className="options">
            <h2>Options</h2>
            <h3>HTML to Markdown options</h3>
            <div className="message">
              You can choise the style of saved Markdown documents. See More in{' '}
              <a href="https://github.com/domchristie/turndown#options">Turndown</a>.<br />
              This options are saved in `.sync-sync.json`.
            </div>

            <button id="generate-turndown-options" on={{ click: this.generateTurndownOptions }} tabIndex="999">
              Generate default configurations
            </button>
          </section>
        </form>
      </div>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      configDirPath: this.refs.configDirPath.value,
      localPath: this.refs.localPath.value,
      // See [reactjs - Get the value of checkbox using ref in React - Stack Overflow](https://stackoverflow.com/questions/36833192/).
      optionKeepFilePath: this.refs.optionKeepFilePath.checked,
    })
  }

  generateTurndownOptions(event) {
    try {
      console.log('generateTurndownOptions called.')
      const { configDirPath } = this.props
      const configDir = new Directory(configDirPath)
      if (!configDir.existsSync()) {
        atom.notifications.addError(`Cannot find config directory: ${configDir.getPath()}`)
        return
      }

      // Save default options to config file.
      const configFile = new File(`${configDirPath}/${ConfigUtil.getConfigBaseName()}`)
      SyncSyncView.saveTurndownOptionsIntoConfigFile(configFile)
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred:', error)
    }
  }

  static async saveTurndownOptionsIntoConfigFile(configFile) {
    const config = await Config.load(configFile)
    config.setOptions('turndown', {
      headingStyle: 'setext',
      hr: '* * *',
      bulletListMarker: '*',
      codeBlockStyle: 'indented',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
    })
    await config.save()
    console.log('Config files saved.')
    atom.notifications.addSuccess('Default Turndown options saved!')
  }
}
