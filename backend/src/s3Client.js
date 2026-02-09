import { S3Client } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}

// MinIO用のエンドポイント設定（ローカル開発時）
if (process.env.S3_ENDPOINT) {
  config.endpoint = process.env.S3_ENDPOINT
  config.forcePathStyle = true // MinIOではpath-styleが必須
}

export const s3Client = new S3Client(config)
export const bucketName = process.env.S3_BUCKET_NAME || 'sample-app-dev'
