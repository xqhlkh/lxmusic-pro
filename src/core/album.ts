import musicSdk from '@/utils/musicSdk'
import { toNewMusicInfo } from '@/utils'

/**
 * 获取专辑详情（歌曲列表）
 */
export const getAlbumDetail = async(source: LX.OnlineSource, albumId: string | number, page = 1): Promise<LX.Album.AlbumDetail> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const detail = await ((musicSdk[source] as any)?.album?.getAlbumDetail(albumId, page) ?? Promise.reject(new Error('source not found: ' + source)))
  return {
    ...detail,
    list: detail.list.map((item: any) => toNewMusicInfo(item) as LX.Music.MusicInfoOnline),
  }
}
