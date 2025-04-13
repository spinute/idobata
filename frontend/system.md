承知しました。GitHubリポジトリブラウザ兼チャットUIのフロントエンド部分に関する詳細な設計書を作成します。まずはコアとなるファイル/ディレクトリ表示機能を中心に記述し、チャット部分はUIの骨組みのみとします。

---

## フロントエンド設計書: GitHubリポジトリブラウザ & チャットUI

### 1. はじめに

**1.1. プロジェクト概要**
本プロジェクトは、指定されたGitHubのパブリックリポジトリ内のMarkdownファイルを中心としたコンテンツを閲覧し、将来的にはAIチャットを通じて編集・提案を行うためのWebアプリケーションのフロントエンド部分を開発するものです。

**1.2. 目的**
*   指定されたGitHubリポジトリのファイル/ディレクトリ構造をWebブラウザ上で直感的にナビゲートできる機能を提供する。
*   Markdownファイル（GFM: GitHub Flavored Markdown）を適切にレンダリングして表示する。
*   将来的なチャット機能及び編集機能の統合を見据えたUIレイアウトを提供する。
*   まずはパブリックリポジトリを対象とし、認証不要で動作するビューワー機能を実現する。

**1.3. 対象リポジトリ設定**
閲覧対象のリポジトリは、環境変数 (`.env` ファイル) で設定します。
例:
```env
VITE_GITHUB_REPO_OWNER=your-org-or-username
VITE_GITHUB_REPO_NAME=your-repo-name
```

### 2. 技術スタック

*   **フレームワーク/ビルドツール:** Vite, React (TypeScript)
*   **スタイリング:** Tailwind CSS
*   **ルーティング:** `react-router-dom`
*   **状態管理:** Zustand (シンプルで軽量なため選択)
*   **Markdownレンダリング:** `react-markdown`, `remark-gfm`, `rehype-highlight` (コードハイライト用)
*   **HTTPクライアント:** Fetch API (標準搭載)
*   **アイコン:** `react-icons`

### 3. 画面設計

**3.1. 全体レイアウト**
*   2カラムレイアウトを採用します。
    *   **左ペイン (約1/3幅):** チャットUIエリア (初期実装ではプレースホルダー)
    *   **右ペイン (約2/3幅):** GitHubコンテンツ表示エリア

```
+---------------------+------------------------------------------+
| Chat Panel (Left)   | Content Area (Right)                     |
|                     |                                          |
| [Placeholder for    | +--------------------------------------+ |
|  Chat Interface]    | | Breadcrumbs: owner / repo / path ... | |
|                     | +--------------------------------------+ |
|                     |                                          |
|                     | [Directory View or File View]            |
|                     |                                          |
|                     |                                          |
+---------------------+------------------------------------------+
```

**3.2. コンテンツエリア (右ペイン)**

*   **パンくずリスト (Breadcrumbs):**
    *   画面上部に表示され、現在のリポジトリルートからのパスを示す。
    *   各階層はクリック可能で、そのディレクトリへ移動できる。
    *   例: `owner` / `repo` / `docs` / `feature-a.md`
*   **ディレクトリビュー:**
    *   現在のパスがディレクトリの場合に表示される。
    *   ファイル/フォルダのリスト形式。
    *   各アイテムにはアイコン（フォルダ or ファイル種別）、名前を表示。
    *   クリックするとそのファイル/フォルダへ遷移する。
    *   表示順序は、フォルダを先に、次にファイルをアルファベット順で表示するのが望ましい。
*   **ファイルビュー:**
    *   現在のパスがファイルの場合に表示される。
    *   **Markdownファイル (.md, .mdx など):** `react-markdown` を使用して GFM としてレンダリングする。コードブロックはシンタックスハイライトを行う。
    *   **その他のファイル:** 「プレビュー非対応のファイル形式です。」のようなメッセージとファイル名を表示する。将来的には画像等のプレビューも検討。

**3.3. チャットエリア (左ペイン)**
*   初期実装では、「チャット機能は現在開発中です。」のような静的なメッセージを表示するか、簡単なUIフレーム（メッセージ入力欄の枠など）のみを表示する。
*   `position: sticky; top: 0;` などを利用して、右ペインのスクロールに追従しないようにする。

### 4. 機能要件

*   **リポジトリブラウジング:**
    *   アプリケーション起動時、リポジトリのルートディレクトリの内容を表示する。
    *   ユーザーはディレクトリをクリックして階層を移動できる。
    *   ファイルをクリックするとその内容を表示できる。
*   **URL連動:**
    *   ブラウザのURLが現在の表示パスを反映するようにする (例: `https://<your-app-domain>/<owner>/<repo>/blob/main/path/to/file.md`)。 `blob/main` の部分はGitHubのURL構造に合わせるのが分かりやすいが、 `/view/path/to/file.md` のような独自形式でも可。ここでは後者 `/view/*` を採用する。
    *   ブラウザバック/フォワードで適切に表示が切り替わる。
    *   URL直接アクセスで該当パスの内容を表示できる。
