// 型定義

// カード
export interface Card {
  id: string;
  title: string;
  folderPath: string;
  thumbnail: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

// アプリ共通設定
export interface AppConfig {
  version: string;
  recentProfiles: RecentProfile[];
  maxRecentProfiles: number;
  theme: "light" | "dark" | "system";
}

// 画像情報
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
  images: ImageInfo[];
  shuffledIndices: number[] | null;
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
}
