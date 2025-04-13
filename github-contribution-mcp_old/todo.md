承知しました。`github-contribution-mcp` サーバーを実装するための手順を、ステップバイステップで記述します。

**フェーズ 1: プロジェクトセットアップと基本構造 (完了)**

1.  **ディレクトリ作成と初期化:**
    *   プロジェクト用のディレクトリを作成 (`mkdir github-contribution-mcp && cd github-contribution-mcp`)。
    *   `npm init -y` を実行して `package.json` を生成。
2.  **TypeScript 設定:**
    *   `npm install --save-dev typescript @types/node` を実行。
    *   `npx tsc --init` を実行して `tsconfig.json` を生成。必要に応じて設定（`outDir`, `rootDir` など）を調整。
3.  **依存関係のインストール:**
    *   コアライブラリ: `npm install @modelcontextprotocol/sdk @octokit/app @octokit/rest dotenv pino`
    *   開発用ライブラリ: `npm install --save-dev pino-pretty eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier concurrently nodemon` (必要に応じて選択)
4.  **リンター/フォーマッター設定:**
    *   ESLint (`.eslintrc.js`), Prettier (`.prettierrc.js`) の設定ファイルを作成し、ルールを設定。
    *   `package.json` の `scripts` に lint と format コマンドを追加。
5.  **.gitignore 設定:**
    *   `.gitignore` ファイルを作成し、`node_modules`, `dist`, `.env`, `*.log` などを追加。
6.  **環境変数テンプレート作成:**
    *   `.env.example` ファイルを作成し、設計書に記載された必須・任意の環境変数名をリストアップ。
7.  **基本ファイル構成作成:**
    *   `src/main.ts` (エントリーポイント)
    *   `src/server.ts` (MCPサーバーロジック)
    *   `src/config.ts` (環境変数読み込み)
    *   `src/logger.ts` (ロガー設定)
    *   `src/github/client.ts` (Octokitクライアント)
    *   `src/github/utils.ts` (GitHubヘルパー)
    *   `src/handlers/upsertFile.ts` (ツールハンドラ1)
    *   `src/handlers/updatePr.ts` (ツールハンドラ2)
    *   必要に応じて `src/types.ts` など。
8.  **エントリーポイント実装 (`src/main.ts`):**
    *   `dotenv/config` をインポートして環境変数をロード。
    *   `config.ts` から設定をインポート。
    *   `logger.ts` からロガーを初期化。
    *   `server.ts` からサーバーセットアップ関数を呼び出し、MCPサーバーインスタンスを取得。
    *   Stdioトランスポート (`StdioServerTransport`) をインスタンス化。
    *   サーバーインスタンスとトランスポートを接続 (`server.connect(transport)`)。
    *   起動ログとエラーハンドリングを追加。
9.  **設定読み込み実装 (`src/config.ts`):**
    *   `process.env` から必要な環境変数を読み込む。
    *   必須変数が存在しない場合はエラーをスロー。
    *   設定オブジェクトをエクスポート。秘密鍵の改行文字 (`\n`) 処理もここで行うのが良い。
10. **ロガー設定実装 (`src/logger.ts`):**
    *   `pino` を初期化。開発環境では `pino-pretty` を使うように設定。ログレベルは `config` から取得。ロガーインスタンスをエクスポート。

---
**フェーズ 1 完了報告 (2025-04-13)**

*   ステップ 1 から 10 までを実施し、プロジェクトの基本構造、依存関係、設定ファイル、エントリーポイント、設定読み込み、ロガーの初期実装が完了しました。
*   `package.json` に `lint` と `format` スクリプトを追加済みです。
*   `src` ディレクトリ以下に基本的なファイル構造を作成しました。

**引き継ぎ事項:**

*   `.env` ファイルを作成し、`.env.example` を参考に実際の GitHub App の認証情報（App ID, Installation ID, Private Key）とターゲットリポジトリ情報を設定してください。
*   フェーズ 2 (ステップ 11 以降) に進み、GitHub クライアント (`src/github/client.ts`)、ユーティリティ (`src/github/utils.ts`)、および MCP ツールハンドラ (`src/handlers/`) の実装を開始してください。
*   `src/server.ts` の `setupServer` 関数には、現在プレースホルダーの初期化ロジックが含まれています。フェーズ 2 で実際のハンドラ登録などを実装する必要があります。
---

**フェーズ 2: GitHub連携とMCPハンドラ実装**

11. **GitHub App 設定:**
    *   GitHub上でAppを作成し、必要な権限 (Contents R/W, Pull requests W) を設定。
    *   App ID、Installation ID、秘密鍵を `.env` ファイルに設定。
12. **GitHub クライアント実装 (`src/github/client.ts`):**
    *   `getAuthenticatedOctokit` 関数を実装。
    *   `config` からApp情報を取得。
    *   `@octokit/app` を使用して認証し、Installation Token を取得。
    *   トークンで認証された `@octokit/rest` インスタンスを生成して返す。
    *   エラーハンドリング（認証失敗など）を追加。
