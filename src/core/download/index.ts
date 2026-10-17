import { DOWNLOAD_STATUS } from '@/config/constant'
import { getMusicUrl as getOnlineMusicUrl, getPicUrl as getOnlinePicUrl } from '@/core/music/online'
import settingState from '@/store/setting/state'
import downloadState from '@/store/download/state'
import downloadAction from '@/store/download/action'
import {
  downloadFile,
  moveFile,
  stopDownload,
  temporaryDirectoryPath,
  privateStorageDirectoryPath,
  mkdir,
  existsFile,
  unlink,
} from '@/utils/fs'
import { filterFileName } from '@/utils'
import { formatMusicName } from '@/utils/tools'
import { writeMetadata, writePic } from '@/utils/localMediaMetadata'
import { getDownloadList as getStoreDownloadList, saveDownloadList } from '@/utils/data'
import { throttle } from '@/utils/common'

const downloadTempPath = `${temporaryDirectoryPath}/download`

const runningTask = new Map<string, LX.Download.ListItem>()
const jobIdMap = new Map<string, number>()
const progressMap = new Map<string, { lastBytes: number, lastTime: number }>()

let isInit = false
let isSaving = false

const throttleSaveList = throttle(() => {
  void saveDownloadList(downloadState.downloadList.map(i => ({ ...i })))
}, 200)

const getFileExt = (quality: LX.Quality): LX.Download.FileExt => {
  if (['flac', 'flac24bit'].includes(quality)) return 'flac'
  if (quality == 'ape') return 'ape'
  if (quality == 'wav') return 'wav'
  return 'mp3'
}

const getSaveDir = (): string => {
  const savePath = settingState.setting['download.savePath']
  return savePath || `${privateStorageDirectoryPath}/LXMusic`
}

const getFileName = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): string => {
  const ext = getFileExt(quality)
  const format = settingState.setting['download.fileName']
  const name = filterFileName(formatMusicName(format, musicInfo.name, musicInfo.singer))
  return `${name}.${ext}`
}

const buildDownloadInfo = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): LX.Download.ListItem => {
  const fileName = getFileName(musicInfo, quality)
  return {
    id: `${musicInfo.source}_${musicInfo.id}`,
    isComplate: false,
    status: DOWNLOAD_STATUS.WAITING,
    statusText: global.i18n.t('download_status_waiting'),
    downloaded: 0,
    total: 0,
    progress: 0,
    speed: '',
    metadata: {
      musicInfo,
      url: null,
      quality,
      ext: getFileExt(quality),
      fileName,
      filePath: '',
    },
  }
}

const setStatus = (item: LX.Download.ListItem, status: LX.Download.DownloadTaskStatus, statusText?: string) => {
  if (statusText == null) {
    switch (status) {
      case DOWNLOAD_STATUS.RUN:
        statusText = global.i18n.t('download_status_running')
        break
      case DOWNLOAD_STATUS.WAITING:
        statusText = global.i18n.t('download_status_waiting')
        break
      case DOWNLOAD_STATUS.PAUSE:
        statusText = global.i18n.t('download_status_paused')
        break
      case DOWNLOAD_STATUS.ERROR:
        statusText = global.i18n.t('download_status_error')
        break
      case DOWNLOAD_STATUS.COMPLETED:
        statusText = global.i18n.t('download_status_completed')
        break
      default:
        statusText = ''
        break
    }
  }
  item.statusText = statusText
  item.status = status
  if (status == DOWNLOAD_STATUS.COMPLETED) item.isComplate = true
  downloadAction.updateItem(item)
  throttleSaveList()
}

const setProgress = (item: LX.Download.ListItem, progress: LX.Download.ProgressInfo) => {
  item.total = progress.total
  item.downloaded = progress.downloaded
  item.speed = progress.speed
  item.progress = progress.total ? Math.floor((progress.downloaded / progress.total) * 100) : 0
  downloadAction.updateItem(item)
  throttleSaveList()
}

const getMaxDownloadNum = () => Math.max(1, settingState.setting['download.maxDownloadNum'])

const picExtRxp = /\.(jpe?g|png|webp|bmp|gif)/i

/**
 * 将歌曲信息（歌名、歌手、专辑）与封面嵌入下载好的音频文件
 * 仅支持 mp3 / flac，失败时静默跳过，不影响下载完成状态
 */
