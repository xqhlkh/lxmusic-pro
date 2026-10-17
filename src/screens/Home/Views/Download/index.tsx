import { useCallback, useMemo, useRef } from 'react'
import { View, FlatList, TouchableOpacity, type ListRenderItemInfo } from 'react-native'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useDownloadList } from '@/store/download/hook'
import { startDownloadTasks, pauseDownloadTasks, removeDownloadTasks } from '@/core/download'
import { DOWNLOAD_STATUS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'

const ITEM_HEIGHT = 72

const ProgressBar = ({ progress, color, background }: { progress: number, color: string, background: string }) => {
  return (
    <View style={[styles.progressTrack, { backgroundColor: background }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }]} />
    </View>
  )
}

const DownloadItem = ({ item, onPause, onResume, onRemove }: {
  item: LX.Download.ListItem
  onPause: (item: LX.Download.ListItem) => void
  onResume: (item: LX.Download.ListItem) => void
  onRemove: (item: LX.Download.ListItem) => void
}) => {
  const theme = useTheme()
  const isCompleted = item.status == DOWNLOAD_STATUS.COMPLETED
  const isPause = item.status == DOWNLOAD_STATUS.PAUSE || item.status == DOWNLOAD_STATUS.ERROR
  const canControl = isCompleted || isPause

  const statusText = useMemo(() => {
    if (isCompleted) return global.i18n.t('download_status_completed')
    if (item.status == DOWNLOAD_STATUS.RUN) {
      return `${item.progress}% ${item.speed}`
    }
    return item.statusText
  }, [isCompleted, item.status, item.progress, item.speed, item.statusText])

  return (
    <View style={[styles.item, { borderBottomColor: theme['c-border-background'] }]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} color={theme['c-font']} size={13} numberOfLines={1}>
          {item.metadata.musicInfo.name}
          {item.metadata.musicInfo.singer ? <Text color={theme['c-font-label']} size={12} numberOfLines={1}> - {item.metadata.musicInfo.singer}</Text> : null}
        </Text>
        <Text style={styles.itemStatus} color={theme['c-font-label']} size={12} numberOfLines={1}>
          {item.metadata.quality} · {statusText}
        </Text>
        <ProgressBar
          progress={item.progress}
          color={isCompleted ? theme['c-primary'] : theme['c-primary']}
          background={theme['c-primary-alpha-900']}
        />
      </View>
      <View style={styles.itemBtns}>
        {
          isCompleted
            ? null
            : (
                <Button style={styles.itemBtn} onPress={() => { item.status == DOWNLOAD_STATUS.RUN ? onPause(item) : onResume(item) }}>
                  <Icon name={item.status == DOWNLOAD_STATUS.RUN ? 'pause' : 'play'} color={theme['c-button-font']} size={20} />
                </Button>
              )
        }
        <Button style={styles.itemBtn} onPress={() => { onRemove(item) }}>
          <Icon name="remove" color={theme['c-button-font']} size={20} />
        </Button>
      </View>
    </View>
  )
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const list = useDownloadList()

  const handlePause = useCallback((item: LX.Download.ListItem) => {
    void pauseDownloadTasks([item])
  }, [])
  const handleResume = useCallback((item: LX.Download.ListItem) => {
    void startDownloadTasks([item])
  }, [])
  const handleRemove = useCallback((item: LX.Download.ListItem) => {
    void removeDownloadTasks([item.id])
  }, [])
  const handleClearCompleted = useCallback(() => {
    const ids = list.filter(i => i.status == DOWNLOAD_STATUS.COMPLETED).map(i => i.id)
    if (ids.length) void removeDownloadTasks(ids)
  }, [list])

  const renderItem = useCallback(({ item }: ListRenderItemInfo<LX.Download.ListItem>) => {
    return <DownloadItem item={item} onPause={handlePause} onResume={handleResume} onRemove={handleRemove} />
  }, [handlePause, handleResume, handleRemove])
  const getkey = useCallback((item: LX.Download.ListItem) => item.id, [])

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme['c-border-background'] }]}>
        <Text style={styles.headerTitle} color={theme['c-font']} size={15}>{t('download')}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClearCompleted}>
          <Icon name="remove" color={theme['c-button-font']} size={18} />
        </TouchableOpacity>
      </View>
      {
        list.length
          ? (
              <FlatList
                style={styles.list}
                data={list}
                renderItem={renderItem}
                keyExtractor={getkey}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
              />
            )
          : (
              <View style={styles.empty}>
                <Text color={theme['c-font-label']}>{t('download_empty')}</Text>
              </View>
            )
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderBottomWidth: BorderWidths.normal,
  },
  headerTitle: {
    flex: 1,
  },
  headerBtn: {
    padding: 6,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: 12,
    borderBottomWidth: BorderWidths.normal,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    flexShrink: 1,
  },
  itemStatus: {
    flexShrink: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  itemBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  itemBtn: {
    padding: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
