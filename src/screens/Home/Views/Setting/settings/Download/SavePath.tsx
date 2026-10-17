import { memo } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { selectManagedFolder } from '@/utils/fs'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath')

  const handleSelect = async() => {
    const dir = await selectManagedFolder(true)
    if (!dir || !dir.isDirectory) return
    updateSetting({ 'download.savePath': dir.path })
  }

  return (
    <SubTitle title={t('setting_download_save_path')}>
      <View style={styles.content}>
        <Button
          onPress={() => { void handleSelect() }}
          style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
        >
          <Text color={theme['c-button-font']}>{t('setting_download_select_folder')}</Text>
        </Button>
        <Text style={styles.path} color={theme['c-font-label']} size={12} numberOfLines={2}>
          {savePath || t('setting_download_save_path_default')}
        </Text>
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  content: {
    flexGrow: 0,
    flexShrink: 1,
    gap: 6,
  },
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  path: {
    flexShrink: 1,
  },
})
