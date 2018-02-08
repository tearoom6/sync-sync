'use babel'

/** @jsx etch.dom */

import { File } from 'atom'
import etch from 'etch'
import fs from 'fs-plus'
import ViewBase from '../view-base'
import ProgressModalView from '../modal/progress-modal-view'

export default class SectionViewBase extends ViewBase {
  static showProgressModal(title = 'Now Processing', message = 'Please wait for the process finished...') {
    const modalView = new ProgressModalView({ title, message })
    const modalPanel = atom.workspace.addModalPanel({ item: modalView.getElement() })
    return { modalView, modalPanel }
  }
}
