import { sizeFormate, formatPlayTime } from '../../index'
import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetail from './musicDetail'

const formatPublishTime = (publishTime) => {
  if (!publishTime) return null
  const date = new Date(publishTime)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default {
  limit: 20,
  total: 0,
  page: 0,
  allPage: 1,
  handleAlbumResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(item => ({
      id: `wy_${item.id}`,
      source: 'wy',
      albumId: item.id,
      name: item.name ?? '',
      singer: item.artist?.name ?? '',
      img: item.picUrl ?? null,
      desc: item.description ?? item.briefDesc ?? '',
      songCount: item.size ?? null,
      publishTime: formatPublishTime(item.publishTime),
    }))
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return httpFetch('https://music.163.com/api/search/get/web', {
      method: 'post',
      form: {
        s: str,
        type: 10,
        offset: limit * (page - 1),
        total: page == 1,
        limit,
      },
    }).promise.then(({ statusCode, body }) => {
      const result = body?.result
      if (statusCode !== 200 || !body || body.code !== 200 || !result) return this.search(str, page, limit, ++retryNum)
      const total = result.albumCount ?? result.albums?.length ?? 0
      this.total = total
      this.page = page
      this.allPage = Math.ceil(total / limit)
      return Promise.resolve({
        list: this.handleAlbumResult(result.albums),
        allPage: this.allPage,
        total,
        limit,
        source: 'wy',
      })
    })
  },
  buildDetailResult(body) {
    const album = body.album ?? {}
    const rawSongs = Array.isArray(body.songs) ? body.songs : (Array.isArray(album.songs) ? album.songs : [])
    const normalizedSongs = rawSongs.map(song => ({
      ...song,
      ar: song.artists ?? song.ar,
      h: song.hMusic ?? song.h,
      m: song.mMusic ?? song.m,
      l: song.lMusic ?? song.l,
      sq: song.sqMusic ?? song.sq,
      hr: song.hrMusic ?? song.hr,
      dt: song.duration ?? song.dt,
      al: { ...((song.album && song.album.name ? song.album : {}) ?? {}), id: album.id, name: album.name, picUrl: album.picUrl },
    }))
    const privileges = normalizedSongs.map(song => ({
      id: song.id,
      maxBrLevel: (song.hrMusic ?? song.hr) ? 'hires' : '',
      maxbr: (song.sqMusic ?? song.sq) ? 999000 : (song.hMusic ?? song.h) ? 320000 : (song.mMusic ?? song.m) ? 192000 : (song.lMusic ?? song.l) ? 128000 : 0,
    }))
    const list = musicDetail.filterList({ songs: normalizedSongs, privileges })
    return {
      list,
      page: 1,
      limit: list.length,
      total: list.length,
      source: 'wy',
      info: {
        name: album.name ?? '',
        img: album.picUrl ?? null,
        desc: album.description ?? album.briefDesc ?? '',
        author: album.artist?.name ?? '',
      },
    }
  },
  getAlbumDetailWeapi(id) {
    const data = weapi({ csrf_token: '' })
    return httpFetch(`https://music.163.com/weapi/v1/album/${id}?csrf_token=`, {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
      form: data,
    }).promise.then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.code !== 200 || !body.album) return Promise.reject(new Error('get album detail failed'))
      return this.buildDetailResult(body)
    })
  },
  getAlbumDetail(id, retryNum = 0) {
    if (retryNum > 2) return this.getAlbumDetailWeapi(id)
    return httpFetch(`https://music.163.com/api/album/${id}`, {
      headers: {
        Referer: 'https://music.163.com/',
      },
    }).promise.then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.code !== 200 || !body.album) return this.getAlbumDetail(id, ++retryNum)
      return Promise.resolve(this.buildDetailResult(body))
    })
  },
}
