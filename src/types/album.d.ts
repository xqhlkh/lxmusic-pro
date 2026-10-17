declare namespace LX {
  namespace Album {
    interface AlbumInfo {
      id: string
      source: LX.OnlineSource
      albumId: string | number
      name: string
      singer: string
      img?: string | null
      desc?: string
      songCount?: string | number | null
      publishTime?: string | null
    }

    interface AlbumDetailInfo {
      name: string
      img?: string | null
      desc?: string
      author?: string
    }

    interface AlbumDetail {
      list: LX.Music.MusicInfoOnline[]
      total: number
      page: number
      limit: number
      source: LX.OnlineSource
      info: AlbumDetailInfo
    }
  }
}
