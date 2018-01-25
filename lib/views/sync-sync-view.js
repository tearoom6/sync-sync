'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import QiitaSectionView from './qiita-section-view'

export default class SyncSyncView {
  constructor(props) {
    this.props = props || {}
    etch.initialize(this)
  }

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
              tabIndex={1}
            />
          </label><br />

          <label htmlFor="config-path">
            <span>ConfigPath</span>
            <input
              type="text"
              id="config-path"
              ref="configPath"
              value={this.props.configPath || ''}
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
              tabIndex={3}
            />
          </label><br />

          <QiitaSectionView
            startTabIndex="11"
            localPath={this.props.localPath}
            configPath={this.props.configPath}
            qiitaAccessToken={this.props.qiitaAccessToken}
            qiitaUserName={this.props.qiitaUserName}
            qiitaTags={this.props.qiitaTags}
          />

        </form>
      </div>
    )
  }

  update(newProps) {
    Object.entries(newProps).forEach(([key, newValue]) => {
      this.props[key] = newValue
    })
    return etch.update(this)
  }

  async destroy() {
    await etch.destroy(this)
  }

  getElement() {
    return this.element
  }
}