const embedMetadata = async(item: LX.Download.ListItem) => {
  if (item.metadata.ext != 'mp3' && item.metadata.ext != 'flac') return
  const musicInfo = item.metadata.musicInfo
  const filePath = item.metadata.filePath
  await writeMetadata(filePath, {
    name: musicInfo.name,
    singer: musicInfo.singer,
    albumName: musicInfo.meta.albumName,
  }, true).catch(() => {})

  let picUrl = musicInfo.meta.picUrl
  if (!picUrl) {
    picUrl = await getOnlinePicUrl({ musicInfo, isRefresh: false }).catch(() => null)
  }
  if (!picUrl) return
  const ext = picExtRxp.exec(picUrl)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg'
  const picTempPath = `${downloadTempPath}/cover_${item.id}.${ext}`
  try {
    const result = await downloadFile(picUrl, picTempPath, {
      connectionTimeout: 15_000,
      readTimeout: 30_000,
    }).promise
    if (result.statusCode != 200) return
    await writePic(filePath, picTempPath).catch(() => {})
  } catch {
    // ignore
  } finally {
    await unlink(picTempPath).catch(() => {})
  }
}

const getNextWaitTask = (): LX.Download.ListItem | null => {
  let runingNum = 0
  const waitList = downloadState.downloadList.filter(i => {
    if (i.status == DOWNLOAD_STATUS.WAITING) return true
    if (i.status == DOWNLOAD_STATUS.RUN) ++runingNum
    return false
  })
  return runingNum < getMaxDownloadNum() ? waitList.shift() ?? null : null
}

const handleDownload = async(item: LX.Download.ListItem) => {
  runningTask.set(item.id, item)

  try {
    if (!item.metadata.url) {
      setStatus(item, DOWNLOAD_STATUS.RUN, global.i18n.t('download_status_url_getting'))
      const url = await getOnlineMusicUrl({
        musicInfo: item.metadata.musicInfo,
        quality: item.metadata.quality,
        isRefresh: false,
        allowToggleSource: true,
      })
      if (!url) throw new Error(global.i18n.t('download_status_error_url_failed'))
      item.metadata.url = url
    }
  } catch (err: any) {
    setStatus(item, DOWNLOAD_STATUS.ERROR, err.message)
    runningTask.delete(item.id)
    void checkStartTask()
    return
  }

  if (item.status != DOWNLOAD_STATUS.RUN) return

  const saveDir = getSaveDir()
  const fileName = item.metadata.fileName
  const filePath = `${saveDir}/${fileName}`
  item.metadata.filePath = filePath

  if (settingState.setting['download.skipExistFile'] && await existsFile(filePath)) {
    setStatus(item, DOWNLOAD_STATUS.COMPLETED)
    runningTask.delete(item.id)
    void checkStartTask()
    return
  }

  setStatus(item, DOWNLOAD_STATUS.RUN, global.i18n.t('download_status_start'))

  const tempPath = `${downloadTempPath}/${fileName}`
  try {
    await mkdir(downloadTempPath)
  } catch (_) { /* already exists */ }

  const jobId = downloadFile(item.metadata.url!, tempPath, {
    connectionTimeout: 15_000,
    readTimeout: 30_000,
    begin: () => {
      if (item.status != DOWNLOAD_STATUS.RUN) return
      progressMap.set(item.id, { lastBytes: 0, lastTime: Date.now() })
      setStatus(item, DOWNLOAD_STATUS.RUN)
    },
    progress: (res) => {
      if (item.status != DOWNLOAD_STATUS.RUN) return
      const now = Date.now()
      const prev = progressMap.get(item.id)
      let speed = ''
      if (prev) {
        const timeDiff = (now - prev.lastTime) / 1000
        if (timeDiff > 0) {
          const bytesDiff = res.bytesWritten - prev.lastBytes
          speed = sizeFormate(bytesDiff / timeDiff) + '/s'
        }
        prev.lastBytes = res.bytesWritten
        prev.lastTime = now
      }
      setProgress(item, {
        progress: 0,
        speed,
        downloaded: res.bytesWritten,
        total: res.contentLength ?? item.total,
      })
    },
  })
  jobIdMap.set(item.id, jobId.jobId)

  jobId.promise.then(async(result) => {
    progressMap.delete(item.id)
    if (result.statusCode !== 200 && result.statusCode !== 206) {
      await unlink(tempPath).catch(() => {})
      setStatus(item, DOWNLOAD_STATUS.ERROR, global.i18n.t('download_status_error'))
      return
    }
    try {
      await moveFile(tempPath, filePath)
      await embedMetadata(item).catch(() => {})
      setProgress(item, {
        progress: 100,
        speed: '',
        downloaded: item.total,
        total: item.total,
      })
      item.progress = 100
      setStatus(item, DOWNLOAD_STATUS.COMPLETED)
    } catch (err: any) {
      await unlink(tempPath).catch(() => {})
      setStatus(item, DOWNLOAD_STATUS.ERROR, err.message)
    }
  }).catch(async(err: any) => {
    progressMap.delete(item.id)
    if (item.status == DOWNLOAD_STATUS.PAUSE) return
    await unlink(tempPath).catch(() => {})
    setStatus(item, DOWNLOAD_STATUS.ERROR, err.message)
  }).finally(() => {
    jobIdMap.delete(item.id)
    runningTask.delete(item.id)
    void checkStartTask()
  })
}

