# EC2エラスティックIP切り替え手順

このドキュメントは、既存のEC2インスタンスから新しいEC2インスタンスへElastic IP（エラスティックIP）を切り替える手順をまとめたものです。

---

## 📋 目次

1. [Elastic IPとは](#1-elastic-ipとは)
2. [切り替えの準備](#2-切り替えの準備)
3. [Elastic IPの解除と付け替え](#3-elastic-ipの解除と付け替え)
4. [PuTTYでの新しいEC2への接続設定](#4-puttyでの新しいec2への接続設定)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. Elastic IPとは

### 概要

Elastic IP（EIP）は、AWSが提供する固定のパブリックIPアドレスです。

### メリット

- **IPアドレスが固定**: インスタンスを停止・起動してもIPアドレスが変わらない
- **付け替えが可能**: インスタンス間で数秒で付け替えできる
- **DNS変更不要**: Route53のAレコード変更が不要（IPアドレスが変わらないため）
- **ダウンタイム最小限**: 付け替え処理は数秒で完了

### 料金

- **関連付けされている場合**: 無料
- **関連付けされていない場合**: 約$0.005/時間（約$3.6/月）

⚠️ **重要**: 使用していないElastic IPは課金されるため、速やかに新しいインスタンスに付け替えましょう。

---

## 2. 切り替えの準備

### 2.1 現在の状態を確認

切り替え前に以下を確認しておきます（AWSマネジメントコンソールで実施）：

1. **EC2ダッシュボード**にアクセス
2. 左メニューから**「インスタンス」**を開く
3. 旧インスタンスと新インスタンスの**インスタンスID**と**状態（running）**を確認
4. 左メニューから**「Elastic IPs」**を開く
5. 付け替え対象のElastic IPが**どのインスタンスに関連付けされているか**確認

### 2.2 必要な情報を収集

以下の情報をメモしておきます：

| 項目 | 説明 | 例 |
|------|------|------|
| **旧インスタンスID** | 現在稼働中のEC2インスタンスID | i-0123456789abcdef0 |
| **新インスタンスID** | 新しく作成したEC2インスタンスID | i-abcdef0123456789 |
| **Elastic IP** | 付け替えるElastic IPアドレス | 54.123.45.67 |

### 2.3 新しいEC2インスタンスの準備

新しいインスタンスが以下の状態になっていることを確認：

- [ ] インスタンスが起動している（`running`状態）
- [ ] セキュリティグループが設定されている
- [ ] 必要なソフトウェアがインストールされている
- [ ] アプリケーションがデプロイされている

#### 新規作成時の前提（今回の想定）

- **AMI**: Amazon Linux 2 AMI (HVM) - Kernel 5.10, SSD Volume Type
- **インスタンスタイプ**: `t3.micro`
- **キーペア**: 前回作成したキーペアを再利用
   - **同じAWSアカウント・同じリージョン**であること
   - **秘密鍵（.pem/.ppk）を手元に保持していること**
- **接続用の秘密鍵**: PuTTYで接続するため、`.ppk`形式の秘密鍵を用意
   - すでに`.pem`しかない場合は、PuTTYgenで`.ppk`に変換して保存
   - PuTTYの接続設定でこの`.ppk`を指定する

---

## 3. Elastic IPの解除と付け替え

### 3.1 旧EC2インスタンスからElastic IPを解除

#### AWSマネジメントコンソールから

1. **EC2ダッシュボード**にアクセス
2. 左メニューから**「Elastic IPs」**を選択
3. 付け替えたいElastic IPを選択（チェックボックスをクリック）
4. **「アクション」**ドロップダウン → **「Elastic IPアドレスの関連付け解除」**を選択
5. 確認ダイアログで**「関連付け解除」**をクリック

⚠️ **注意**: この時点でElastic IPはどのインスタンスにも関連付けられていない状態になり、**課金が始まります**。速やかに次の手順に進んでください。

### 3.2 新EC2インスタンスにElastic IPを関連付け

#### AWSマネジメントコンソールから

1. **EC2ダッシュボード** → **「Elastic IPs」**
2. 同じElastic IPを選択
3. **「アクション」** → **「Elastic IPアドレスの関連付け」**
4. 設定：
   - **リソースタイプ**: インスタンス
   - **インスタンス**: 新しいEC2インスタンスを選択
   - **プライベートIPアドレス**: 自動選択
5. **「関連付ける」**をクリック

### 3.3 切り替え完了の確認

1. **EC2ダッシュボード** → **「Elastic IPs」**
2. 対象Elastic IPの**関連付け先インスタンスID**が新しいインスタンスになっていることを確認
3. ブラウザでアクセスして動作確認
   - `http://your-elastic-ip` または `https://your-domain.com`

---

## 4. PuTTYでの新しいEC2への接続設定

Elastic IPを新しいEC2に付け替えた後、PuTTYの接続設定を更新します。

### 4.1 Elastic IP使用時（推奨）

**Elastic IPを使用している場合、PuTTYの設定変更は不要です！**

- IPアドレスが変わらないため、既存のPuTTY設定がそのまま使える
- セッション情報を変更する必要なし

### 4.2 Elastic IP未使用時（IPアドレスが変わる場合）

新しいEC2のパブリックIPが変わっている場合のみ、以下の手順で更新します：

#### 既存のPuTTYセッションを更新

1. **PuTTYを起動**
2. 左側の「Session」を選択
3. 「Saved Sessions」から既存のセッション名を選択（例: `EC2-Production`）
4. **「Load」**をクリック
5. 「Host Name (or IP address)」を**新しいEC2のパブリックIP**に変更
   - 例: `54.123.45.67` または `ec2-user@54.123.45.67`
6. 左側の「Connection」→「SSH」→「Auth」を選択
7. 「Private key file for authentication」が正しいキーファイル（`.ppk`）を指しているか確認
8. 左側の「Session」に戻る
9. 「Saved Sessions」に同じセッション名を入力
10. **「Save」**をクリック

### 4.3 新規にPuTTYセッションを作成

#### PPKファイルの準備（初回のみ）

AWSからダウンロードした`.pem`ファイルをPuTTY形式（`.ppk`）に変換：

1. **PuTTYgen**を起動（PuTTYインストール時に一緒にインストールされる）
2. **「Load」**をクリック
3. ファイルタイプを「All Files (*.*)」に変更
4. AWSからダウンロードした`.pem`ファイルを選択
5. **「Save private key」**をクリック
6. パスフレーズなしで保存するか確認→「はい」
7. `.ppk`ファイルとして保存（例: `my-key.ppk`）

#### PuTTYでセッションを作成

1. **PuTTYを起動**
2. **「Session」**カテゴリで設定：
   - **Host Name (or IP address)**:
     - Elastic IP使用: `54.123.45.67`
     - またはユーザー名付き: `ec2-user@54.123.45.67`
   - **Port**: `22`
   - **Connection type**: `SSH`
3. **「Connection」→「Data」**で設定：
   - **Auto-login username**: `ec2-user`（Amazon Linux/CentOS）または `ubuntu`（Ubuntu）
4. **「Connection」→「SSH」→「Auth」**で設定：
   - **「Browse」**をクリックして、先ほど作成した`.ppk`ファイルを選択
5. **「Session」**に戻る
6. **「Saved Sessions」**にセッション名を入力（例: `EC2-Production-New`）
7. **「Save」**をクリック

### 4.4 接続テスト

1. 保存したセッションを選択
2. **「Open」**をクリック
3. 初回接続時にセキュリティ警告が表示されたら**「Accept」**をクリック
4. 正常に接続できることを確認

```bash
# 接続後、以下のコマンドで確認
whoami
# 出力: ec2-user または ubuntu

hostname -I
# 出力: プライベートIPアドレス

curl ifconfig.me
# 出力: Elastic IPアドレス
```

### 4.5 PuTTY設定のバックアップ（推奨）

PuTTYの設定はWindowsレジストリに保存されます。バックアップ方法：

```bash
# コマンドプロンプトまたはPowerShellで実行
# PuTTY設定をレジストリからエクスポート
reg export HKEY_CURRENT_USER\Software\SimonTatham\PuTTY putty-backup.reg
```

復元する場合：
```bash
# レジストリファイルをダブルクリック、または
reg import putty-backup.reg
```

---

## 5. トラブルシューティング

### 5.1 Elastic IPの付け替えができない

**症状**: 「This Elastic IP address is already associated with another instance」エラー

**解決策**:
1. **EC2ダッシュボード** → **「Elastic IPs」**で対象EIPを確認
2. **関連付け先が旧インスタンス**の場合、**「関連付け解除」**を実行
3. 解除後、再度**「関連付け」**で新インスタンスを指定

### 5.2 PuTTYで接続できない

**症状**: 「Network error: Connection timed out」

**解決策**:
1. **セキュリティグループを確認**
   - EC2ダッシュボード → インスタンスを選択 → 「セキュリティ」タブ
   - インバウンドルールで**ポート22（SSH）**が開放されているか確認
   - ソースが自分のIPアドレス（または0.0.0.0/0）になっているか確認

2. **正しいIPアドレスを使用しているか確認**
   - **EC2ダッシュボード** → **「Elastic IPs」**で対象EIPを確認

3. **インスタンスが起動しているか確認**
   - **EC2ダッシュボード** → **「インスタンス」**で状態が`running`か確認

4. **PPKファイルが正しいか確認**
   - PuTTY設定 → Connection → SSH → Auth
   - 正しいキーファイルを指定しているか確認

### 5.3 PuTTYで「Server refused our key」エラー

**症状**: 「Server refused our key」

**解決策**:
1. **正しいユーザー名を使用しているか確認**
   - Amazon Linux / CentOS: `ec2-user`
   - Ubuntu: `ubuntu`
   - PuTTY → Connection → Data → Auto-login username

2. **正しいキーファイルを使用しているか確認**
   - 新しいインスタンス作成時に指定したキーペアと一致しているか

3. **インスタンスのキーペア設定を確認**
   - **EC2ダッシュボード** → **「インスタンス」** → 対象インスタンスを選択
   - 右側詳細の**「キーペア名」**が想定通りか確認

### 5.4 Elastic IPが課金され続けている

**症状**: 関連付け解除後、Elastic IPの課金が続いている

**解決策**:
1. **EC2ダッシュボード** → **「Elastic IPs」**で対象EIPを確認
2. **関連付け先が空**の場合、速やかに新インスタンスへ**関連付け**
3. **使用しない**場合は、**「アクション」→「Elastic IPアドレスの解放」**で解放

---

## 📝 チェックリスト

Elastic IP切り替え時に確認：

- [ ] 新しいEC2インスタンスが起動している
- [ ] 新しいEC2にアプリケーションがデプロイされている
- [ ] 旧EC2からElastic IPを解除した
- [ ] 新EC2にElastic IPを関連付けた
- [ ] Elastic IPが正しく関連付けられているか確認した
- [ ] PuTTYで新しいEC2に接続できる（Elastic IP使用時は設定変更不要）
- [ ] ブラウザでアプリケーションにアクセスできる
- [ ] Route53のAレコード変更は不要（Elastic IP使用のため）
- [ ] 旧EC2インスタンスを削除（確認後）

---

## 📚 参考リンク

- [AWS Elastic IPドキュメント](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)
- [AWS EC2ドキュメント](https://docs.aws.amazon.com/ec2/)
- [PuTTY公式サイト](https://www.putty.org/)
- [PuTTYgen使い方](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/putty.html)

---

**作成日**: 2026-02-14
**最終更新日**: 2026-02-14
