/**
 * Detects whether the app is running inside Tauri v2.
 *
 * Tauri v2 exposes `window.__TAURI_INTERNALS__` by default. The legacy
 * `window.__TAURI__` global is only injected when `app.withGlobalTauri`
 * is set to `true` in `tauri.conf.json` (it isn't, for this project).
 *
 * Checking the v1 global was the cause of the silent BLE-connect failure
 * on Steam Deck: `isTauri()` returned false, `connect()` fell through to
 * the (now-removed) Web Bluetooth branch, and WebKitGTK has no
 * `navigator.bluetooth`, so the hook reported "unsupported" without ever
 * calling `invoke()`. Both globals are accepted for forward/backward
 * compatibility.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window
}