13. **GitHub ユーティリティ実装 (`src/github/utils.ts`):**
    *   `ensureBranchAndPrExists` 関数を実装（ブランチ確認、なければ作成、PR作成）。
    *   必要に応じて他の共通処理（例: パス検証）を関数化。
14. **MCP サーバーロジック実装 (`src/server.ts`):**
    *   MCP `Server` インスタンスを初期化 (`serverInfo`, `capabilities` を設定)。
    *   `upsert_file_and_commit` ツールハンドラ (`handlers/upsertFile.ts`) を `setRequestHandler` で登録。
    *   `update_pr_description` ツールハンドラ (`handlers/updatePr.ts`) を `setRequestHandler` で登録。
    *   (任意) `tools/list` ハンドラを実装し、定義されたツール情報とアノテーションを返すようにする (SDKによっては不要な場合あり)。
15. **`upsert_file_and_commit` ハンドラ実装 (`src/handlers/upsertFile.ts`):**
    *   設計書に従い、入力バリデーション、`getAuthenticatedOctokit` 呼び出し、`ensureBranchAndPrExists` 呼び出し、既存ファイルSHA取得、`createOrUpdateFileContents` 呼び出し、成功/エラーレスポンス生成のロジックを実装。
    *   丁寧なエラーハンドリングとログ出力を行う。
16. **`update_pr_description` ハンドラ実装 (`src/handlers/updatePr.ts`):**
    *   設計書に従い、入力バリデーション、`getAuthenticatedOctokit` 呼び出し、`pulls.list` 呼び出し、PR特定、`pulls.update` 呼び出し、成功/エラーレスポンス生成のロジックを実装。
    *   丁寧なエラーハンドリング（PRが見つからない場合など）とログ出力を行う。

---
**フェーズ 2 完了報告 (2025-04-13)**

*   ステップ 11 から 16 までを実施し、GitHub クライアント、ユーティリティ、MCP サーバーロジック、および両ツールハンドラ (`upsert_file_and_commit`, `update_pr_description`) の基本実装が完了しました。
*   TypeScript のモジュール解決に関する問題を修正し、ESM 形式でのビルドと実行が可能になりました (`package.json` と `tsconfig.json` を更新)。
*   `package.json` に `build`, `start`, `dev` スクリプトを追加しました。

**引き継ぎ事項:**

*   `.env` ファイルの仮データを実際の GitHub App 認証情報とターゲットリポジトリ情報に更新してください。
*   フェーズ 3 (ステップ 17 以降) に進み、ビルド、ローカル実行、テスト (`mcp-cli` を使用した手動テスト、ユニットテスト) を実施してください。
---

**フェーズ 3: ビルド、テスト、実行**

17. **ビルドスクリプト設定:**
    *   `package.json` の `scripts` に `build` コマンド (`tsc`) と `start` コマンド (`node dist/main.js`) を追加。
    *   (開発用) `dev` コマンド (`nodemon` や `concurrently` を使ってTS変更時に自動リビルド＆再起動）を追加。
18. **ビルド実行:**
    *   `npm run build` を実行し、`dist` ディレクトリにJavaScriptファイルが生成されることを確認。
19. **ローカル実行と基本動作確認:**
    *   `npm start` でサーバーを起動。コンソールにエラーが出ないことを確認。
    *   別のターミナルで `mcp-cli` などのクライアントを使用し、サーバーに接続。
    *   `initialize` リクエストを送信し、サーバー情報と capabilities が返ることを確認。
    *   `tools/list` を呼び出し、定義したツール情報が返ることを確認。
20. **ツール動作の手動テスト:**
    *   `mcp-cli` を使って `upsert_file_and_commit` を様々なパターン（新規、更新、存在しないブランチ）で呼び出し、GitHub上のリポジトリの状態とサーバーログを確認。
    *   `mcp-cli` を使って `update_pr_description` を呼び出し、GitHub上のPRの状態とサーバーログを確認。
    *   意図的にエラーを起こすパラメータ（不正なパス、空のメッセージなど）で呼び出し、適切なエラーが返るか確認。
21. **ユニットテスト実装 (推奨):**
    *   テストフレームワーク (Jest/Vitest) をセットアップ。
    *   GitHub API呼び出し部分をモック化。
    *   各ハンドラとユーティリティ関数のロジックをテストするテストケースを作成し、実行 (`npm test`)。
22. **コードレビューとリファクタリング:**
    *   実装したコード全体を見直し、改善点があれば修正（可読性、効率、エラーハンドリング）。
    *   フォーマットとリンターを再度実行 (`npm run format`, `npm run lint`)。
23. **ドキュメント作成:**
    *   `README.md` に、プロジェクト概要、セットアップ手順、環境変数一覧、実行方法、ツールの使い方などを記述。

この手順に従うことで、`github-contribution-mcp` サーバーの実装を着実に進めることができます。特にGitHub APIの非同期処理とエラーハンドリングに注意して実装してください。