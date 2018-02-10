'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import beautify from 'js-beautify'
import TurndownService from 'turndown'

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

  static escapeFileName(fileName) {
    return fileName.replace(/\//g, ':')
  }

  static htmlToMarkdown(rawHtml, options = {}) {
    const turndownService = new TurndownService(options)
    return turndownService.turndown(rawHtml)
  }

  static normalizeHtmlBody(rawHtml) {
    const beautifiedHtml = beautify.html(rawHtml, { indent_size: 2 })
    return this.normalizeNewLine(beautifiedHtml)
  }

  static normalizeNewLine(text) {
    if (process.platform === 'win32') {
      return text.replace(/\r/g, '\r\n').replace(/\n/g, '\r\n')
    }
    return text.replace(/\r\n?/g, '\n')
  }
}
