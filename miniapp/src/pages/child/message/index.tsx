import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { commentApi, ParentComment } from '../../../services/api'
import styles from './index.module.scss'

export default function MessagePage() {
  const [comments, setComments] = useState<ParentComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    commentApi.list().then((list) => {
      setComments(list)
    }).catch(() => {
      setComments([])
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>心语墙</Text>
        <Text className={styles.subtitle}>来自爸爸妈妈的鼓励</Text>
      </View>

      {loading ? (
        <View className={styles.loading}>
          <Text>加载中...</Text>
        </View>
      ) : (
        <ScrollView
          scrollY
          className={styles.wall}
          data-testid='message-wall'
        >
          {comments.length === 0 ? (
            <View className={styles.empty}>
              <Text className={styles.emptyIcon}>💬</Text>
              <Text className={styles.emptyText}>还没有心语，继续努力吧！</Text>
            </View>
          ) : (
            comments.map((c, i) => (
              <View key={c.id} data-testid={`message-item-${i}`} className={styles.messageCard}>
                <Text className={styles.content}>{c.content}</Text>
                <Text className={styles.time}>{new Date(c.createdAt).toLocaleDateString('zh-CN')}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}
