import searchAlbumState, { type Source } from '@/store/search/album/state'
import searchAlbumActions, { type SearchResult } from '@/store/search/album/action'
import musicSdk from '@/utils/musicSdk'

export const setSource: typeof searchAlbumActions['setSource'] = (source) => {
  searchAlbumActions.setSource(source)
}
export const setSearchText: typeof searchAlbumActions['setSearchText'] = (text) => {
  searchAlbumActions.setSearchText(text)
}
export const setListInfo: typeof searchAlbumActions.setListInfo = (result, page, text) => {
  return searchAlbumActions.setListInfo(result, page, text)
}

export const clearListInfo: typeof searchAlbumActions.clearListInfo = (source) => {
  searchAlbumActions.clearListInfo(source)
}


export const search = async(text: string, page: number, sourceId: Source): Promise<LX.Album.AlbumInfo[]> => {
  const listInfo = searchAlbumState.listInfos[sourceId]!
  if (!text) return []
  const key = `${page}__${text}`
  if (sourceId == 'all') {
    listInfo.key = key
    let task = []
    for (const source of searchAlbumState.sources) {
      if (source == 'all') continue
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      task.push((((musicSdk[source] as any)?.album.search(text, page, searchAlbumState.listInfos.all.limit) as Promise<SearchResult>) ?? Promise.reject(new Error('source not found: ' + source))).catch((error: any) => {
        console.log(error)
        return {
          allPage: 1,
          limit: 30,
          list: [],
          source,
          total: 0,
        }
      }))
    }
    return Promise.all(task).then((results: SearchResult[]) => {
      if (key != listInfo.key) return []
      setSearchText(text)
      setSource(sourceId)
      return setListInfo(results, page, text)
    })
  } else {
    if (listInfo?.key == key && listInfo?.list.length) return listInfo?.list
    listInfo.key = key
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return ((musicSdk[sourceId] as any)?.album.search(text, page, listInfo.limit).then((data: SearchResult) => {
      if (key != listInfo.key) return []
      return setListInfo(data, page, text)
    }) ?? Promise.reject(new Error('source not found: ' + sourceId))).catch((err: any) => {
      if (listInfo.list.length && page == 1) clearListInfo(sourceId)
      throw err
    })
  }
}
