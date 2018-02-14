'use babel'

/** @jsx etch.dom */
/* global atom */

import { Directory, File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import Config from '../models/config'
import ConfigUtil from '../utils/config-util'
import BacklogSectionView from './section/backlog-section-view'
import ConfluenceSectionView from './section/confluence-section-view'
import DocBaseSectionView from './section/docbase-section-view'
import EsaSectionView from './section/esa-section-view'
import QiitaSectionView from './section/qiita-section-view'
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
          </label><br />

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
          </label><br />

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
          </label><br />

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
          </label><br />

          <QiitaSectionView
            startTabIndex="11"
            localPath={this.props.localPath}
            configDirPath={this.props.configDirPath}
            optionKeepFilePath={this.props.optionKeepFilePath}
            qiitaAccessToken={this.props.qiitaAccessToken}
            qiitaUserName={this.props.qiitaUserName}
            qiitaTitle={this.props.qiitaTitle}
            qiitaTags={this.props.qiitaTags}
            qiitaItemUrl={this.props.qiitaItemUrl}
          />

          <EsaSectionView
            startTabIndex="21"
            localPath={this.props.localPath}
            configDirPath={this.props.configDirPath}
            optionKeepFilePath={this.props.optionKeepFilePath}
            esaAccessToken={this.props.esaAccessToken}
            esaTeamName={this.props.esaTeamName}
            esaTitle={this.props.esaTitle}
            esaTags={this.props.esaTags}
            esaCategory={this.props.esaCategory}
            esaItemUrl={this.props.esaItemUrl}
          />

          <DocBaseSectionView
            startTabIndex="31"
            localPath={this.props.localPath}
            configDirPath={this.props.configDirPath}
            optionKeepFilePath={this.props.optionKeepFilePath}
            docbaseAccessToken={this.props.docbaseAccessToken}
            docbaseDomain={this.props.docbaseDomain}
            docbaseTitle={this.props.docbaseTitle}
            docbaseTags={this.props.docbaseTags}
            docbaseGroups={this.props.docbaseGroups}
            docbaseScope={this.props.docbaseScope}
            docbaseItemUrl={this.props.docbaseItemUrl}
          />

          <ConfluenceSectionView
            startTabIndex="41"
            localPath={this.props.localPath}
            configDirPath={this.props.configDirPath}
            optionKeepFilePath={this.props.optionKeepFilePath}
            confluenceUserName={this.props.confluenceUserName}
            confluenceAccessToken={this.props.confluenceAccessToken}
            confluenceBaseUrl={this.props.confluenceBaseUrl}
            confluenceSpace={this.props.confluenceSpace}
            confluenceFlatImport={this.props.confluenceFlatImport}
            confluenceTitle={this.props.confluenceTitle}
            confluenceParentId={this.props.confluenceParentId}
            confluenceType={this.props.confluenceType}
            confluenceFormat={this.props.confluenceFormat}
            confluenceItemUrl={this.props.confluenceItemUrl}
          />

          <BacklogSectionView
            startTabIndex="61"
            localPath={this.props.localPath}
            configDirPath={this.props.configDirPath}
            optionKeepFilePath={this.props.optionKeepFilePath}
            backlogAccessToken={this.props.backlogAccessToken}
            backlogSpaceKey={this.props.backlogSpaceKey}
            backlogProjectId={this.props.backlogProjectId}
            backlogTitle={this.props.backlogTitle}
            backlogTags={this.props.backlogTags}
            backlogItemUrl={this.props.backlogItemUrl}
          />

          <section className="options">
            <h2>Options</h2>
            <h3>HTML to Markdown options</h3>
            <div className="message">
            You can choise the style of saved Markdown documents.
            See More in <a href="https://github.com/domchristie/turndown#options">Turndown</a>.<br />
            This options are saved in `.sync-sync.json`.
            </div>

            <button id="generate-turndown-options" on={{ click: this.generateTurndownOptions }} tabIndex="100">
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
      Config.load(configFile).then((config) => {
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
        config.save().then(() => {
          console.log('Config files saved.')
          atom.notifications.addSuccess('Default Turndown options saved!')
        })
      })
    } catch (error) {
      atom.notifications.addError('Something went wrong.')
      console.error('Error occurred:', error)
    }
  }
}
