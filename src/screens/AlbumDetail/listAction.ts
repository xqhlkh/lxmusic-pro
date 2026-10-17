import { setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { getAlbumDetail } from '@/core/album'
import { LIST_IDS } from '@/config/constant'

const getListId = (id: string | number, source: LX.OnlineSource) => `album__${source}__${id}`

export const handlePlayAll = async(info: LX.Album.AlbumInfo) => {
  const list = (await getAlbumDetail(info.source, info.albumId)).list
  if (!list.length) return
  const listId = getListId(info.albumId, info.source)
  await setTempList(listId, [...list])
  void playList(LIST_IDS.TEMP, 0)
}
