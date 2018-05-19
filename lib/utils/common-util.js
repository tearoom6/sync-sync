'use babel'

export default class CommonUtil {
  static wrappedArray(obj) {
    if (obj instanceof Array) {
      return obj
    }
    if (obj) {
      return [obj]
    }
    return []
  }
}
