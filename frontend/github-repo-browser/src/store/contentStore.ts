import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchGitHubContent, GitHubFile, GitHubDirectoryItem } from '../lib/github'; // Import specific types

// Use specific types from the API client
type GitHubContent = GitHubFile | GitHubDirectoryItem[] | null;

interface ContentState {
    repoOwner: string;
    repoName: string;
    currentPath: string;
    content: GitHubContent; // Use the refined type
    contentType: 'file' | 'dir' | null;
    isLoading: boolean;
    error: Error | null;
    // アクションの型定義
    setRepoInfo: (owner: string, name: string) => void;
    fetchContent: (path: string) => Promise<void>; // 非同期アクション
    // 内部で使用するアクション (オプション)
    _setContent: (content: GitHubContent, type: 'file' | 'dir' | null) => void; // Use the refined type
    _setLoading: (loading: boolean) => void;
    _setError: (error: Error | null) => void;
    _setCurrentPath: (path: string) => void;
}

const useContentStore = create<ContentState>()(
    devtools(
        (set, get) => ({
            // --- State ---
            repoOwner: import.meta.env.VITE_GITHUB_REPO_OWNER || '',
            repoName: import.meta.env.VITE_GITHUB_REPO_NAME || '',
            currentPath: '',
            content: null,
            contentType: null,
            isLoading: false,
            error: null,

            // --- Actions ---
            setRepoInfo: (owner, name) => set({ repoOwner: owner, repoName: name }),

            fetchContent: async (path: string) => {
                console.log(`Fetching content for path: ${path}`);
                set({ isLoading: true, error: null, currentPath: path, content: null, contentType: null }); // Reset content/type on new fetch

                try {
                    const { repoOwner, repoName } = get(); // Get owner/name from state
                    if (!repoOwner || !repoName) {
                        throw new Error('Repository owner and name are not set in the store.');
                    }
                    const data = await fetchGitHubContent(repoOwner, repoName, path);

                    if (Array.isArray(data)) { // Directory content
                        // Sort directory items: folders first, then files, alphabetically
                        const sortedData = [...data].sort((a, b) => {
                            if (a.type === b.type) {
                                return a.name.localeCompare(b.name); // Sort alphabetically if types are the same
                            }
                            return a.type === 'dir' ? -1 : 1; // Put 'dir' type first
                        });
                        set({ content: sortedData, contentType: 'dir', isLoading: false });
                    } else if (typeof data === 'object' && data !== null && data.type === 'file') { // File content
                        set({ content: data, contentType: 'file', isLoading: false });
                    } else {
                        // Should not happen with the current API client, but good practice
                        console.error('Unexpected API response format:', data);
                        throw new Error('Unexpected API response format');
                    }
                } catch (err) {
                    console.error('Error in fetchContent action:', err);
                    set({
                        error: err instanceof Error ? err : new Error('An unknown error occurred'),
                        content: null,
                        contentType: null,
                        // isLoading is set to false in finally
                    });
                } finally {
                    set({ isLoading: false }); // Ensure loading is always set to false
                }
            },

            // 内部アクション (直接呼び出すことは少ない)
            _setContent: (content, type) => set({ content, contentType: type }),
            _setLoading: (loading) => set({ isLoading: loading }),
            _setError: (error) => set({ error }),
            _setCurrentPath: (path) => set({ currentPath: path }),
        }),
        {
            name: 'github-content-store', // devtoolsでの表示名
        }
    )
);

// 初期化処理: 環境変数から読み込む (createの外でも可能)
// useContentStore.getState().setRepoInfo(
//   import.meta.env.VITE_GITHUB_REPO_OWNER || '',
//   import.meta.env.VITE_GITHUB_REPO_NAME || ''
// );
// Note: create内の初期値設定で十分な場合が多い

export default useContentStore;