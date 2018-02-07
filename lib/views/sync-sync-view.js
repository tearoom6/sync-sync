'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import DocBaseSectionView from './section/docbase-section-view'
import EsaSectionView from './section/esa-section-view'
import QiitaSectionView from './section/qiita-section-view'
import ViewBase from './view-base'

export default class SyncSyncView extends ViewBase {
  render() {
    return (
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
            &nbsp;<span>Keep file path on importing</span>
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
}
