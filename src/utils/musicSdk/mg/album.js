import { createHttpFetch } from './utils'
import { filterMusicInfoList } from './musicInfo'
import { formatPlayCount } from '../../index'
import { httpFetch } from '../../request'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  handleAlbumResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(info => ({
      id: `mg_${info.id}`,
      source: 'mg',
      albumId: info.id,
      name: info.name ?? '',
      singer: info.singer ?? '',
      img: info.imgItems?.length ? info.imgItems[0].img : null,
      desc: info.desc ?? '',
      songCount: null,
      publishTime: info.publishDate ?? null,
    }))
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return httpFetch(`http://pd.musicapp.migu.cn/MIGUM2.0/v1.0/content/search_all.do?ua=Android_migu&version=5.0.1&text=${encodeURIComponent(str)}&pageNo=${page}&pageSize=${limit}&searchSwitch=%7B%22song%22%3A0%2C%22album%22%3A1%2C%22singer%22%3A0%2C%22tagSong%22%3A0%2C%22mvSong%22%3A0%2C%22songlist%22%3A0%2C%22bestShow%22%3A1%7D`).promise.then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.code !== '000000' || !body.albumResultData) return this.search(str, page, limit, ++retryNum)
      const total = parseInt(body.albumResultData.totalCount) || 0
      this.total = total
      this.page = page
      this.allPage = Math.ceil(total / limit)
      return Promise.resolve({
        list: this.handleAlbumResult(body.albumResultData.result),
        allPage: this.allPage,
        total,
        limit,
        source: 'mg',
      })
    })
  },
  /**
   * 通过AlbumId获取专辑
   * @param {*} id
   * @param {*} page
   */
  async getAlbumDetail(id, page = 1) {
    const list = await createHttpFetch(`http://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/queryAlbumSong?albumId=${id}&pageNo=${page}`)
    if (!list.songList) return Promise.reject(new Error('Get album list error.'))

    const songList = filterMusicInfoList(list.songList)
    const listInfo = await this.getAlbumInfo(id)

    return {
      list: songList || [],
      page,
      limit: listInfo.total,
      total: listInfo.total,
      source: 'mg',
      info: {
        name: listInfo.name,
        img: listInfo.image,
        desc: listInfo.desc,
        author: listInfo.author,
        play_count: listInfo.play_count,
      },
    }
  },
  /**
   * 通过AlbumId获取专辑信息
   * @param {*} id
   * @param {*} page
   */
  async getAlbumInfo(id) {
    const info = await createHttpFetch(`https://app.c.nf.migu.cn/MIGUM3.0/resource/album/v2.0?albumId=${id}`)
    if (!info) return Promise.reject(new Error('Get album info error.'))

    return {
      name: info.title,
      image: info.imgItems.length ? info.imgItems[0].img : null,
      desc: info.summary,
      author: info.singer,
      play_count: formatPlayCount(info.opNumItem.playNum),
      total: info.totalCount,
    }
  },
}
