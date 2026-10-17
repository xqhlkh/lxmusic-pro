import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity, RefreshControl, type FlatListProps, type ListRenderItemInfo } from 'react-native'

import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { search } from '@/core/search/album'
import searchAlbumState, { type Source } from '@/store/search/album/state'

type FlatListType = FlatListProps<LX.Album.AlbumInfo>

export interface AlbumListType {
  loadList: (text: string, source: Source) => void
}

interface AlbumListProps {
  onOpenDetail: (item: LX.Album.AlbumInfo) => void
}

type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'

const ITEM_HEIGHT = 76

const AlbumItem = ({ item, showSource, onPress }: {
  item: LX.Album.AlbumInfo
  showSource: boolean
  onPress: (item: LX.Album.AlbumInfo) => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: theme['c-border-background'] }]}
      activeOpacity={0.6}
      onPress={() => { onPress(item) }}
    >
      <View style={[styles.cover, { backgroundColor: theme['c-content-background'] }]}>
        <Image url={item.img} style={styles.coverImg} />
        {showSource ? <Text style={styles.sourceLabel} size={9} color="#fff">{item.source}</Text> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} color={theme['c-font']} size={14} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.desc} color={theme['c-font-label']} size={12} numberOfLines={1}>
          {item.singer}{item.songCount ? ` · ${item.songCount}首` : ''}
        </Text>
        {item.publishTime ? <Text style={styles.desc} color={theme['c-font-label']} size={12} numberOfLines={1}>{item.publishTime}</Text> : null}
      </View>
    </TouchableOpacity>
  )
}

export default forwardRef<AlbumListType, AlbumListProps>(({ onOpenDetail }, ref) => {
  const listRef = useRef<FlatList>(null)
  const [list, setList] = useState<LX.Album.AlbumInfo[]>([])
  const [showSource, setShowSource] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  const theme = useTheme()
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    async loadList(text, source) {
      setList([])
      setShowSource(source == 'all')
      if (searchAlbumState.searchText == text && searchAlbumState.source == source && searchAlbumState.listInfos[searchAlbumState.source]!.list.length) {
        const cacheList = searchAlbumState.listInfos[searchAlbumState.source]!.list
        requestAnimationFrame(() => {
          setList(cacheList)
        })
      } else {
        setStatus('loading')
        const page = 1
        searchInfoRef.current.text = text
        searchInfoRef.current.source = source
        return search(text, page, source).then((result) => {
          if (isUnmountedRef.current) return
          requestAnimationFrame(() => {
            setList(result)
            setStatus(searchAlbumState.listInfos[searchAlbumState.source]!.maxPage <= page ? 'end' : 'idle')
          })
        }).catch(() => {
          setStatus('error')
        })
      }
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const handleRefresh = useCallback(() => {
    const page = 1
    setStatus('refreshing')
    void search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((result) => {
      if (isUnmountedRef.current) return
      setList(result)
      setStatus(searchAlbumState.listInfos[searchInfoRef.current.source]!.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      setStatus('error')
    })
  }, [])

  const handleLoadMore = useCallback(() => {
    if (status != 'idle') return
    setStatus('loading')
    const info = searchAlbumState.listInfos[searchInfoRef.current.source]!
    const page = info.list.length ? info.page + 1 : 1
    void search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((result) => {
      if (isUnmountedRef.current) return
      setList(result)
      setStatus(info.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      setStatus('error')
    })
  }, [status])

  const renderItem = useCallback(({ item }: ListRenderItemInfo<LX.Album.AlbumInfo>) => (
    <AlbumItem item={item} showSource={showSource} onPress={onOpenDetail} />
  ), [onOpenDetail, showSource])
  const getkey = useCallback((item: LX.Album.AlbumInfo) => item.id, [])

  const footerComponent = useMemo(() => {
    let label: string | null = null
    switch (status) {
      case 'refreshing': return null
      case 'loading': label = t('list_loading'); break
      case 'end': label = t('list_end'); break
      case 'error': label = t('list_error'); break
      case 'idle': label = null; break
    }
    return label
      ? (
          <View style={{ width: '100%' }}>
            <Text onPress={() => { if (status == 'error') handleLoadMore() }} style={styles.footer} color={theme['c-font-label']}>{label}</Text>
          </View>
        )
      : null
  }, [handleLoadMore, status, t, theme])

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={list}
        renderItem={renderItem}
        keyExtractor={getkey}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        onEndReachedThreshold={0.6}
        onEndReached={handleLoadMore}
        refreshControl={(
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={status == 'refreshing'}
            onRefresh={handleRefresh} />
        )}
        ListFooterComponent={footerComponent}
      />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    borderBottomWidth: BorderWidths.normal,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  sourceLabel: {
    paddingLeft: 4,
    paddingBottom: 2,
    paddingRight: 4,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  info: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
  },
  name: {
    flexShrink: 1,
  },
  desc: {
    flexShrink: 1,
  },
  footer: {
    textAlign: 'center',
    padding: 10,
  },
})
