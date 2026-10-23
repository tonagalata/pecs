// Web: photos and recordings are data URLs kept inside the board in IndexedDB.
export interface MediaBytes { bytes: Uint8Array; type: string }

export async function readMedia(uri: string): Promise<MediaBytes | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type || 'application/octet-stream' };
  } catch {
    return null;
  }
}

export async function writeMedia(_id: string, data: MediaBytes): Promise<string> {
  const blob = new Blob([data.bytes as BlobPart], { type: data.type });
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
