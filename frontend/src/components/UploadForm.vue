<template>
  <div class="upload-form">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="accountName">アカウント名 <span class="required">*</span></label>
        <input
          id="accountName"
          v-model="formData.accountName"
          type="text"
          placeholder="半角英数字で入力してください"
          :class="{ 'error': errors.accountName }"
        />
        <span v-if="errors.accountName" class="error-message">{{ errors.accountName }}</span>
      </div>

      <div class="form-group">
        <label for="email">メールアドレス <span class="required">*</span></label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="your-email@example.com"
          :class="{ 'error': errors.email }"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>

      <button type="submit" :disabled="isSubmitting" class="submit-button">
        <span v-if="!isSubmitting">送信</span>
        <span v-else>送信中...</span>
      </button>
    </form>

    <div v-if="result.message" :class="['result-message', result.type]">
      {{ result.message }}
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import axios from 'axios'

const formData = reactive({
  accountName: '',
  email: ''
})

const errors = reactive({
  accountName: '',
  email: ''
})

const result = reactive({
  message: '',
  type: ''
})

const isSubmitting = ref(false)

// バリデーション
const validate = () => {
  errors.accountName = ''
  errors.email = ''

  let isValid = true

  // アカウント名: 半角英数字のみ
  if (!formData.accountName) {
    errors.accountName = 'アカウント名は必須です'
    isValid = false
  } else if (!/^[a-zA-Z0-9]+$/.test(formData.accountName)) {
    errors.accountName = '半角英数字のみで入力してください'
    isValid = false
  }

  // メールアドレス
  if (!formData.email) {
    errors.email = 'メールアドレスは必須です'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = '正しいメールアドレスを入力してください'
    isValid = false
  }

  return isValid
}

// CSV生成
const generateCSV = (data) => {
  const now = new Date().toISOString()
  const headers = 'account_name,email,created_at'
  const row = `${data.account_name},${data.email},${now}`
  return `${headers}\n${row}`
}

// 送信処理
const handleSubmit = async () => {
  result.message = ''
  result.type = ''

  if (!validate()) {
    return
  }

  isSubmitting.value = true

  try {
    // 署名付きURL取得
    const urlResponse = await axios.post('/api/upload-url', {
      account_name: formData.accountName,
      email: formData.email
    })

    if (urlResponse.data.error) {
      throw new Error('署名付きURLの取得に失敗しました')
    }

    const { uploadUrl, objectKey } = urlResponse.data

    // CSV生成
    const csvContent = generateCSV({
      account_name: formData.accountName,
      email: formData.email
    })

    // S3へアップロード
    await axios.put(uploadUrl, csvContent, {
      headers: {
        'Content-Type': 'text/csv'
      }
    })

    // 成功メッセージ
    result.message = `✓ 送信完了しました！ファイル: ${objectKey}`
    result.type = 'success'

    // フォームリセット
    formData.accountName = ''
    formData.email = ''

  } catch (error) {
    console.error('Upload error:', error)
    result.message = '✗ 送信に失敗しました。もう一度お試しください。'
    result.type = 'error'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.upload-form {
  width: 100%;
}

.form-group {
  margin-bottom: 24px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.required {
  color: #e74c3c;
}

input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

input.error {
  border-color: #e74c3c;
}

.error-message {
  display: block;
  margin-top: 6px;
  color: #e74c3c;
  font-size: 0.85rem;
}

.submit-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-message {
  margin-top: 24px;
  padding: 16px;
  border-radius: 8px;
  font-weight: 500;
  text-align: center;
}

.result-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
