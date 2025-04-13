承知しました。GitHubリポジトリブラウザ兼チャットUIのフロントエンド実装手順を、抜け漏れがないようにステップバイステップで記述します。

**フェーズ 1: プロジェクトセットアップと基本構造**

1.  **プロジェクト作成:**
    *   ターミナルを開き、`npm create vite@latest your-project-name --template react-ts` を実行してVite + React (TypeScript) プロジェクトを作成します。
    *   作成されたディレクトリに移動 (`cd your-project-name`)。
2.  **ライブラリインストール:**
    *   `npm install` を実行して初期依存関係をインストール。
    *   以下の追加ライブラリをインストール:
        ```bash
        npm install tailwindcss postcss autoprefixer react-router-dom@latest zustand react-markdown remark-gfm rehype-highlight react-icons buffer
        npm install -D @types/node @tailwindcss/typography # Tailwind Typography プラグイン (Markdown スタイル用)
        ```
3.  **Tailwind CSS 設定:**
    *   `npx tailwindcss init -p` を実行して `tailwind.config.js` と `postcss.config.js` を生成。
    *   `tailwind.config.js` の `content` を設定 (`./index.html`, `./src/**/*.{js,ts,jsx,tsx}`)。
    *   (推奨) `@tailwindcss/typography` プラグインを `tailwind.config.js` の `plugins` に追加。
    *   `src/index.css` (または `src/main.css`) を作成または編集し、Tailwindのディレクティブ (`@tailwind base; @tailwind components; @tailwind utilities;`) を記述。
    *   `main.tsx` でこのCSSファイルをインポート。
4.  **ESLint/Prettier 設定:**
    *   (任意だが推奨) ESLint と Prettier を設定し、コードフォーマットと静的解析ルールを適用します。Viteのテンプレートに基本的な設定が含まれている場合があります。
5.  **環境変数設定:**
    *   プロジェクトルートに `.env` ファイルを作成。
    *   `VITE_GITHUB_REPO_OWNER=your-org-or-username`
    *   `VITE_GITHUB_REPO_NAME=your-repo-name`
    *   を記述（実際の値に置き換える）。
    *   `src/vite-env.d.ts` を編集し、`ImportMetaEnv` インターフェースにこれらの変数の型定義を追加。
    *   `.gitignore` に `.env` が含まれていることを確認。
6.  **ディレクトリ構造作成:**
    *   `src` ディレクトリ以下に、設計書に記載された `components`, `hooks`, `lib`, `store`, `styles` などのディレクトリを作成。
7.  **基本レイアウトとルーティング:**
    *   `App.tsx` を編集し、`react-router-dom` を使った基本的なルーティング (`BrowserRouter`, `Routes`, `Route`) を設定。
    *   `Layout.tsx` コンポーネントを作成し、Tailwind CSS を使って左ペインと右ペインの2カラムレイアウトを実装 (`flex` や `grid` を使用)。右ペインには `<Outlet />` を配置。
    *   `ChatPanel.tsx` コンポーネントを作成し、左ペインに配置（中身はプレースホルダーでOK）。
    *   `App.tsx` で `/` と `/view/*` のルートに `Layout` を適用し、`ContentExplorerWrapper` (後述) を配置する設定を行う。

---
**進捗報告 (2025/04/13)**
*   フェーズ1のステップ1〜7が完了しました。
    *   プロジェクト作成、ライブラリインストール、Tailwind CSS設定 (ステップ1-3)
    *   ESLint/Prettier設定 (ステップ4 - スキップ)
    *   環境変数設定 (`.env`, `vite-env.d.ts`, `.gitignore` 更新) (ステップ5)
    *   ディレクトリ構造作成 (`src/components`, `hooks`, `lib`, `store`, `styles`) (ステップ6)
    *   基本レイアウト (`Layout.tsx`, `ChatPanel.tsx`) とルーティング (`App.tsx`, `ContentExplorer.tsx`, `NotFound.tsx`) 設定 (ステップ7)
*   次のステップは、フェーズ2のステップ8 (Zustand ストア作成) となります。
---

**フェーズ 2: 状態管理とAPI連携**

8.  **Zustand ストア作成:**
    *   `store/contentStore.ts` を作成。
    *   設計書に基づき、`repoOwner`, `repoName`, `currentPath`, `content`, `contentType`, `isLoading`, `error` の状態 (state) を定義。
    *   `fetchContent(path)` アクションを定義（中身はまだ空でOK）。
    *   `App.tsx` または適切な場所でストアの初期化処理（環境変数から `repoOwner`, `repoName` をセットするなど）を行う。
9.  **GitHub API クライアント実装:**
    *   `lib/github.ts` を作成。
    *   `fetchGitHubContent(owner, repo, path)` 非同期関数を実装。
        *   `fetch` API を使用して GitHub Contents API (`https://api.github.com/repos/{owner}/{repo}/contents/{path}`) を叩く。
        *   レスポンスステータスを確認し、エラーハンドリング（404, 403など）を行う。
        *   成功時はレスポンスのJSONをパースして返す。失敗時はエラーをスローするか、特定の形式でエラー情報を返す。
    *   ファイルコンテンツ用の Base64 デコード関数 (`decodeBase64Content`) を実装 (`buffer` ライブラリを使用)。
