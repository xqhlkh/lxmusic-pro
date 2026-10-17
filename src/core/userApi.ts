import { action, state } from '@/store/userApi'
import { addUserApi, getUserApiScript, removeUserApi as removeUserApiFromStore, setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore } from '@/utils/data'
import { destroy, loadScript } from '@/utils/nativeModules/userApi'
import { log as writeLog } from '@/utils/log'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'


export const setUserApi = async(apiId: string) => {
  global.lx.qualityList = {}
  setUserApiStatus(false, 'initing')

  const target = state.list.find(api => api.id === apiId)
  if (!target) throw new Error('api not found')
  const script = await getUserApiScript(target.id)
  loadScript({ ...target, script })
}

export const destroyUserApi = () => {
  destroy()
}


export const setUserApiStatus: typeof action['setStatus'] = (status, message) => {
  action.setStatus(status, message)
}

export const setUserApiList: typeof action['setUserApiList'] = (list) => {
  action.setUserApiList(list)
}

export const importUserApi = async(script: string) => {
  const info = await addUserApi(script)
  action.addUserApi(info)
}

/**
 * 内置预置自定义源（打包在 assets/user-apis 内）
 * 启动时自动导入尚未导入的源，并返回默认源（洛雪V4）的 id
 */
const PRESET_USER_APIS: Array<{ asset: string, isDefault?: boolean }> = [
  { asset: 'user-apis/xinghai-music-source-v2.3.15.js', isDefault: true },
  { asset: 'user-apis/flower.js' },
  { asset: 'user-apis/grass.js' },
]

/**
 * 已下架的预置源（按名称匹配），启动时自动清理
 */
const RETIRED_PRESET_NAMES = ['独家音源', 'ikun音源', '六音音源', '星海音乐源']

const parseScriptName = (script: string) => {
  const result = /^\s?\*\s?@name\s(.+)$/m.exec(script)
  return result ? result[1].trim() : ''
}

export const importPresetUserApis = async(): Promise<string | null> => {
  if (Platform.OS != 'android') return null
  // 清理已下架的预置源
  const retiredIds = state.list.filter(api => RETIRED_PRESET_NAMES.includes(api.name)).map(api => api.id)
  if (retiredIds.length) {
    await removeUserApi([...retiredIds]).catch(() => {})
  }
  let defaultApiId: string | null = null
  for (const preset of PRESET_USER_APIS) {
    let script: string
    try {
      script = await RNFS.readFileAssets(preset.asset, 'utf8')
    } catch {
      continue
    }
    const name = parseScriptName(script)
    if (name) {
      const existed = state.list.find(api => api.name == name)
      if (existed) {
        if (preset.isDefault) defaultApiId = existed.id
        continue
      }
    }
    try {
      const info = await addUserApi(script)
      action.addUserApi(info)
      if (preset.isDefault) defaultApiId = info.id
    } catch {
      continue
    }
  }
  return defaultApiId
}

export const removeUserApi = async(ids: string[]) => {
  const list = await removeUserApiFromStore(ids)
  action.setUserApiList(list)
}

export const setUserApiAllowShowUpdateAlert = async(id: string, enable: boolean) => {
  await setUserApiAllowShowUpdateAlertFromStore(id, enable)
  action.setUserApiAllowShowUpdateAlert(id, enable)
}

export const log = {
  r_info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.error(...params)
  },
  log(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.warn(...params)
  },
  error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.error(...params)
  },
}
