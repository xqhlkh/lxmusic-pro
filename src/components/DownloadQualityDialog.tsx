import { useRef, useImperativeHandle, forwardRef, useState, useCallback, memo } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle, toast } from '@/utils/tools'
import { sizeFormate } from '@/utils'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import CheckBox from '@/components/common/CheckBox'
import Button from '@/components/common/Button'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { TRY_QUALITYS_LIST } from '@/core/music/utils'
import { createDownloadTasks } from '@/core/download'

const DOWNLOAD_QUALITYS = [...TRY_QUALITYS_LIST, '128k'] as LX.Quality[]

// 各音质码率（kbps），用于估算文件大小
const QUALITY_BITRATE: Partial<Record<LX.Quality, number>> = {
  '128k': 128,
  '320k': 320,
  flac: 900,
  flac24bit: 2300,
  ape: 800,
  wav: 1411,
}

// 解析 "3.56M" / "512KB" 这类大小字符串为字节数
const parseSizeStr = (size: string): number => {
  const result = /^([\d.]+)\s*([kmgt])?b?$/i.exec(size.trim())
  if (!result) return 0
  const units: Record<string, number> = { k: 1, m: 2, g: 3, t: 4 }
  const exp = result[2] ? (units[result[2].toLowerCase()] ?? 0) : 0
  return Math.floor(parseFloat(result[1]) * Math.pow(1024, exp))
}

// 解析 "03:55" 这类时长为秒数
const parseInterval = (interval: string | null): number => {
  if (!interval) return 0
  const parts = interval.split(':').map(part => parseInt(part))
  if (parts.some(num => Number.isNaN(num))) return 0
  let seconds = 0
  for (const part of parts) seconds = seconds * 60 + part
  return seconds
}

// 计算指定音质下所选歌曲的总大小，返回显示文本
const getQualitySizeLabel = (list: LX.Music.MusicInfoOnline[], quality: LX.Quality): string => {
  if (!list.length) return ''
  let total = 0
  let allActual = true
  for (const musicInfo of list) {
    const sizeStr = musicInfo.meta._qualitys[quality]?.size
    if (sizeStr) {
      const bytes = parseSizeStr(sizeStr)
      if (bytes > 0) {
        total += bytes
        continue
      }
    }
    allActual = false
    const seconds = parseInterval(musicInfo.interval)
    const bitrate = QUALITY_BITRATE[quality] ?? QUALITY_BITRATE['128k']!
    if (seconds > 0) total += Math.floor(bitrate * 1000 / 8 * seconds)
  }
  if (total <= 0) return ''
  return allActual ? sizeFormate(total) : `约${sizeFormate(total)}`
}

interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
}

interface ModalType {
  show: (info: SelectInfo) => void
}

const Modal = memo(forwardRef<ModalType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [quality, setQuality] = useState<LX.Quality>('128k')
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<LX.Music.MusicInfoOnline[]>([])

  useImperativeHandle(ref, () => ({
    show(info) {
      const selectedList = info.selectedList
      setList(selectedList.length ? selectedList : [info.musicInfo])
      setQuality('128k')
      setLoading(false)
      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const handleConfirm = useCallback(() => {
    setLoading(true)
    void createDownloadTasks(list, quality).then(() => {
      dialogRef.current?.setVisible(false)
      toast(t('download_add_tip'))
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [list, quality, t])

  return (
    <Dialog ref={dialogRef} title={t('download_select_quality')} height={280}>
      <View style={styles.content}>
        <Text style={styles.tip} size={13} color={theme['c-font-label']}>
          {list.length > 1
            ? t('download_multi_tip', { num: list.length })
            : `${list[0]?.name}${list[0]?.singer ? ' - ' + list[0].singer : ''}`}
        </Text>
        <View style={styles.qualityList}>
          {
            DOWNLOAD_QUALITYS.map(q => {
              const sizeLabel = getQualitySizeLabel(list, q)
              return (
                <CheckBox key={q} check={quality == q} label={sizeLabel ? `${q} · ${sizeLabel}` : q} onChange={() => { setQuality(q) }} marginRight={8} />
              )
            })
          }
        </View>
        <View style={styles.btnRow}>
          <Button
            onPress={() => { dialogRef.current?.setVisible(false) }}
            style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
          >
            <Text color={theme['c-button-font']}>{t('cancel')}</Text>
          </Button>
          <Button
            onPress={handleConfirm}
            disabled={loading}
            style={{ ...styles.btn, backgroundColor: theme['c-primary'] }}
          >
            <Text color="#fff">{loading ? t('loading') : t('confirm')}</Text>
          </Button>
        </View>
      </View>
    </Dialog>
  )
}))

interface DownloadQualityDialogProps {
  onAdded?: () => void
}
export interface DownloadQualityDialogType {
  show: (info: SelectInfo) => void
}

export default forwardRef<DownloadQualityDialogType, DownloadQualityDialogProps>((props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    show(info) {
      if (visible) modalRef.current?.show(info)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          modalRef.current?.show(info)
        })
      }
    },
  }))

  return visible ? <Modal ref={modalRef} /> : null
})

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    padding: 15,
    gap: 15,
  },
  tip: {
    flexShrink: 1,
  },
  qualityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 'auto',
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
})
