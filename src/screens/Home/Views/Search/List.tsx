import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import type { InitState as SearchState } from '@/store/search/state'
import type { Source as MusicSource } from '@/store/search/music/state'
import type { Source as SongListSource } from '@/store/search/songlist/state'
import MusicList, { type MusicListType } from './MusicList'
import BlankView, { type BlankViewType } from './BlankView'
import SonglistList from './SonglistList'
import AlbumList, { type AlbumListType } from './AlbumList'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

interface ListProps {
  onSearch: (keyword: string) => void
}
export interface ListType {
  loadList: (text: string, source: MusicSource | SongListSource, type: SearchState['searchType']) => void
}

export default forwardRef<ListType, ListProps>(({ onSearch }, ref) => {
  const [listType, setListType] = useState<SearchState['searchType']>('music')
  const [showBlankView, setShowListView] = useState(true)
  const listRef = useRef<MusicListType>(null)
  const albumListRef = useRef<AlbumListType>(null)
  const blankViewRef = useRef<BlankViewType>(null)

  const handleOpenAlbumDetail = useCallback((item: LX.Album.AlbumInfo) => {
    navigations.pushAlbumDetailScreen(commonState.componentIds.home!, item)
  }, [])

  useImperativeHandle(ref, () => ({
    loadList(text, source, type) {
      if (text) {
        setShowListView(false)
        setListType(type)
        // const listDetailInfo = searchMusicState.listDetailInfo
        requestAnimationFrame(() => {
          if (type == 'album') albumListRef.current?.loadList(text, source)
          else listRef.current?.loadList(text, source)
        })
      } else {
        setShowListView(true)
        requestAnimationFrame(() => {
          blankViewRef.current?.show(source)
        })
      }
    },
  }), [])

  return (
    showBlankView
      ? <BlankView ref={blankViewRef} onSearch={onSearch} />
      : listType == 'songlist'
        ? <SonglistList ref={listRef} />
        : listType == 'album'
          ? <AlbumList ref={albumListRef} onOpenDetail={handleOpenAlbumDetail} />
          : <MusicList ref={listRef} />
  )
})
