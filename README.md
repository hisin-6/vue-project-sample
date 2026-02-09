# Sample App - アカウント登録アプリ

Vue 3 + Node.js + S3を使ったシンプルなアカウント登録アプリです。

## 概要

- フロントエンド: Vue 3 + Vite
- バックエンド: Node.js + Express
- ストレージ: AWS S3 / MinIO（ローカル開発）
- 入力データをCSV形式でS3に保存

## 機能

- アカウント名とメールアドレスの入力フォーム
- クライアントサイドバリデーション
- S3署名付きURLを使った安全なアップロード
- CSV形式でのデータ保存

## プロジェクト構成

```
vue-project/
├── frontend/          # Vue 3フロントエンド
│   ├── src/
│   │   ├── components/
│   │   │   └── UploadForm.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── server.js
│   │   └── s3Client.js
│   ├── .env.example
│   └── package.json
│
├── docs/              # ドキュメント
│   ├── adr/           # Architecture Decision Records
│   └── specs/         # 仕様書
│
└── docker-compose.yml # MinIO（ローカル開発用）
```

## セットアップ

### 1. 依存関係のインストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

### 2. 環境変数の設定

```bash
cd backend
cp .env.example .env
```

`.env`ファイルを編集して、以下を設定：

**AWS S3を使う場合:**
```env
PORT=4000
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=sample-app-dev
```

**MinIO（ローカル開発）を使う場合:**
```env
PORT=4000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_BUCKET_NAME=sample-app-dev
```

### 3. MinIOの起動（ローカル開発の場合）

```bash
# プロジェクトルートで実行
docker-compose up -d
```

MinIO Console: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

## 起動方法

### バックエンド起動

```bash
cd backend
npm start
```

サーバーが http://localhost:4000 で起動します。

### フロントエンド起動

```bash
cd frontend
npm run dev
```

アプリが http://localhost:3000 で起動します。

## API仕様

### POST /api/upload-url

署名付きURLを取得するエンドポイント。

**リクエスト:**
```json
{
  "account_name": "Alice123",
  "email": "alice@example.com"
}
```

**レスポンス（成功）:**
```json
{
  "uploadUrl": "https://sample-app-dev.s3.amazonaws.com/records/Alice123/Alice123_20260209.csv?X-Amz-Algorithm=...",
  "objectKey": "records/Alice123/Alice123_20260209.csv"
}
```

**レスポンス（エラー）:**
```json
{
  "error": "invalid_request"
}
```

## CSV形式

| フィールド | 型 | 必須 | 例 |
| --- | --- | --- | --- |
| account_name | string | yes | Alice123 |
| email | string | yes | alice@example.com |
| created_at | datetime | yes | 2026-02-09T10:15:00Z |

## S3保存先

- バケット名: `sample-app-dev`
- オブジェクトキー: `records/{account_name}/{account_name}_YYYYMMDD.csv`

例: `records/Alice123/Alice123_20260209.csv`

## 開発

### フロントエンド

```bash
cd frontend
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

### バックエンド

```bash
cd backend
npm run dev      # 開発モード（ファイル変更を自動検知）
npm start        # 本番モード
```

## トラブルシューティング

### MinIOに接続できない

1. MinIOコンテナが起動しているか確認:
   ```bash
   docker-compose ps
   ```

2. MinIO Consoleにアクセス: http://localhost:9001

3. バケット `sample-app-dev` が作成されているか確認

### アップロードが失敗する

1. バックエンドのログを確認
2. `.env`ファイルの設定を確認
3. S3/MinIOの認証情報が正しいか確認

## ライセンス

MIT