const checkStartTask = async() => {
  if (runningTask.size >= getMaxDownloadNum()) return
  let task = getNextWaitTask()
  while (task) {
    void handleDownload(task)
    task = getNextWaitTask()
  }
}

export const getDownloadList = async(): Promise<LX.Download.ListItem[]> => {
  if (!isInit) {
    downloadAction.initList(await getDownloadListData())
    isInit = true
  }
  return downloadState.downloadList
}

const getDownloadListData = async() => {
  const list = await getStoreDownloadList()
  for (const item of list) {
    if (item.status == DOWNLOAD_STATUS.RUN || item.status == DOWNLOAD_STATUS.WAITING) {
      item.status = DOWNLOAD_STATUS.PAUSE
      item.statusText = global.i18n.t('download_status_paused')
    }
  }
  return list
}

const filterTask = (list: LX.Download.ListItem[]) => {
  const set = new Set(downloadState.downloadList.map(i => i.id))
  return list.filter(i => {
    if (set.has(i.id)) return false
    set.add(i.id)
    return true
  })
}

/**
 * 创建下载任务
 * @param list 要下载的歌曲
 * @param quality 下载音质
 */
export const createDownloadTasks = async(list: LX.Music.MusicInfoOnline[], quality: LX.Quality) => {
  if (!list.length) return
  const tasks = filterTask(list.map(musicInfo => buildDownloadInfo(musicInfo, quality)))
  if (!tasks.length) {
    global.app_event.downloadListUpdate()
    return
  }
  downloadAction.addList(tasks)
  throttleSaveList()
  void checkStartTask()
}

/**
 * 开始下载任务
 */
export const startDownloadTasks = async(list: LX.Download.ListItem[]) => {
  for (const item of list) {
    switch (item.status) {
      case DOWNLOAD_STATUS.PAUSE:
      case DOWNLOAD_STATUS.ERROR:
        if (runningTask.size < getMaxDownloadNum()) {
          setStatus(item, DOWNLOAD_STATUS.WAITING)
        }
        break
      default:
        break
    }
  }
  void checkStartTask()
}

/**
 * 暂停下载任务
 */
export const pauseDownloadTasks = async(list: LX.Download.ListItem[]) => {
  for (const item of list) {
    switch (item.status) {
      case DOWNLOAD_STATUS.RUN: {
        const jobId = jobIdMap.get(item.id)
        if (jobId != null) stopDownload(jobId)
        jobIdMap.delete(item.id)
        runningTask.delete(item.id)
        setStatus(item, DOWNLOAD_STATUS.PAUSE)
        break
      }
      case DOWNLOAD_STATUS.WAITING:
        setStatus(item, DOWNLOAD_STATUS.PAUSE)
        break
      default:
        break
    }
  }
}

/**
 * 移除下载任务
 */
export const removeDownloadTasks = async(ids: string[]) => {
  for (const id of ids) {
    const item = downloadState.downloadList.find(i => i.id == id)
    if (!item) continue
    if (item.status == DOWNLOAD_STATUS.RUN) {
      const jobId = jobIdMap.get(id)
      if (jobId != null) stopDownload(jobId)
      jobIdMap.delete(id)
    }
    runningTask.delete(id)
  }
  downloadAction.removeList(ids)
  throttleSaveList()
  void checkStartTask()
}

const sizeFormate = (size: number): string => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const number = Math.floor(Math.log(size) / Math.log(1024))
  return `${(size / Math.pow(1024, Math.floor(number))).toFixed(2)} ${units[number]}`
}
