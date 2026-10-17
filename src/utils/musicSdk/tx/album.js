import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'
import { httpFetch } from '../../request'

export default {
  limit: 20,
  total: 0,
  page: 0,
  allPage: 1,
  handleAlbumResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(item => ({
      id: `tx_${item.albumMID}`,
      source: 'tx',
      albumId: item.albumMID,
      name: item.albumName ?? '',
      singer: item.singerName ?? '',
      img: item.albumPic ?? null,
      desc: '',
      songCount: null,
      publishTime: item.publicTime ?? null,
    }))
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return httpFetch(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&t=8&w=${encodeURIComponent(str)}&zhidaqu=1&catZhida=1&perpage=${limit}&n=${limit}&p=${page}`).promise.then(({ statusCode, body }) => {
      const albumData = body?.data?.album
      if (statusCode !== 200 || !body || body.code !== 0 || !albumData) return this.search(str, page, limit, ++retryNum)
      const total = albumData.totalnum ?? 0
      this.total = total
      this.page = page
      this.allPage = Math.ceil(total / limit)
      return Promise.resolve({
        list: this.handleAlbumResult(albumData.list),
        allPage: this.allPage,
        total,
        limit,
        source: 'tx',
      })
    })
  },
  handleDetailResult(rawList, albumName) {
    if (!rawList || !Array.isArray(rawList)) return []
    const list = []
    rawList.forEach(item => {
      if (!item.strMediaMid) return
      const types = []
      const _types = {}
      if (item.size128) {
        const size = sizeFormate(item.size128)
        types.push({ type: '128k', size })
        _types['128k'] = { size }
      }
      if (item.size320) {
        const size = sizeFormate(item.size320)
        types.push({ type: '320k', size })
        _types['320k'] = { size }
      }
      if (item.sizeflac) {
        const size = sizeFormate(item.sizeflac)
        types.push({ type: 'flac', size })
        _types.flac = { size }
      }
      list.push({
        singer: formatSingerName(item.singer, 'name'),
        name: item.songname ?? '',
        albumName,
        albumId: item.albummid,
        source: 'tx',
        interval: formatPlayTime(item.interval ?? 0),
        songId: item.songid,
        albumMid: item.albummid ?? '',
        strMediaMid: item.strMediaMid,
        songmid: item.songmid,
        img: item.albummid
          ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${item.albummid}.jpg`
          : null,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },
  getAlbumDetail(id, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    return httpFetch(`https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?albummid=${id}&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`).promise.then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.code !== 0 || !body.data) return this.getAlbumDetail(id, ++retryNum)
      const data = body.data
      const songs = this.handleDetailResult(data.list, data.name ?? '')
      return Promise.resolve({
        list: songs,
        page: 1,
        limit: songs.length,
        total: data.total ?? songs.length,
        source: 'tx',
        info: {
          name: data.name ?? '',
          img: data.mid ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${data.mid}.jpg` : null,
          desc: data.desc ?? '',
          author: data.singername ?? '',
        },
      })
    })
  },
}
