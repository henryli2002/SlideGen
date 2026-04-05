<template>
  <div class="ai-image-dialog">
    <div class="header">
      <span class="title">AI 生图</span>
      <span class="subtitle">描述你想要的图片，系统将按已配置的服务自动搜索或生成</span>
    </div>

    <div class="input-row">
      <Input
        ref="inputRef"
        v-model:value="keyword"
        placeholder="输入关键词，如：technology, teamwork, nature..."
        :maxlength="100"
        @enter="generate()"
      />
      <div class="generate-btn" :class="{ 'loading': generating }" @click="generate()">
        <span v-if="!generating"><i-icon-park-outline:magic class="icon" /> 生成</span>
        <span v-else class="spinner"></span>
      </div>
    </div>

    <div class="preview-area">
      <div class="placeholder" v-if="!previewUrl && !generating">
        <i-icon-park-outline:picture-one class="placeholder-icon" />
        <span>生成后在此预览</span>
      </div>
      <div class="loading-mask" v-else-if="generating">
        <span class="spinner large"></span>
        <span class="loading-tip">图片生成中…</span>
      </div>
      <img v-else :src="previewUrl" class="preview-img" />
    </div>

    <div class="source-tip" v-if="sourceLabel">
      <i-icon-park-outline:info class="tip-icon" /> 图片来源：{{ sourceLabel }}
    </div>

    <div class="btns">
      <div
        class="confirm-btn"
        :class="{ 'disabled': !previewUrl || generating }"
        @click="confirm()"
      >
        <i-icon-park-outline:check-one class="icon" /> {{ confirmLabel }}
      </div>
      <div class="cancel-btn" @click="$emit('close')">取消</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue'
import api from '@/services'
import message from '@/utils/message'
import Input from '@/components/Input.vue'

const props = defineProps<{
  mode?: 'insert' | 'replace'
}>()

const emit = defineEmits<{
  (e: 'confirm', url: string): void
  (e: 'close'): void
}>()

const keyword = ref('')
const previewUrl = ref('')
const imageSource = ref('')
const imageFailed = ref<string[]>([])
const generating = ref(false)
const inputRef = useTemplateRef<InstanceType<typeof Input>>('inputRef')

const confirmLabel = computed(() => props.mode === 'replace' ? '替换图片' : '插入图片')

const sourceLabel = computed(() => {
  if (!previewUrl.value) return ''
  if (imageSource.value === 'pexels') return 'Pexels 图库'
  if (imageSource.value === 'gemini') return 'Gemini AI 生成'
  if (imageSource.value === 'local') return '本地模型生成'
  if (imageSource.value === 'picsum') {
    if (!imageFailed.value.length) return '随机占位图（未配置图片 API）'
    return `随机占位图（${imageFailed.value.join('、')} 调用失败）`
  }
  return '在线图片'
})

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 100)
})

const generate = async () => {
  if (!keyword.value.trim()) return message.error('请输入关键词')
  if (generating.value) return

  generating.value = true
  previewUrl.value = ''
  imageSource.value = ''
  imageFailed.value = []

  try {
    const result = await api.generateImage(keyword.value.trim())
    previewUrl.value = result.url || ''
    imageSource.value = result.source || ''
    imageFailed.value = result.failed || []
    if (!previewUrl.value) message.error('图片获取失败，请重试')
  }
  catch {
    message.error('图片生成失败，请检查后端服务是否运行')
  }
  finally {
    generating.value = false
  }
}

const confirm = () => {
  if (!previewUrl.value || generating.value) return
  emit('confirm', previewUrl.value)
  emit('close')
}
</script>

<style lang="scss" scoped>
.ai-image-dialog {
  padding: 4px 0;
  width: 420px;
}

.header {
  margin-bottom: 14px;

  .title {
    font-weight: 700;
    font-size: 16px;
    margin-right: 8px;
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    color: transparent;
  }
  .subtitle {
    display: block;
    font-size: 11px;
    color: #999;
    margin-top: 4px;
    line-height: 1.5;
  }
}

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;

  .generate-btn {
    flex-shrink: 0;
    height: 32px;
    padding: 0 14px;
    background: $themeColor;
    color: #fff;
    border-radius: $borderRadius;
    font-size: 13px;
    display: flex;
    align-items: center;
    cursor: pointer;
    white-space: nowrap;

    &:hover { background: $themeHoverColor; }
    &.loading { opacity: 0.7; cursor: not-allowed; }

    .icon { margin-right: 4px; font-size: 14px; }
  }
}

.preview-area {
  width: 100%;
  height: 210px;
  border-radius: $borderRadius;
  border: 1px dashed $borderColor;
  background: #f7f7f7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 8px;

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #bbb;
    font-size: 13px;
    gap: 8px;

    .placeholder-icon { font-size: 36px; }
  }

  .loading-mask {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #888;
    font-size: 13px;
  }

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.source-tip {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;

  .tip-icon { font-size: 12px; }
}

.btns {
  display: flex;
  gap: 8px;
  justify-content: flex-end;

  .confirm-btn {
    height: 30px;
    padding: 0 16px;
    background: $themeColor;
    color: #fff;
    border-radius: $borderRadius;
    font-size: 13px;
    display: flex;
    align-items: center;
    cursor: pointer;

    &:hover { background: $themeHoverColor; }
    &.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
    .icon { margin-right: 4px; }
  }

  .cancel-btn {
    height: 30px;
    padding: 0 16px;
    border: 1px solid $borderColor;
    border-radius: $borderRadius;
    font-size: 13px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: #666;

    &:hover { border-color: $themeColor; color: $themeColor; }
  }
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;

  &.large {
    width: 28px;
    height: 28px;
    border-color: rgba($themeColor, 0.2);
    border-top-color: $themeColor;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
