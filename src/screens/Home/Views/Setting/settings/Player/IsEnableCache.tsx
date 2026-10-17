import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const isEnableCache = useSettingValue('player.isEnableCache')
  const setEnableCache = (isEnableCache: boolean) => {
    updateSetting({ 'player.isEnableCache': isEnableCache })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={isEnableCache} label={t('setting_player_enable_cache')} onChange={setEnableCache} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
