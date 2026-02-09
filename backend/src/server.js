import express from 'express'
import cors from 'cors'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, bucketName } from './s3Client.js'

const app = express()
const PORT = process.env.PORT || 4000

// ミドルウェア
app.use(cors())
app.use(express.json())

// バリデーション関数
const validateRequest = (accountName, email) => {
  const errors = []

  if (!accountName) {
    errors.push('account_name is required')
  } else if (!/^[a-zA-Z0-9]+$/.test(accountName)) {
    errors.push('account_name must be alphanumeric')
  }

  if (!email) {
    errors.push('email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email format is invalid')
  }

  return errors
}

// ファイル名生成（仕様: アカウント名_YYYYMMDD.csv）
const generateFileName = (accountName) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${accountName}_${year}${month}${day}.csv`
}

// POST /api/upload-url
app.post('/api/upload-url', async (req, res) => {
  try {
    const { account_name, email } = req.body

    // バリデーション
    const validationErrors = validateRequest(account_name, email)
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'invalid_request' })
    }

    // オブジェクトキー生成（仕様: records/{account_name}/{account_name}_YYYYMMDD.csv）
    const fileName = generateFileName(account_name)
    const objectKey = `records/${account_name}/${fileName}`

    // 署名付きURL生成（PUT用）
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: 'text/csv'
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }) // 5分間有効

    // レスポンス
    res.json({
      uploadUrl,
      objectKey
    })

  } catch (error) {
    console.error('Error generating signed URL:', error)
    res.status(500).json({ error: 'internal_error' })
  }
})

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 S3 Bucket: ${bucketName}`)
})
