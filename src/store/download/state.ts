export interface InitState {
  downloadList: LX.Download.ListItem[]
  isInit: boolean
}

const state: InitState = {
  downloadList: [],
  isInit: false,
}

export default state
