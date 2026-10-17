import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { TRY_QUALITYS_LIST } from '@/core/music/utils'

const DOWNLOAD_QUALITYS = [...TRY_QUALITYS_LIST, '128k'] as LX.Quality[]

const useActive = (id: LX.Quality) => {
  const q = useSettingValue('download.quality')
  const isActive = useMemo(() => q == id, [q, id])
  return isActive
}

const Item = ({ id }: { id: LX.Quality }) => {
  const isActive = useActive(id)
  return <CheckBox marginRight={8} check={isActive} label={id} onChange={() => { updateSetting({ 'download.quality': id }) }} need />
}

export default memo(() => {
  const t = useI18n()
  const qualityList = useMemo(() => [...DOWNLOAD_QUALITYS].reverse(), [])

  return (
    <SubTitle title={t('setting_download_quality')}>
      <View style={styles.list}>
        {
          qualityList.map((q) => <Item id={q} key={q} />)
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
