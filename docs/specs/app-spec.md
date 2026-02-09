# サンプルアプリ仕様

- 日付: 2026-02-09
- ステータス: 下書き

## 目的
ADRより詳細な機能仕様を記録する。

## 対象範囲
- フロントエンド: Vue
- デプロイ先: EC2
- 出力形式: CSVをS3へ保存
- ローカル代替: MinIO

## 利用バージョン
- Vue 3（最新安定版）

## ユーザーフロー
1. 入力フォームを開く
2. 必須項目を入力して送信
3. 入力内容をバリデーション
4. CSVをS3へ保存（ローカルはMinIO）
5. 成功/失敗の結果を表示

## 機能要件
- CSV項目に対応する入力フォームを提供する
- 必須項目と基本フォーマットを検証する
- ヘッダー付きCSVを生成する
- S3互換ストレージへ保存する
- アップロード結果をユーザーに表示する

## 入力項目
- アカウント名（半角英数、必須）
- e-mail（必須）

## CSVスキーマ（下書き）
| フィールド | 型 | 必須 | 例 |
| --- | --- | --- | --- |
| account_name | string | yes | Alice123 |
| email | string | yes | alice@example.com |
| created_at | datetime | yes | 2026-02-09T10:15:00Z |

## CSV出力ルール
- ファイル名は `アカウント名_YYYYMMDD.csv`
- 同じファイル名が存在する場合は追記する
- 既存ファイルがない場合は新規作成する

## S3保存方式
- 署名付きURLを利用してアップロードする

## 署名付きURL発行
- EC2上の簡易APIで署名付きURLを発行する

## 簡易API実装方式
- Node.jsで実装する

## Node.jsフレームワーク
- Expressを利用する

## 簡易APIエンドポイント
- POST /api/upload-url
	- 目的: 署名付きURLを取得する
	- リクエスト: JSON（account_name, email）
	- レスポンス: JSON（uploadUrl, objectKey）
	- アップロード方式: PUT

## APIリクエスト仕様
- JSONのキー名: account_name, email
- 全て必須
- フォーマット: 半角英数のみ
- 追加情報: なし

## APIレスポンス仕様
- キー名: uploadUrl, objectKey
- エラー時はエラーであることのみ伝える（エラーコードは含めない）

## APIサンプル
### リクエスト
```json
{
	"account_name": "Alice123",
	"email": "alice@example.com"
}
```

### レスポンス（成功）
```json
{
	"uploadUrl": "https://example-bucket.s3.amazonaws.com/Alice123_20260209.csv?X-Amz-Algorithm=...",
	"objectKey": "Alice123_20260209.csv"
}
```

### レスポンス（エラー）
```json
{
	"error": "invalid_request"
}
```

## 非機能要件
- 通常の送信は2秒以内に応答する
- エラーはわかりやすく具体的に表示する

## S3保存先
- バケット名: sample-app-dev
- プレフィックス: records/{account_name}/
- オブジェクトキー: records/{account_name}/{account_name}_YYYYMMDD.csv

## 未決事項
