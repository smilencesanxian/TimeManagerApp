import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { aiApi, commentApi, authApi } from '../../../services/api'
import styles from './index.module.scss'

const DEFAULT_SUGGESTIONS = [
  '今天表现得非常好，继续保持！',
  '很棒的进步，爸爸妈妈为你骄傲！',
  '你的努力我们都看到了，加油！',
  '太厉害了，比昨天又进步了！',
  '认真学习的你最可爱！',
]

export default function CommentPage() {
  const [children, setChildren] = useState<Array<{ id: string; nickname: string }>>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [commentText, setCommentText] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [showEmptyError, setShowEmptyError] = useState(false)
  const [sending, setSending] = useState(false)

  const isOverLimit = commentText.length > 200
  const canSend = !isOverLimit && !sending

  useEffect(() => {
    authApi.getChildren().then((list) => {
      setChildren(list)
      if (list.length > 0) {
        setSelectedChildId(list[0].id)
        loadSuggestions(list[0].nickname)
      }
    }).catch(() => {
      setSuggestions(DEFAULT_SUGGESTIONS)
      setSuggestionsLoaded(true)
    })
  }, [])

  async function loadSuggestions(childName: string) {
    try {
      const result = await aiApi.suggestComments(childName)
      setSuggestions(result.length >= 3 ? result : DEFAULT_SUGGESTIONS)
    } catch {
      setSuggestions(DEFAULT_SUGGESTIONS)
    } finally {
      setSuggestionsLoaded(true)
    }
  }

  function handleSelectSuggestion(idx: number) {
    setSelectedSuggestion(idx)
    setCommentText(suggestions[idx] ?? '')
    setShowEmptyError(false)
  }

  async function handleSend() {
    if (!commentText.trim()) {
      setShowEmptyError(true)
      return
    }
    if (isOverLimit) return
    if (!selectedChildId) {
      Taro.showToast({ title: '请先选择孩子', icon: 'none' })
      return
    }

    setSending(true)
    try {
      await commentApi.send(selectedChildId, commentText.trim())
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 2000)
      setCommentText('')
      setSelectedSuggestion(-1)
    } catch (err: unknown) {
      const error = err as { message?: string }
      Taro.showToast({ title: error.message ?? '发送失败', icon: 'none' })
    } finally {
      setSending(false)
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>发送心语</Text>
      </View>

      {children.length > 1 && (
        <View className={styles.childRow}>
          {children.map((c) => (
            <View
              key={c.id}
              className={[styles.childBtn, selectedChildId === c.id ? styles.childBtnActive : ''].join(' ')}
              onClick={() => setSelectedChildId(c.id)}
            >
              <Text>{c.nickname}</Text>
            </View>
          ))}
        </View>
      )}

      {suggestionsLoaded && (
        <View className={styles.suggestions} data-testid='ai-comment-suggestions'>
          <Text className={styles.suggestLabel}>AI推荐评语</Text>
          <View className={styles.suggestionList}>
            {suggestions.map((s, i) => (
              <View
                key={i}
                data-testid={`comment-suggestion-${i}`}
                className={[
                  styles.suggestionItem,
                  selectedSuggestion === i ? styles.selected : '',
                ].join(' ')}
                onClick={() => handleSelectSuggestion(i)}
              >
                <Text>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.inputSection}>
        <textarea
          data-testid='input-comment-text'
          className={[styles.textarea, isOverLimit ? styles.textareaError : ''].join(' ')}
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value)
            setShowEmptyError(false)
          }}
          placeholder='在这里输入您的心语...'
          maxLength={300}
        />
        <View
          data-testid='comment-length-counter'
          className={[styles.counter, isOverLimit ? styles.error : ''].join(' ')}
        >
          <Text>{commentText.length}/200</Text>
        </View>
        {showEmptyError && (
          <View data-testid='comment-empty-error' className={styles.emptyError}>
            <Text>请输入评语内容</Text>
          </View>
        )}
      </View>

      <button
        data-testid='btn-send-comment'
        className={styles.sendBtn}
        disabled={!canSend}
        onClick={handleSend}
      >
        发送心语
      </button>

      {showSuccessToast && (
        <View data-testid='send-comment-success-toast' className={styles.successToast}>
          <Text>心语已发送！</Text>
        </View>
      )}
    </View>
  )
}
