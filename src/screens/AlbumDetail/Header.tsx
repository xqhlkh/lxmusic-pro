import { memo } from 'react'
import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import Image from '@/components/common/Image'
import { useAlbumInfo } from './state'
import { handlePlayAll } from './listAction'

export default memo(({ detail }: { detail: LX.Album.AlbumDetailInfo | null }) => {
  const theme = useTheme()
  const t = useI18n()
  const info = useAlbumInfo()

  const handlePlay = () => {
    void handlePlayAll(info)
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme['c-border-background'] }]}>
      <View style={[styles.cover, { backgroundColor: theme['c-content-background'] }]}>
        <Image url={detail?.img ?? info.img} style={styles.coverImg} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} color={theme['c-font']} size={16} numberOfLines={2}>{detail?.name ?? info.name}</Text>
        <Text style={styles.singer} color={theme['c-font-label']} size={13} numberOfLines={1}>
          {detail?.author ?? info.singer}{info.songCount ? ` · ${info.songCount}首` : ''}
        </Text>
        {detail?.desc
          ? <Text style={styles.desc} color={theme['c-font-label']} size={12} numberOfLines={2}>{detail.desc}</Text>
          : null}
        <View style={styles.btnRow}>
          <Button onPress={handlePlay} style={{ ...styles.btn, backgroundColor: theme['c-primary'] }}>
            <Text color="#fff" size={13}>{t('play_all')}</Text>
          </Button>
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginTop: 16,
    borderBottomWidth: BorderWidths.normal,
  },
  cover: {
    width: 96,
    height: 96,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
  },
  singer: {
    flexShrink: 1,
  },
  desc: {
    flexShrink: 1,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 4,
  },
})
