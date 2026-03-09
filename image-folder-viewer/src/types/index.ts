// 型定義

// カード固有のビューア状態
export interface CardViewerState {
  lastImageIndex: number;
  lastImageFilename?: string;
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
}

// カード
export interface Card {
  id: string;
  title: string;
  folderPath: string;
  thumbnail: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** サブディレクトリを含めて画像を検索するか */
  recursive: boolean;
  /** カード固有のビューア状態（未設定時は undefined） */
  viewerState?: CardViewerState;
}

// カード（検証結果付き）
export interface CardWithStatus extends Card {
  isValid: boolean;
  errorMessage?: string;
}

// タグ情報
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// カードとタグの関連
export interface CardTag {
  cardId: string;
  tagId: string;
}

// ウィンドウ状態
export interface WindowState {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
}

// アプリケーション状態（プロファイル内に保存）
export interface AppState {
  lastPage: "index" | "viewer";
  lastCardId: string | null;
  lastImageIndex: number;
  lastImageFilename?: string;
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
  window: WindowState;
}

// プロファイルデータ（.ivprofileファイルの内容）
export interface ProfileData {
  version: string;
  updatedAt: string;
  cards: Card[];
  tags: Tag[];
  cardTags: CardTag[];
  appState: AppState;
}

// 最近使用したプロファイル
export interface RecentProfile {
  path: string;
  name: string;
  lastOpenedAt: string;
}

// サムネイルのアスペクト比
export type ThumbnailAspectRatio = "16:9" | "4:3" | "1:1";

// アプリ共通設定
export interface AppConfig {
  version: string;
  recentProfiles: RecentProfile[];
  maxRecentProfiles: number;
  theme: "light" | "dark";
  /** 起動時にウィンドウを最前面に表示する（Linux のフォーカス盗み防止対策、デフォルト: true） */
  focusOnStartup: boolean;
  /** サムネイルのアスペクト比（デフォルト: "16:9"） */
  thumbnailAspectRatio: ThumbnailAspectRatio;
}

// 起動時初期状態（get_initial_state コマンドの戻り値）
export interface InitialState {
  appConfig: AppConfig;
  profile: ProfileData | null;
  profilePath: string | null;
}

// 画像ファイル情報（軽量版：ビューア用）
export interface ImageFile {
  path: string;
  filename: string;
}

// 画像詳細情報（将来の画像情報表示機能用）
export interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  modifiedAt: string;
}

// ビューア状態（ランタイム用）
export interface ViewerState {
  currentCardId: string | null;
  currentIndex: number;
  images: ImageFile[];
  shuffledIndices: number[] | null;
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
}
