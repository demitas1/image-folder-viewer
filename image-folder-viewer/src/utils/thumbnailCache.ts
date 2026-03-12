// サムネイルURLメモリキャッシュ（プロセス中保持でプロファイル切替後も即時返却）

import { getThumbnail } from "../api/tauri";

// DataURLメモリキャッシュ（アプリ起動中保持）
const urlCache = new Map<string, string>();

// セマフォ: 同時IPCリクエスト数を最大1に制限（CPU競合防止・スクロール操作性優先）
const MAX_CONCURRENT = 1;
let activeCount = 0;

interface QueueEntry {
  resolve: () => void; // activeCount++ してPromiseを解決する
  cancelled: boolean;
}
const waitQueue: QueueEntry[] = [];

function acquireSlot(): { promise: Promise<void>; cancelEntry: () => void } {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return { promise: Promise.resolve(), cancelEntry: () => {} };
  }
  let entry!: QueueEntry;
  const promise = new Promise<void>((resolve) => {
    entry = {
      resolve: () => { activeCount++; resolve(); },
      cancelled: false,
    };
    waitQueue.push(entry);
  });
  return { promise, cancelEntry: () => { entry.cancelled = true; } };
}

function releaseSlot(): void {
  activeCount--;
  // キャンセル済みエントリをスキップしてスロットを次の待機者に渡す
  while (waitQueue.length > 0) {
    const next = waitQueue.shift()!;
    if (!next.cancelled) {
      next.resolve(); // activeCount++ + Promise解決
      return;
    }
    // キャンセル済み: スキップ（activeCount は増やさない = スロット解放済み状態を維持）
  }
}

// 進行中リクエストの管理（重複排除 + キャンセル対応）
interface PendingEntry {
  promise: Promise<string>;
  refCount: number;       // このキーを参照しているコンシューマー数
  cancelEntry: (() => void) | null; // キュー待機中のみ有効、スロット取得後はnull
  slotAcquired: boolean;  // スロットを取得してIPC発行済みかどうか
}
const pending = new Map<string, PendingEntry>();

export function fetchThumbnail(imagePath: string, size: number): Promise<string> {
  const key = `${imagePath}:${size}`;

  // メモリキャッシュヒット → 即時返却（スロット消費なし）
  if (urlCache.has(key)) {
    return Promise.resolve(urlCache.get(key)!);
  }

  // 進行中リクエストの重複排除（スロット消費なし）
  if (pending.has(key)) {
    const entry = pending.get(key)!;
    entry.refCount++;
    return entry.promise;
  }

  const { promise: slotPromise, cancelEntry } = acquireSlot();
  const pendingEntry: PendingEntry = {
    promise: null!,
    refCount: 1,
    cancelEntry,
    slotAcquired: false,
  };

  const promise = slotPromise
    .then(() => {
      pendingEntry.slotAcquired = true;
      pendingEntry.cancelEntry = null; // IPC発行後はキャンセル不可
      return getThumbnail(imagePath, size);
    })
    .then((url) => {
      urlCache.set(key, url);
      return url;
    })
    .finally(() => {
      if (pendingEntry.slotAcquired) {
        releaseSlot();
      }
      pending.delete(key);
    });

  pendingEntry.promise = promise;
  pending.set(key, pendingEntry);
  return promise;
}

/**
 * スクロールアウト等でサムネイルが不要になった際に呼ぶ。
 * キュー待機中のリクエストをキャンセルしてスロットを解放する。
 * IPC発行済み（スロット取得後）はキャンセル不可。
 */
export function cancelThumbnail(imagePath: string, size: number): void {
  const key = `${imagePath}:${size}`;
  const entry = pending.get(key);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0 && entry.cancelEntry) {
    // キュー待機中のエントリをキャンセル
    entry.cancelEntry();
    pending.delete(key);
    // slotPromise は永遠に解決しないが、参照がなくなりGCされる
    // releaseSlot 側でキャンセル済みエントリをスキップするため activeCount は正しく維持される
  }
}
