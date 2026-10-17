import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'

type FileNameType = LX.AppSetting['download.fileName']
const FILE_NAME_LIST: FileNameType[] = ['歌名 - 歌手', '歌手 - 歌名', '歌名']

const useActive = (id: FileNameType) => {
  const fileName = useSettingValue('download.fileName')
  const isActive = useMemo(() => fileName == id, [fileName, id])
  return isActive
}

const Item = ({ id }: { id: FileNameType }) => {
  const isActive = useActive(id)
  return <CheckBox marginRight={8} check={isActive} label={id} onChange={() => { updateSetting({ 'download.fileName': id }) }} need />
}

export default memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_file_name')}>
      <View style={styles.list}>
        {
          FILE_NAME_LIST.map((name) => <Item id={name} key={name} />)
        }
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