*   **Markdown表示:**
    *   GFM準拠でレンダリングする（テーブル、打ち消し線、タスクリストなど）。
    *   コードブロックのシンタックスハイライトを行う。
*   **エラー表示:**
    *   GitHub APIからの取得エラー（404 Not Found, レート制限超過など）が発生した場合、ユーザーにエラーメッセージを表示する。
    *   ファイルが存在しないパスにアクセスした場合も404エラーとして扱う。

### 5. API設計 (GitHub REST API v3)

*   **利用エンドポイント:** `GET /repos/{owner}/{repo}/contents/{path}`
    *   パブリックリポジトリのため、認証ヘッダーは不要。
*   **リクエストパラメータ:**
    *   `owner`: 環境変数 `VITE_GITHUB_REPO_OWNER` から取得。
    *   `repo`: 環境変数 `VITE_GITHUB_REPO_NAME` から取得。
    *   `path`: URLから抽出したファイル/ディレクトリのパス。ルートの場合は空文字列。
    *   `ref` (オプション): ブランチやタグを指定。初期実装では指定せず、リポジトリのデフォルトブランチ (通常 `main` or `master`) を取得する。
*   **レスポンス:**
    *   **成功時 (200 OK):**
        *   `type` が `dir` の場合: ディレクトリ内のファイル/フォルダ情報の配列。
        *   `type` が `file` の場合: ファイル情報オブジェクト。
            *   `content`: Base64エンコードされたファイル内容。
            *   `encoding`: エンコーディング形式 (通常 `base64`)。
            *   `size`: ファイルサイズ。
            *   `name`: ファイル名。
            *   `path`: リポジトリルートからのパス。
            *   `sha`: ファイルのSHAハッシュ。
    *   **失敗時:**
        *   `404 Not Found`: 指定されたパスが存在しない。
        *   `403 Forbidden`: レート制限超過、またはプライベートリポジトリ等でアクセス権がない場合（今回はパブリック前提なので主にレート制限）。
        *   その他サーバーエラー (`5xx`)。
*   **Base64デコード:**
    *   ファイル内容を取得する場合、レスポンスの `content` をBase64デコードする必要がある。JavaScriptの `atob()` 関数を使用。デコード後の文字列はUTF-8として解釈する想定。
    *   ```javascript
        import { Buffer } from 'buffer'; // or use browser's atob after checking encoding
        // ...
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        ```
*   **レート制限:**
    *   認証なしの場合、IPアドレスごとに 60リクエスト/時 の制限がある。開発中はこれに抵触しやすい。
    *   抵触した場合、APIは `403 Forbidden` を返し、レスポンスヘッダー (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) で状況を確認できる。
    *   エラーハンドリングでレート制限の可能性をユーザーに伝える。

### 6. コンポーネント設計

*   **状態管理 (Zustand Store):**
    *   `repoOwner`: string (from env)
    *   `repoName`: string (from env)
    *   `currentPath`: string (現在の表示パス)
    *   `content`: object | array | null (取得したファイル/ディレクトリデータ)
    *   `contentType`: 'file' | 'dir' | null
    *   `isLoading`: boolean
    *   `error`: Error | null
    *   `fetchContent(path)`: APIを叩いて状態を更新するアクション
*   **主要コンポーネント:**
    *   `App.tsx`: ルーター設定、基本レイアウト、Zustandストアの初期化。
    *   `Layout.tsx`: 左ペイン(ChatPanel)と右ペイン(Outlet)の2カラムレイアウトを提供。
    *   `ContentExplorer.tsx`: 右ペインのメインコンポーネント。URLからパスを取得し、Zustandストアに `fetchContent` を要求。ストアの状態に応じて `DirectoryView`, `FileView`, `LoadingIndicator`, `ErrorDisplay` を表示分けする。パンくずリスト (`Breadcrumbs`) もここに配置。
    *   `Breadcrumbs.tsx`: `currentPath` を元にパンくずリストを生成・表示。クリックで `navigate` する。
    *   `DirectoryView.tsx`: `content` (配列) を受け取り、ファイル/フォルダのリストを表示。アイコン表示、クリック時のナビゲーション処理。
    *   `FileView.tsx`: `content` (オブジェクト) を受け取り、ファイルの種類に応じて表示を切り替える (`MarkdownViewer` または「プレビュー非対応」メッセージ)。
    *   `MarkdownViewer.tsx`: Markdown文字列 (`decodedContent`) を受け取り、`react-markdown` でレンダリング。
    *   `ChatPanel.tsx`: 左ペインのコンポーネント (初期は静的コンテンツ)。
    *   `LoadingIndicator.tsx`: `isLoading` 状態を示すUI。
    *   `ErrorDisplay.tsx`: `error` 状態を示すUI。
