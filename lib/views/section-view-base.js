'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import ViewBase from './view-base'
import ModalView from './modal-view'

export default class SectionViewBase extends ViewBase {
  static showModal(title, message) {
    return atom.workspace.addModalPanel({ item: new ModalView({ title, message }).getElement() })
  }
}
