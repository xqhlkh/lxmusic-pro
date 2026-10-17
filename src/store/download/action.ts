import state from './state'

export default {
  initList(list: LX.Download.ListItem[]) {
    state.downloadList = list
    state.isInit = true
    global.app_event.downloadListUpdate()
  },
  addList(list: LX.Download.ListItem[]) {
    state.downloadList.push(...list)
    global.app_event.downloadListUpdate()
  },
  updateItem(item: LX.Download.ListItem) {
    const target = state.downloadList.find(i => i.id == item.id)
    if (!target) return
    Object.assign(target, item)
    global.app_event.downloadListUpdate()
  },
  removeList(ids: string[]) {
    const idSet = new Set(ids)
    const newList = state.downloadList.filter(i => !idSet.has(i.id))
    state.downloadList.splice(0, state.downloadList.length)
    state.downloadList.push(...newList)
    global.app_event.downloadListUpdate()
  },
}
