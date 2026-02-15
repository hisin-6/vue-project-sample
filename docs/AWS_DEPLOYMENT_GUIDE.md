# AWS EC2デプロイ手順書

このドキュメントは、Sample App（Vue 3 + Node.js）をAWS EC2にデプロイする手順をまとめたものです。

S3バケットのセットアップは別ドキュメントに分離しています：
[docs/S3_BUCKET_SETUP.md](docs/S3_BUCKET_SETUP.md)

既存EC2インスタンスの削除方法は別ドキュメントに分離しています：
[docs/EC2_ELASTIC_IP_SWITCH.md](docs/EC2_ELASTIC_IP_SWITCH.md)

---

## 📋 目次

- S3バケットのセットアップ: [docs/S3_BUCKET_SETUP.md](docs/S3_BUCKET_SETUP.md)
- 既存EC2インスタンスの削除方法: [docs/EC2_ELASTIC_IP_SWITCH.md](docs/EC2_ELASTIC_IP_SWITCH.md)

1. [EC2インスタンスの準備](#1-ec2インスタンスの準備)
2. [アプリのデプロイ](#2-アプリのデプロイ)
3. [ドメイン設定（Route53）](#3-ドメイン設定route53)
4. [トラブルシューティング](#4-トラブルシューティング)

---

## 1. EC2インスタンスの準備

### 1.1 EC2インスタンスへの接続

```bash
# SSH接続
ssh -i "your-key.pem" ec2-user@your-ec2-ip-address

# または
ssh -i "your-key.pem" ubuntu@your-ec2-ip-address
```

### 1.2 必要なソフトウェアのインストール

```bash
# システムアップデート
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# または
sudo yum update -y  # Amazon Linux/CentOS

# Node.js v20のインストール（推奨）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs  # Ubuntu/Debian
# または
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux/CentOS

# Gitのインストール
sudo apt install -y git  # Ubuntu/Debian
# または
sudo yum install -y git  # Amazon Linux/CentOS

# PM2のインストール（プロセス管理）
sudo npm install -g pm2

# Nginxのインストール（リバースプロキシ用）
sudo apt install -y nginx  # Ubuntu/Debian
# または
sudo amazon-linux-extras install nginx1 -y  # Amazon Linux 2
# または
sudo dnf install -y nginx  # Amazon Linux 2023
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.3 セキュリティグループの設定

EC2のセキュリティグループで以下のポートを開放：

| タイプ | プロトコル | ポート範囲 | ソース |
|--------|------------|------------|--------|
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |
| SSH | TCP | 22 | あなたのIP/0.0.0.0/0 |

### 1.4 Elastic IP（エラスティックIP）の設定

**推奨**: EC2インスタンスにElastic IPを割り当てることで、IPアドレスを固定できます。

#### メリット:
- インスタンスを停止・起動してもIPアドレスが変わらない
- インスタンス間での付け替えが可能（数秒でダウンタイム最小限）
- Route53のAレコードを変更する必要がない

#### Elastic IPの割り当て手順:

**AWSマネジメントコンソールから:**

1. EC2ダッシュボード → **「Elastic IPs」** を選択
2. **「Elastic IPアドレスを割り当てる」** をクリック
3. 設定：
   - **ネットワークボーダーグループ**: デフォルト（ap-northeast-1など）
   - **パブリックIPv4アドレスプール**: Amazonのプール
4. **「割り当て」** をクリック
5. 割り当てられたElastic IPを選択
6. **「アクション」** → **「Elastic IPアドレスの関連付け」**
7. 設定：
   - **インスタンス**: 対象のEC2インスタンスを選択
   - **プライベートIPアドレス**: 自動選択
8. **「関連付ける」** をクリック


#### Elastic IPの付け替え（インスタンス移行時）

既存のEC2から新しいEC2にElastic IPを付け替える手順：

**重要**: Elastic IPを付け替えるだけで、**Route53のAレコード変更は不要**です！

**AWSマネジメントコンソールから:**

1. EC2ダッシュボード → **「Elastic IPs」** を選択
2. 付け替えたいElastic IPを選択
3. **「アクション」** → **「Elastic IPアドレスの関連付け解除」**
4. 確認して **「関連付け解除」** をクリック
5. 同じElastic IPを選択
6. **「アクション」** → **「Elastic IPアドレスの関連付け」**
7. 新しいEC2インスタンスを選択
8. **「関連付ける」** をクリック


#### 注意点:
- ⚠️ **Elastic IPは関連付けされていない時は料金がかかります**（約$0.005/時間）
- 付け替え中のダウンタイムは数秒程度
- IPアドレスは変わらないため、DNS変更は不要

---

## 2. アプリのデプロイ

### 2.1 アプリのクローン

```bash
# ホームディレクトリに移動
cd ~

# Gitリポジトリからクローン
git clone https://github.com/your-username/vue-project.git
cd vue-project
```

**プライベートリポジトリの場合:**
```bash
# SSHキーの設定、またはPersonal Access Tokenを使用
git clone https://YOUR_TOKEN@github.com/your-username/vue-project.git
```

### 2.2 バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
npm install --production

# 環境変数ファイルの作成
nano .env
```

`.env`ファイルの内容：

```env
# サーバー設定
PORT=4000
NODE_ENV=production

# AWS S3設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=sample-vue-app-prod

# CORS設定（フロントエンドのURL）
ALLOWED_ORIGINS=https://your-domain.com,http://your-ec2-ip
```

**重要**: S3_ENDPOINTは**設定しない**（AWS S3を使う場合）

### 2.3 フロントエンドのビルド

```bash
cd ../frontend

# 依存関係のインストール
npm install

# 本番用ビルド
npm run build
```

ビルド成果物は`frontend/dist/`ディレクトリに生成されます。

### 2.4 PM2でバックエンドを起動

```bash
cd ../backend

# PM2でバックエンドを起動
pm2 start src/server.js --name "sample-app-backend" --env production

# 起動確認
pm2 list
pm2 logs sample-app-backend

# 自動起動の設定
pm2 startup
# 表示されたコマンドをコピーして実行（sudoコマンド）

# 現在の状態を保存
pm2 save
```

### 2.5 Nginxの設定

```bash
# Nginx設定ファイルを作成（Amazon Linux 2023推奨）
sudo nano /etc/nginx/conf.d/sample-app.conf
```

以下の内容を記述：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # ドメインを設定
    # または
    # server_name your-ec2-public-ip;  # ドメインがない場合はIPアドレス

    # フロントエンド（静的ファイル）
    location / {
        root /home/ec2-user/vue-project/frontend/dist;
        # または ubuntu の場合
        # root /home/ubuntu/vue-project/frontend/dist;

        try_files $uri $uri/ /index.html;

        # キャッシュ設定
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # バックエンドAPI
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ログ設定
    access_log /var/log/nginx/sample-app-access.log;
    error_log /var/log/nginx/sample-app-error.log;
}
```

設定を有効化：

```bash
# 設定のテスト
sudo nginx -t

# Nginxを再起動
sudo systemctl restart nginx
```

### 2.6 動作確認

```bash
# バックエンドの動作確認
curl http://localhost:4000/api/health
# または
pm2 logs sample-app-backend

# ブラウザでアクセス
# http://your-ec2-public-ip
# または
# http://your-domain.com
```

---

## 3. ドメイン設定（Route53）

### 3.1 既存ドメインの確認

Route53コンソールで既存のホストゾーンとレコードを確認：

```bash
（AWSコンソールで確認）
```

### 3.2 Aレコードの設定

#### ⚠️ 重要: Elastic IP使用時の注意

**Elastic IPを使用している場合:**
- Elastic IPを新しいEC2に付け替えるだけで、**Route53のAレコード変更は不要**です
- IPアドレスが変わらないため、既存のDNS設定がそのまま使えます
- インスタンス移行時のDNS伝播待ちも不要です

**Elastic IPを使用していない場合:**
- 以下の手順でAレコードを新しいEC2のパブリックIPに更新してください

#### 初回設定 または Elastic IP未使用時の更新

**AWSコンソールから:**

1. Route53コンソールにアクセス
2. 「ホストゾーン」→ 使いたいドメインを選択
3. 既存のAレコードを編集、または新規作成：
   - **レコード名**: 空白（ルートドメイン）または`www`
   - **タイプ**: A
   - **値**: 新しいEC2インスタンスのパブリックIPアドレス
   - **TTL**: 300（5分）
   - **ルーティングポリシー**: シンプル
4. 「変更を保存」


### 3.3 DNS変更の確認

```bash
# DNSの伝播を確認
nslookup your-domain.com

# または
dig your-domain.com

# 複数のDNSサーバーで確認
dig @8.8.8.8 your-domain.com
dig @1.1.1.1 your-domain.com
```

DNS変更は**数分〜48時間**かかる場合があります（TTL設定による）。

### 3.4 SSL証明書の設定（Let's Encrypt）

HTTPSを有効にするためにSSL証明書を取得：

```bash
# Certbotのインストール
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
# または
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux 2

# SSL証明書の取得と自動設定
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# メールアドレスの入力と利用規約への同意が必要です

# 自動更新の設定を確認
sudo certbot renew --dry-run

# 自動更新のcron設定（通常は自動で設定される）
sudo crontab -e
# 以下を追加（必要に応じて）
# 0 0 * * * certbot renew --quiet
```

SSL設定後、Nginxが自動的に再起動され、HTTPSでアクセスできるようになります。

---

## 4. トラブルシューティング

### 4.1 バックエンドが起動しない

```bash
# ログを確認
pm2 logs sample-app-backend

# .envファイルを確認
cat backend/.env

# ポートが使用されているか確認
sudo lsof -i :4000
sudo netstat -tulpn | grep 4000

# 手動で起動してエラーを確認
cd backend
node src/server.js
```

### 4.2 S3アップロードが失敗する

```bash
# バックエンドのログを確認
pm2 logs sample-app-backend

# CORSエラーの場合はS3のCORS設定を確認
```

### 4.3 Nginxエラー

```bash
# Nginx設定のテスト
sudo nginx -t

# Nginxのログを確認
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/sample-app-error.log

# Nginxを再起動
sudo systemctl restart nginx
```

### 4.4 ドメインにアクセスできない

```bash
# DNS設定を確認
nslookup your-domain.com

# EC2のセキュリティグループを確認（ポート80/443が開放されているか）

# Nginxが起動しているか確認
sudo systemctl status nginx

# EC2インスタンスのIPアドレスで直接アクセスしてみる
curl http://YOUR_EC2_IP
```

---

## 📝 チェックリスト

デプロイ前に確認：

- [ ] S3バケットが作成され、CORS設定が完了している（[docs/S3_BUCKET_SETUP.md](docs/S3_BUCKET_SETUP.md)）
- [ ] IAMユーザーが作成され、アクセスキーを取得している
- [ ] EC2インスタンスにNode.js、Git、PM2、Nginxがインストールされている
- [ ] EC2のセキュリティグループでポート80/443が開放されている
- [ ] Elastic IPが割り当てられている（推奨）
- [ ] 既存EC2インスタンスが削除されている（移行時のみ）
- [ ] Elastic IPが旧インスタンスから解除されている（移行時のみ）
- [ ] バックエンドの`.env`ファイルが正しく設定されている
- [ ] フロントエンドが正しくビルドされている
- [ ] PM2でバックエンドが起動している
- [ ] Nginxの設定が正しく、サービスが起動している
- [ ] Route53のAレコードが設定されている（初回またはElastic IP未使用時）
- [ ] ドメインでアクセスできる
- [ ] SSL証明書が設定されている（HTTPSでアクセスできる）

---

## 🔄 今後の更新手順

アプリを更新する際の手順：

```bash
# EC2にSSH接続
ssh -i "your-key.pem" ec2-user@your-ec2-ip

# プロジェクトディレクトリに移動
cd ~/vue-project

# 最新のコードを取得
git pull origin main

# バックエンドの更新
cd backend
npm install --production
pm2 restart sample-app-backend

# フロントエンドの更新
cd ../frontend
npm install
npm run build

# Nginxを再起動（必要に応じて）
sudo systemctl restart nginx

# 動作確認
pm2 logs sample-app-backend
```

---

## 📚 参考リンク

- [AWS EC2ドキュメント](https://docs.aws.amazon.com/ec2/)
- [AWS S3ドキュメント](https://docs.aws.amazon.com/s3/)
- [AWS Route53ドキュメント](https://docs.aws.amazon.com/route53/)
- [PM2ドキュメント](https://pm2.keymetrics.io/docs/)
- [Nginxドキュメント](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**作成日**: 2026-02-09
**更新日**: 2026-02-11
