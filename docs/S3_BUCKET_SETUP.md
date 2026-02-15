# S3バケットのセットアップ

このドキュメントは、Sample App（Vue 3 + Node.js）のS3バケット準備手順をまとめたものです。

---

## 1. S3バケットの作成

```bash
# AWS CLIで作成する場合
aws s3 mb s3://sample-app-prod --region ap-northeast-1
```

または、AWSマネジメントコンソールから：

1. S3コンソール（https://console.aws.amazon.com/s3/）にアクセス
2. 「バケットを作成」をクリック
3. 設定：
   - **バケット名**: `sample-vue-app-prod`（任意の名前）
   - **リージョン**: `ap-northeast-2`（シドニー）
   - **パブリックアクセスをブロック**: すべてON（推奨）
   - **バケットのバージョニング**: 無効化（今回のサンプルアプリはファイルの復旧の必要が無いため）
4. 「バケットを作成」をクリック

## 2. CORS設定

S3バケットにCORS設定を追加：

1. 作成したバケットを選択
2. 「アクセス許可」タブ → 「CORS」セクションを編集
3. 以下のJSON設定を追加：

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-domain.com"
        ],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```

**注意**: `AllowedOrigins`に本番ドメインを追加してください。

## 3. IAMユーザーの作成とアクセスキー取得

1. IAMコンソール（https://console.aws.amazon.com/iam/）にアクセス
2. 「ユーザー」→「ユーザーを追加」
3. 設定：
   - **ユーザー名**: `sample-app-s3-user`
   - **AWS マネジメントコンソールへのユーザーアクセスを提供する**: チェックしない
4. 「次へ: アクセス許可」をクリック
5. 「既存のポリシーを直接アタッチ」→ ポリシーを作成：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::sample-vue-app-prod",
                "arn:aws:s3:::sample-vue-app-prod/*"
            ]
        }
    ]
}
```

6. ユーザー作成後、**アクセスキーID**と**シークレットアクセスキー**をメモ
   - ⚠️ シークレットキーはこの画面でしか表示されないので必ず保存！
