// サムネイルURLメモリキャッシュ（プロセス中保持でプロファイル切替後も即時返却）

import { getThumbnail } from "../api/tauri";

// DataURLメモリキャッシュ（アプリ起動中保持）
const urlCache = new Map<string, string>();

// 進行中リクエストのPromise（重複排除: 同じパス・サイズの同時リクエストを1つに集約）
const pending = new Map<string, Promise<string>>();

export function fetchThumbnail(imagePath: string, size: number): Promise<string> {
  const key = `${imagePath}:${size}`;

  // メモリキャッシュヒット → 即時返却
  if (urlCache.has(key)) {
    return Promise.resolve(urlCache.get(key)!);
  }

  // 進行中リクエストの重複排除
  if (pending.has(key)) {
    return pending.get(key)!;
  }

  const promise = getThumbnail(imagePath, size)
    .then((url) => {
      urlCache.set(key, url);
      return url;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, promise);
  return promise;
}
