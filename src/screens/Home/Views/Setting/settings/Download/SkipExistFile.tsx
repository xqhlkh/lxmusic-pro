import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'

import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const val = useSettingValue('download.skipExistFile')
  const update = (skipExistFile: boolean) => {
    updateSetting({ 'download.skipExistFile': skipExistFile })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={val}
        label={t('setting_download_skip_exist_file')}
        onChange={update} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
