const REVOKE_DELAY_MS = 4000;

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export function downloadText(filename: string, text: string, mime: string = "text/plain"): void {
  saveBlob(filename, new Blob(["﻿", text], { type: `${mime};charset=utf-8` }));
}

export function downloadBytes(filename: string, bytes: Uint8Array, mime: string): void {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  saveBlob(filename, new Blob([copy], { type: mime }));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
