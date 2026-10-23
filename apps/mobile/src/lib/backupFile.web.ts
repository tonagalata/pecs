// Web: download the backup as a file, and open one with the browser's file picker.
export async function saveBackupFile(name: string, json: string): Promise<'saved' | 'cancelled'> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'saved';
}

export function openBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = async () => {
      const f = input.files?.[0];
      input.remove();
      resolve(f ? await f.text() : null);
    };
    // No reliable "cancelled" event everywhere; a later pick simply resolves a new promise.
    document.body.appendChild(input);
    input.click();
  });
}
