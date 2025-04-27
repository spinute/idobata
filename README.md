# Idobataプロジェクト - 開発環境構築手順

このドキュメントは、Idobataプロジェクトの `idea-discussion` と `policy-edit` という2つのアプリケーションを、開発者が自分のコンピューターで動かすための準備手順を説明するものです。特別なツール（Docker Compose）を使いますが、この手順に従えばセットアップできます。`idea-discussion` と `policy-edit` は、それぞれ個別に準備して動かすことが可能です。

## プロジェクト構成

このプロジェクトは以下のコンポーネントで構成されています：

* **ルートレベルのfrontend**: idea-discussion用のフロントエンドとして機能しています。将来的にpolicy-editのフロントエンドと統合することを見据えて、トップレベルに配置されています。TypeScriptをサポートし、JSXとTSXの両方のファイル形式を扱えます。（かつて idea-discussion/frontend だったものです）
* **idea-discussion/backend**: アイデア議論のためのバックエンド（Node.js）
* **policy-edit**: ポリシー編集のためのフロントエンド（React + TypeScript）とバックエンド（Node.js）
* **MongoDB**: データベース

## 前提条件

*   **Docker:** お使いのオペレーティングシステム用のDocker Desktop（またはDocker Engine + Docker Compose）をインストールしてください。[https://www.docker.com/get-started](https://www.docker.com/get-started)
*   **リポジトリのクローン:** まず、プロジェクトリポジトリをクローンします。
    ```bash
    git clone <your-repository-url>
    cd idobata
    ```

## セットアップ

### 共通のセットアップ

1.  **`.env` ファイルの作成:**
    テンプレートファイル `.env.template` をコピーして `.env` という名前の新しいファイルを作成します。このファイルは両方のアプリケーションで使用されますが、設定する変数は実行したいアプリケーションによって異なります。
    ```bash
    cp .env.template .env
    ```

### Idea Discussion セットアップ

`idea-discussion` を実行するために必要な設定です。

1.  **`.env` ファイルの設定:**
    `.env` ファイルを編集し、以下の変数を設定してください。
    *   `OPENROUTER_API_KEY`: OpenRouterのAPIキー (バックエンドで使用)
    *   `IDEA_FRONTEND_API_BASE_URL`: フロントエンドがアクセスするバックエンドAPIのURL（通常は `http://localhost:3000`）

### Policy Edit セットアップ

`policy-edit` を実行するために必要な設定です。

1.  **`.env` ファイルの設定:**
    `.env` ファイルを編集し、以下の変数を設定してください。
    *   `OPENROUTER_API_KEY`: OpenRouterのAPIキー (バックエンドで使用)
    *   `GITHUB_APP_ID`: GitHub AppのID (バックエンドで使用)
    *   `GITHUB_INSTALLATION_ID`: GitHub AppのInstallation ID (バックエンドで使用)
    *   `GITHUB_TARGET_OWNER`: 対象リポジトリのオーナー名 (バックエンド・フロントエンドで使用)
    *   `GITHUB_TARGET_REPO`: 対象リポジトリ名 (バックエンド・フロントエンドで使用)
    *   `GITHUB_BASE_BRANCH`: 対象リポジトリのベースブランチ名 (バックエンドで使用)
    *   `POLICY_FRONTEND_API_BASE_URL`: フロントエンドがアクセスするバックエンドAPIのURL（通常は `http://localhost:3001`）

2.  **GitHub App秘密鍵の配置:**
    `policy-edit` バックエンドがGitHub APIと連携するために、GitHub Appからダウンロードした秘密鍵ファイル（`.pem`形式）が必要です。
    *   `policy-edit/backend/` ディレクトリ内に `secrets` ディレクトリを作成します。
    *   ダウンロードした秘密鍵ファイルを `github-key.pem` という名前で `policy-edit/backend/secrets/` ディレクトリ内に配置してください。
    ```bash
    mkdir -p policy-edit/backend/secrets
    cp /path/to/your/downloaded-private-key.pem policy-edit/backend/secrets/github-key.pem
    ```
    *(注意: `/path/to/your/downloaded-private-key.pem` は、ダウンロードした秘密鍵ファイルの実際のパスに置き換えてください。)*

## 開発環境の実行

### 全サービスの起動

すべてのサービスを同時に起動する場合：
```bash
docker-compose up --build -d
```

### Idea Discussionの起動

ルートレベルのフロントエンドとidea-discussionのバックエンド、およびMongoDBを起動する場合：
```bash
# 必要なセットアップ: Idea Discussion セットアップ
docker-compose up --build -d frontend idea-backend mongo
```

### Policy Editのみ起動

`policy-edit` のフロントエンドとバックエンドのみを起動する場合（データベースは使用しません）：
```bash
# 必要なセットアップ: Policy Edit セットアップ
docker-compose up --build -d policy-frontend policy-backend
```

## アプリケーションへのアクセス

*   **Idea Discussion フロントエンド:** [http://localhost:5173](http://localhost:5173)
*   **Policy Edit フロントエンド:** [http://localhost:5174](http://localhost:5174)

## ログの表示

実行中の全サービスのログを表示するには:
```bash
docker-compose logs -f
```
特定のサービス（例: `policy-backend`）のログを表示するには:
```bash
docker-compose logs -f policy-backend
```

## 環境の停止

実行中のサービスを停止し、コンテナ、ネットワークを削除するには（名前付きボリューム `mongo_data` は保持されます）:
```bash
docker-compose down
```
名前付きボリューム `mongo_data` も含めて削除する（すべてのデータベースデータが削除されます）には:
```bash
docker-compose down -v
```

## 開発ワークフロー

*   ローカルのエディタでフロントエンドまたはバックエンドのプロジェクトのコードを編集します。
*   変更は自動的に以下をトリガーするはずです:
    *   フロントエンドコンテナ (Vite): Hot Module Replacement (HMR)
    *   `idea-backend` コンテナ (`nodemon`): サーバーの再起動
    *   (`policy-backend` は `npm start` で実行されるため、通常ホットリロードは行われません。変更を反映するにはコンテナの再起動が必要です: `docker-compose restart policy-backend`)
*   HMRが自動的に適用されない場合は、ブラウザをリフレッシュしてフロントエンドの変更を確認してください。
*   `package.json` ファイルを変更した場合は、特定のサービスのイメージを再ビルドする必要があるかもしれません:
    ```bash
    # 特定のサービスを再ビルドして再起動
    docker-compose build <service_name> # 例: docker-compose build policy-backend
    docker-compose up -d --no-deps <service_name>
    ```
    または、単に `docker-compose up --build -d` を再度実行します。

---