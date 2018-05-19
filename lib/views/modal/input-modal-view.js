'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import ViewBase from '../view-base'

export default class InputModalView extends ViewBase {
  constructor(props, originalView, requestId) {
    super(props)
    this.originalView = originalView
    this.requestId = requestId
  }

  render() {
    return (
      // Use native-key-bindings for natural input.
      // See [Backspace isn't working in regular text fields :( - packages - Atom Discussion](https://discuss.atom.io/t/11020).
      <div className="sync-sync native-key-bindings modal">
        <h1>{this.props.title || 'Confirm'}</h1>

        <label htmlFor="input-text">
          <span>{this.props.fieldName || 'Field Name'}</span>
          <input type="text" id="input-text" ref="inputText" value={this.props.inputText || ''} on={{ change: this.optionChanged }} />
        </label>
        <br />

        <button id="input-ok" on={{ click: this.execute }}>
          OK
        </button>
        <button id="input-cancel" on={{ click: this.cancel }}>
          Cancel
        </button>
      </div>
    )
  }

  optionChanged(event) {
    console.log('Option changed.')
    this.update({
      inputText: this.refs.inputText.value,
    })
  }

  execute(event) {
    this.originalView.callback(this.requestId, this.props)

    this.closeView()
  }

  cancel(event) {
    this.closeView()
  }

  closeView() {
    const panel = atom.workspace.panelForItem(this.getElement())
    if (panel) panel.destroy()
    this.destroy()
  }
}