10. **ストアとAPIの連携:**
    *   Zustand ストア (`contentStore.ts`) の `fetchContent(path)` アクションを実装。
        *   アクション開始時に `isLoading` を `true`, `error` を `null` に設定。
        *   `lib/github.ts` の `fetchGitHubContent` を呼び出す。
        *   成功した場合:
            *   取得したデータ (ファイル or ディレクトリ) を `content` にセット。
            *   `contentType` (`file` or `dir`) をセット。
            *   `currentPath` を更新。
        *   失敗した場合:
            *   `error` にエラー情報をセット。
            *   `content` を `null` にする。
        *   アクション終了時に `isLoading` を `false` に設定 (`try...finally` を使うと良い)。

**フェーズ 3: コンテンツ表示**

11. **データ取得と表示切り替え:**
    *   `ContentExplorerWrapper` コンポーネントを作成（ルーティング設定で必要）。
        *   `useParams` を使ってURLの `*` 部分からパスを取得。
        *   取得したパスをキー (`key={path}`) として `ContentExplorer` をレンダリング（パス変更時に再レンダリングさせるため）。
    *   `ContentExplorer.tsx` コンポーネントを作成。
        *   `props` で `initialPath` を受け取る。
        *   `useEffect` を使用し、マウント時および `initialPath` 変更時に Zustand ストアの `fetchContent(initialPath)` アクションを呼び出す。
        *   Zustand ストアから `isLoading`, `error`, `content`, `contentType` を取得。
        *   `isLoading` が `true` なら `LoadingIndicator.tsx` を表示。
        *   `error` があれば `ErrorDisplay.tsx` を表示。
        *   どちらでもなければ、`contentType` に応じて `DirectoryView.tsx` または `FileView.tsx` を表示。
12. **パンくずリスト実装:**
    *   `Breadcrumbs.tsx` コンポーネントを作成。
        *   Zustand ストアから `currentPath` を取得。
        *   パス文字列を `/` で分割し、各階層へのリンクを持つパンくずリストを生成 (`Link` from `react-router-dom`)。
    *   `ContentExplorer.tsx` 内の適切な位置に `Breadcrumbs` を配置。
13. **ディレクトリビュー実装:**
    *   `DirectoryView.tsx` コンポーネントを作成。
        *   `props` でディレクトリデータ (ファイル/フォルダ情報の配列) を受け取る。
        *   配列をマップし、フォルダとファイルを区別してリスト表示 (アイコン `react-icons` を使用)。
        *   フォルダを先に、次にファイルをアルファベット順でソートする。
        *   各アイテムに `Link` を設定し、クリックで対応するパス (`/view/...`) に遷移するようにする。
14. **ファイルビュー実装:**
    *   `FileView.tsx` コンポーネントを作成。
        *   `props` でファイルデータ (オブジェクト) を受け取る。
        *   ファイル名 (`content.name`) をチェックし、Markdownファイル (`.md`, `.mdx` など) かどうか判定。
        *   Markdownファイルの場合:
            *   Base64エンコードされた `content.content` をデコード (`decodeBase64Content`)。
            *   デコードした内容を `MarkdownViewer.tsx` に渡してレンダリング。
        *   それ以外のファイルの場合: 「プレビュー非対応」メッセージを表示。
15. **Markdown レンダラー実装:**
    *   `MarkdownViewer.tsx` コンポーネントを作成。
        *   `props` でMarkdown文字列を受け取る。
        *   `react-markdown` コンポーネントを使用し、`remarkPlugins={[remarkGfm]}`, `rehypePlugins={[rehypeHighlight]}` を設定してレンダリング。
        *   (推奨) `@tailwindcss/typography` を適用するため、親要素に `prose` クラスを付与。
16. **ローディング・エラー表示実装:**
    *   `LoadingIndicator.tsx` コンポーネントを作成（シンプルなスピナーやテキスト）。
    *   `ErrorDisplay.tsx` コンポーネントを作成（エラーメッセージを表示）。

**フェーズ 4: スタイリングと最終調整**

17. **スタイリング:**
    *   Tailwind CSSユーティリティクラスを使って、各コンポーネント（レイアウト、パンくず、ファイルリスト、Markdown表示など）の見た目を整える。
    *   特に `MarkdownViewer` のスタイルは `@tailwindcss/typography` の `prose` クラスを中心に調整。
18. **動作確認とテスト:**
    *   設計書のテスト項目に従って、手動で一通りの動作を確認。
        *   ナビゲーション、表示、エラーハンドリングなど。
    *   (推奨) 主要コンポーネントに対してユニットテスト/インテグレーションテストを作成。
19. **リファクタリングとクリーンアップ:**
    *   コード全体を見直し、不要なコードやコメントを削除。
    *   可読性や保守性を考慮してリファクタリング。
20. **ビルド:**
    *   `npm run build` を実行し、本番用ビルドが正常に完了することを確認。

**フェーズ 5: デプロイ (任意)**

21. **デプロイ:**
    *   選定したホスティングプラットフォーム（Netlify, Vercelなど）の手順に従ってデプロイ。
    *   環境変数 (`VITE_GITHUB_REPO_OWNER`, `VITE_GITHUB_REPO_NAME`) をプラットフォーム側で設定。

これで、設計書に基づいたフロントエンドの実装が一通り完了するはずです。各ステップで動作確認をしながら進めることをお勧めします。