'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import ViewBase from '../view-base'

export default class ProgressModalView extends ViewBase {
  render() {
    return (
      <div className="sync-sync modal">
        <h1>{this.props.title}</h1>
        <div className="message">
          <span>{this.props.message}</span>
        </div>
        <div className="progress">
          <progress value={this.props.currentProgress || 0} max={this.props.totalProgress || 0} />
          <span>
            {this.props.currentProgress || 0} / {this.props.totalProgress || 0}
          </span>
        </div>
      </div>
    )
  }
}
