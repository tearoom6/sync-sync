'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'

export default class ViewBase {
  constructor(props) {
    this.props = props || {}
    etch.initialize(this)
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

  static normalizeNewLine(text) {
    if (process.platform === 'win32') {
      return text.replace(/\r/g, '\r\n').replace(/\n/g, '\r\n')
    }
    return text.replace(/\r\n?/g, '\n')
  }
}