*   **カスタムフック:**
    *   `useGitHubContent(path)`: (任意) データ取得ロジックをカプセル化するフック。内部でZustandストアのアクションを呼び出す。コンポーネントはこれを使うだけで良いようにする。

### 7. ルーティング設計 (`react-router-dom`)

*   `BrowserRouter` を使用。
*   パス構造: `/view/*`
    *   `*` (splat route) を使用して、リポジトリ内の任意のパスをキャプチャする。
*   **ルート設定例 (`App.tsx`):**
    ```typescript
    import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
    import Layout from './components/Layout';
    import ContentExplorer from './components/ContentExplorer';
    import NotFound from './components/NotFound'; // 404ページ用

    function App() {
      const repoOwner = import.meta.env.VITE_GITHUB_REPO_OWNER;
      const repoName = import.meta.env.VITE_GITHUB_REPO_NAME;

      // Zustandストアに owner/name をセットする初期化処理など

      return (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* ルートパス / はリポジトリのルートを表示 */}
              <Route index element={<ContentExplorer initialPath="" />} />
              {/* /view/ 以下のパスをキャプチャ */}
              <Route path="view/*" element={<ContentExplorerWrapper />} />
              <Route path="*" element={<NotFound />} /> {/* Optional: Handle other paths */}
            </Route>
          </Routes>
        </BrowserRouter>
      );
    }

    // Wrapper component to extract path from URL splat
    function ContentExplorerWrapper() {
        const params = useParams();
        const path = params['*'] || ''; // Get the path after /view/
        return <ContentExplorer key={path} initialPath={path} />; // Use key to force re-render on path change
    }

    export default App;
    ```
*   `ContentExplorer` コンポーネント内で `initialPath` を元にGitHub APIを叩く。
*   ディレクトリ/ファイルクリック時には `navigate(`/view/${newPath}`)` でURLを更新する。

### 8. 実装ガイドライン

*   **ディレクトリ構造案:**
    ```
    src/
    ├── components/       # 再利用可能なUIコンポーネント
    │   ├── Layout.tsx
    │   ├── ContentExplorer.tsx
    │   ├── Breadcrumbs.tsx
    │   ├── DirectoryView.tsx
    │   ├── FileView.tsx
    │   ├── MarkdownViewer.tsx
    │   ├── ChatPanel.tsx
    │   ├── LoadingIndicator.tsx
    │   └── ErrorDisplay.tsx
    ├── hooks/            # カスタムフック (e.g., useGitHubContent.ts)
    ├── lib/              # APIクライアント、ユーティリティ関数
    │   └── github.ts     # GitHub API関連の関数
    ├── store/            # Zustandストア
    │   └── contentStore.ts
    ├── styles/           # グローバルCSS (Tailwind設定含む)
    ├── App.tsx           # アプリケーションルート
    ├── main.tsx          # エントリポイント
    └── vite-env.d.ts     # Vite環境変数型定義
    .env                  # 環境変数ファイル
    ```
*   **コーディング規約:** ESLint と Prettier を導入し、規約を強制する。
*   **エラーハンドリング:**
    *   `fetch` 周りは `try...catch` で囲み、エラーオブジェクトをZustandストアに保存する。
    *   `ErrorDisplay` コンポーネントでエラーメッセージを分かりやすく表示する（例: 「コンテンツの取得に失敗しました: 404 Not Found」）。レート制限の場合はその旨を示すメッセージを出す。
*   **環境変数:** `.env` ファイルに `VITE_GITHUB_REPO_OWNER` と `VITE_GITHUB_REPO_NAME` を定義し、`.gitignore` に追加する。コード中からは `import.meta.env.VITE_...` でアクセスする。

### 9. 今後の拡張 (参考)

*   **ブランチ/差分表示:** ブランチ選択UIを追加し、Contents APIの `ref` パラメータを利用。差分は Compare API (`/repos/{owner}/{repo}/compare/{base}...{head}`) を利用。
*   **チャット機能連携:** Chatbot Server とのWebSocketまたはHTTP通信を実装し、チャットメッセージの送受信、ファイル編集指示の連携を行う。
*   **認証:** GitHub OAuthを導入し、プライベートリポジトリ対応やユーザーごとのブランチ管理を行う。認証後はAPIリクエストにトークンを含めることでレート制限が緩和される。
*   **画像等のプレビュー:** ファイル種別に応じて画像やPDFなどのプレビュー機能を追加する。
*   **パフォーマンス:** 巨大なディレクトリ表示の最適化（ページネーションや仮想スクロール）、ファイル内容取得の遅延読み込みなどを検討。
