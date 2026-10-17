import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { getAlbumDetail } from '@/core/album'
import { handlePlayAll } from './listAction'
import Header from './Header'
import { useAlbumInfo } from './state'

export interface MusicListType {
  loadList: (source: LX.OnlineSource, albumId: string | number) => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const isUnmountedRef = useRef(false)
  const info = useAlbumInfo()
  const [detail, setDetail] = useState<LX.Album.AlbumDetailInfo | null>(null)
  const listInfoRef = useRef<LX.Music.MusicInfoOnline[]>([])

  useImperativeHandle(ref, () => ({
    async loadList(source, albumId) {
      listRef.current?.setList([])
      listRef.current?.setStatus('loading')
      return getAlbumDetail(source, albumId).then((albumDetail) => {
        if (isUnmountedRef.current) return
        listInfoRef.current = albumDetail.list
        setDetail(albumDetail.info)
        requestAnimationFrame(() => {
          listRef.current?.setList(albumDetail.list)
          listRef.current?.setStatus('end')
        })
      }).catch(() => {
        listRef.current?.setStatus('error')
      })
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handlePlayList: OnlineListProps['onPlayList'] = () => {
    void handlePlayAll(info)
  }
  const handleRefresh: OnlineListProps['onRefresh'] = () => {    listRef.current?.setStatus('refreshing')
    void getAlbumDetail(info.source, info.albumId).then((albumDetail) => {
      if (isUnmountedRef.current) return
      listInfoRef.current = albumDetail.list
      setDetail(albumDetail.info)
      listRef.current?.setList(albumDetail.list)
      listRef.current?.setStatus('end')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const header = useMemo(() => <Header detail={detail} />, [detail])

  return <OnlineList
    ref={listRef}
    onPlayList={handlePlayList}
    onRefresh={handleRefresh}
    onLoadMore={() => { listRef.current?.setStatus('end') }}
    ListHeaderComponent={header}
  />
})
