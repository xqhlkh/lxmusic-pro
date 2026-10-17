import { createContext, useContext } from 'react'

export const AlbumInfoContext = createContext<LX.Album.AlbumInfo>({
  id: '',
  source: 'kw',
  albumId: '',
  name: '',
  singer: '',
})

export const useAlbumInfo = () => {
  return useContext(AlbumInfoContext)
}
