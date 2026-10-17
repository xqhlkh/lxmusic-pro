import { memo } from 'react'

import Section from '../../components/Section'
import SavePath from './SavePath'
import Quality from './Quality'
import MaxDownloadNum from './MaxDownloadNum'
import SkipExistFile from './SkipExistFile'
import FileName from './FileName'

import { useI18n } from '@/lang'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_download')}>
      <SavePath />
      <Quality />
      <FileName />
      <MaxDownloadNum />
      <SkipExistFile />
    </Section>
  )
})
