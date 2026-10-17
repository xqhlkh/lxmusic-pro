import { httpFetch } from '../../request'
import { decodeName, formatPlayTime } from '../../index'
import { formatSinger, objStr2JSON } from './util'
import musicSearch from './musicSearch'

// let requestObj_list
export default {
  limit_list: 36,
  limit_song: 1000,
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  albumSearch(str, page, limit) {
    return httpFetch(`http://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(str)}&pn=${page - 1}&rn=${limit}&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=MUSIC_9.1.0&show_copyright_off=0&newver=1&ft=album&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1`).promise
  },
  handleAlbumResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(info => ({
      id: `kw_${info.albumid}`,
      source: 'kw',
      albumId: info.albumid,
      name: decodeName(info.name ?? ''),
      singer: formatSinger(decodeName(info.artist ?? '')),
      img: info.img || info.hts_img || null,
      desc: decodeName(info.info ?? ''),
      songCount: info.musiccnt ?? null,
      publishTime: info.pub ?? null,
    }))
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (retryNum > 2) return this.searchFallbackByMusic(str, page, limit)
    if (limit == null) limit = this.limit
    return this.albumSearch(str, page, limit).then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.SHOW === '0') return this.search(str, page, limit, ++retryNum)
      const total = parseInt(body.total) || 0
      if (!total || !body.albumlist?.length) return this.searchFallbackByMusic(str, page, limit)
      this.total = total
      this.page = page
      this.allPage = Math.ceil(total / limit)
      return Promise.resolve({
        list: this.handleAlbumResult(body.albumlist),
        allPage: this.allPage,
        total,
        limit,
        source: 'kw',
      })
    })
  },
  /**
   * 专辑接口不稳定时的兜底：用歌曲搜索结果按专辑分组
   */
  searchFallbackByMusic(str, page = 1, limit) {
    if (limit == null) limit = this.limit
    return musicSearch.search(str, page, limit).then(({ list }) => {
      const albumMap = new Map()
      for (const item of list) {
        if (!item.albumId && !item.albumName) continue
        const key = item.albumId || item.albumName
        if (!albumMap.has(key)) {
          albumMap.set(key, {
            id: `kw_album_${key}`,
            source: 'kw',
            albumId: item.albumId,
            name: item.albumName || item.name,
            singer: item.singer,
            img: null,
            desc: '',
            songCount: null,
            publishTime: null,
          })
        }
      }
      const albums = [...albumMap.values()].filter(album => album.albumId && album.albumId != '0')
      return Promise.resolve({
        list: albums,
        allPage: 1,
        total: albums.length,
        limit,
        source: 'kw',
      })
    })
  },
  filterListDetail(rawList, albumName, albumId) {
    // console.log(rawList)
    // console.log(rawList.length, rawList2.length)
    return rawList.map((item, inedx) => {
      let formats = (item.formats ?? '').split('|')
      let types = []
      let _types = {}
      if (formats.includes('MP3128')) {
        types.push({ type: '128k', size: null })
        _types['128k'] = {
          size: null,
        }
      }
      // if (formats.includes('MP3192')) {
      //   types.push({ type: '192k', size: null })
      //   _types['192k'] = {
      //     size: null,
      //   }
      // }
      if (formats.includes('MP3H')) {
        types.push({ type: '320k', size: null })
        _types['320k'] = {
          size: null,
        }
      }
      // if (formats.includes('AL')) {
      //   types.push({ type: 'ape', size: null })
      //   _types.ape = {
      //     size: null,
      //   }
      // }
      if (formats.includes('ALFLAC')) {
        types.push({ type: 'flac', size: null })
        _types.flac = {
          size: null,
        }
      }
      if (formats.includes('HIRFLAC')) {
        types.push({ type: 'flac24bit', size: null })
        _types.flac24bit = {
          size: null,
        }
      }
      // types.reverse()
      const songId = item.musicrid ?? (typeof item.MUSICRID == 'string' ? item.MUSICRID.replace('MUSIC_', '') : item.id) ?? ''
      const duration = parseInt(item.duration)
      return {
        singer: formatSinger(decodeName(item.artist ?? '')),
        name: decodeName(item.name ?? ''),
        albumName,
        albumId,
        songmid: songId,
        source: 'kw',
        interval: Number.isNaN(duration) ? null : formatPlayTime(duration),
        img: item.pic ?? item.pic120 ?? null,
        lrc: null,
        otherSource: null,
        types,
        _types,
        typeUrl: {},
      }
    })
  },
  /**
   * 格式化播放数量
   * @param {*} num
   */
  formatPlayCount(num) {
    if (num > 100000000) return parseInt(num / 10000000) / 10 + '亿'
    if (num > 10000) return parseInt(num / 1000) / 10 + '万'
    return num
  },
  getAlbumListDetail(id, page, retryNum = 0) {
    if (!id || id == '0') return Promise.reject(new Error('invalid album id'))
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    const requestObj_listDetail = httpFetch(`http://search.kuwo.cn/r.s?pn=${page - 1}&rn=${this.limit_song}&stype=albuminfo&albumid=${id}&show_copyright_off=0&encoding=utf&vipver=MUSIC_9.1.0`)
    return requestObj_listDetail.promise.then(({ statusCode, body }) => {
      if (statusCode !== 200) return this.getAlbumListDetail(id, page, ++retryNum)
      body = objStr2JSON(body)
      // console.log(body)
      if (!body.musiclist) return this.getAlbumListDetail(id, page, ++retryNum)
      body.name = decodeName(body.name)
      return {
        list: this.filterListDetail(body.musiclist, body.name, body.albumid),
        page,
        limit: this.limit_song,
        total: parseInt(body.songnum),
        source: 'kw',
        info: {
          name: body.name,
          img: body.img || body.hts_img,
          desc: decodeName(body.info),
          author: decodeName(body.artist),
          // play_count: this.formatPlayCount(body.playnum),
        },
      }
    })
  },
  // getAlbumListDetail(id, page, retryNum = 0) {
  //   if (retryNum > 2) return Promise.reject(new Error('try max num'))
  //   return tokenRequest(`http://www.kuwo.cn/api/www/album/albumInfo?albumId=${id}&pn=${page}&rn=${this.limit_song}&httpsStatus=1`).then((resp) => {
  //     return resp.promise.then(({ statusCode, body }) => {
  //       console.log(body)
  //       return Promise.reject(new Error('failed'))
  //       // if (statusCode !== 200) return this.getAlbumListDetail(id, page, ++retryNum)
  //       // const data = body.data
  //       // console.log(data)
  //       // if (!data.musicList) return this.getAlbumListDetail(id, page, ++retryNum)
  //       // return {
  //       //   list: this.filterListDetail(data.musiclist),
  //       //   page,
  //       //   limit: this.limit_song,
  //       //   total: data.total,
  //       //   source: 'kw',
  //       //   info: {
  //       //     name: data.album,
  //       //     img: data.pic,
  //       //     desc: data.albuminfo,
  //       //     author: data.artist,
  //       //     play_count: this.formatPlayCount(data.playCnt),
  //       //   },
  //       // }
  //     })
  //   })
  // },
}
