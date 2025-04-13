import React, { useEffect } from 'react';
import useContentStore from '../store/contentStore';
// No need for shallow import when selecting primitives individually
import LoadingIndicator from './LoadingIndicator';
import ErrorDisplay from './ErrorDisplay';
import DirectoryView from './DirectoryView';
import FileView from './FileView';
import Breadcrumbs from './Breadcrumbs';


interface ContentExplorerProps {
  initialPath: string;
}

const ContentExplorer: React.FC<ContentExplorerProps> = ({ initialPath }) => {
  // Select individual state slices to prevent unnecessary re-renders
  const fetchContent = useContentStore((state) => state.fetchContent);
  const isLoading = useContentStore((state) => state.isLoading);
  const error = useContentStore((state) => state.error);
  const content = useContentStore((state) => state.content);
  const contentType = useContentStore((state) => state.contentType);
  const currentPath = useContentStore((state) => state.currentPath);

  // initialPathが変更されたら（URLが変わったら）データを再取得
  useEffect(() => {
    console.log(`ContentExplorer useEffect triggered for path: ${initialPath}`);
    fetchContent(initialPath);
  }, [initialPath, fetchContent]); // initialPath と fetchContent を依存配列に追加

  // レンダリングロジック
  const renderContent = () => {
    if (isLoading) {
      return <LoadingIndicator />;
    }
    if (error) {
      // 404エラーの場合はNotFoundコンポーネントを表示することも検討できるが、
      // ここでは汎用的なエラー表示とする
      return <ErrorDisplay error={error} />;
    }
    if (contentType === 'dir' && Array.isArray(content)) {
      return <DirectoryView data={content} />;
    }
    if (contentType === 'file' && typeof content === 'object' && content !== null && !Array.isArray(content)) {
      // Explicitly cast content to the expected type for FileView if necessary,
      // but the type guard should handle it.
      // Consider refining GitHubContent type in store for better type safety.
      return <FileView data={content as any} />; // Using 'as any' for now, refine later if needed
    }
    // 初期状態やデータがない場合
    return <div className="p-4 text-center text-gray-500">Select a file or directory.</div>;
  };

  return (
    <div className="p-4">
      {/* パンくずリストを配置 */}
      <Breadcrumbs />

      {/* デバッグ情報（任意） */}
      {/* <div className="text-xs text-gray-400 mb-2">Current Store Path: /{currentPath}</div> */}

      {/* メインコンテンツエリア */}
      {renderContent()}
    </div>
  );
};

export default ContentExplorer;