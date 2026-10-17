import { useEffect, useRef } from 'react'

import MusicList, { type MusicListType } from './MusicList'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import PlayerBar from '@/components/player/PlayerBar'
import { AlbumInfoContext } from './state'


export default ({ componentId, info }: { componentId: string, info: LX.Album.AlbumInfo }) => {
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    isUnmountedRef.current = false

    musicListRef.current?.loadList(info.source, info.albumId)


    return () => {
      isUnmountedRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
    <PageContent>
      <StatusBar />
      <AlbumInfoContext.Provider value={info}>
        <MusicList ref={musicListRef} />
      </AlbumInfoContext.Provider>
      <PlayerBar />
    </PageContent>
  )
}
