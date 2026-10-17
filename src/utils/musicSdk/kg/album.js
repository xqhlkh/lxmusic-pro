import { createHttpFetch } from './util'
import { httpFetch } from '../../request'
import { decodeName, formatPlayTime, sizeFormate } from '../../index'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  handleAlbumResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(info => ({
      id: `kg_${info.albumid}`,
      source: 'kg',
      albumId: info.albumid,
      name: info.albumname ?? '',
      singer: info.singername ?? '',
      img: info.imgurl ? info.imgurl.replace('{size}', '240') : null,
      desc: info.intro ?? '',
      songCount: info.songcount ?? null,
      publishTime: info.publishtime ?? null,
    }))
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return httpFetch(`http://mobilecdn.kugou.com/api/v3/search/album?format=json&keyword=${encodeURIComponent(str)}&page=${page}&pagesize=${limit}&showtype=1`).promise.then(({ statusCode, body }) => {
      if (statusCode !== 200 || !body || body.status !== 1 || !body.data) return this.search(str, page, limit, ++retryNum)
      const total = body.data.total || 0
      this.total = total
      this.page = page
      this.allPage = Math.ceil(total / limit)
      return Promise.resolve({
        list: this.handleAlbumResult(body.data.info),
        allPage: this.allPage,
        total,
        limit,
        source: 'kg',
      })
    })
  },
  /**
   * 通过AlbumId获取专辑信息
   * @param {*} id
   */
  async getAlbumInfo(id) {
    const albumInfoRequest = await createHttpFetch('http://kmrserviceretry.kugou.com/container/v1/album?dfid=1tT5He3kxrNC4D29ad1MMb6F&mid=22945702112173152889429073101964063697&userid=0&appid=1005&clientver=11589', {
      method: 'POST',
      body: {
        appid: 1005,
        clienttime: 1681833686,
        clientver: 11589,
        data: [{ album_id: id }],
        fields: 'language,grade_count,intro,mix_intro,heat,category,sizable_cover,cover,album_name,type,quality,publish_company,grade,special_tag,author_name,publish_date,language_id,album_id,exclusive,is_publish,trans_param,authors,album_tag',
        isBuy: 0,
        key: 'e6f3306ff7e2afb494e89fbbda0becbf',
        mid: '22945702112173152889429073101964063697',
        show_album_tag: 0,
      },
    })
    if (!albumInfoRequest) return Promise.reject(new Error('get album info failed.'))
    const albumInfo = albumInfoRequest[0]

    return {
      name: albumInfo.album_name,
      image: albumInfo.sizable_cover.replace('{size}', 240),
      desc: albumInfo.intro,
      authorName: albumInfo.author_name,
      // play_count: this.formatPlayCount(info.count),
    }
  },
  /**
   * 通过AlbumId获取专辑
   * @param {*} id
   * @param {*} page
   */
  async getAlbumDetail(id, page = 1, limit = 200) {
    const albumList = await createHttpFetch(`http://mobiles.kugou.com/api/v3/album/song?version=9108&albumid=${id}&plat=0&pagesize=${limit}&area_code=0&page=${page}&with_res_tag=0`, {})
    if (!albumList.info) return Promise.reject(new Error('Get album list failed.'))

    const info = await this.getAlbumInfo(id)

    return {
      list: this.filterAlbumSongs(albumList.info, info.name, id),
      page,
      limit,
      total: albumList.total,
      source: 'kg',
      info: {
        name: info.name,
        img: info.image,
        desc: info.desc,
        author: info.authorName,
        // play_count: this.formatPlayCount(info.count),
      },
    }
  },
  /**
   * 专辑歌曲列表直映射（专辑歌曲接口自带文件信息，无需再调歌曲详情接口）
   */
  filterAlbumSongs(rawList, albumName, albumId) {
    if (!rawList || !Array.isArray(rawList)) return []
    return rawList.map(item => {
      const types = []
      const _types = {}
      if (parseInt(item.filesize) > 0) {
        const size = sizeFormate(parseInt(item.filesize))
        types.push({ type: '128k', size, hash: item.hash })
        _types['128k'] = { size, hash: item.hash }
      }
      if (parseInt(item['320filesize']) > 0) {
        const size = sizeFormate(parseInt(item['320filesize']))
        types.push({ type: '320k', size, hash: item['320hash'] })
        _types['320k'] = { size, hash: item['320hash'] }
      }
      if (parseInt(item.sqfilesize) > 0) {
        const size = sizeFormate(parseInt(item.sqfilesize))
        types.push({ type: 'flac', size, hash: item.sqhash })
        _types.flac = { size, hash: item.sqhash }
      }
      let singer = ''
      let name = item.filename ?? ''
      const splitIndex = name.indexOf(' - ')
      if (splitIndex > -1) {
        singer = name.substring(0, splitIndex)
        name = name.substring(splitIndex + 3)
      }
      const duration = parseInt(item.duration)
      return {
        singer: decodeName(singer),
        name: decodeName(name),
        albumName,
        albumId,
        songmid: item.audio_id,
        source: 'kg',
        interval: Number.isNaN(duration) ? null : formatPlayTime(duration),
        img: null,
        lrc: null,
        hash: item.hash,
        otherSource: null,
        types,
        _types,
        typeUrl: {},
      }
    })
  },
}
