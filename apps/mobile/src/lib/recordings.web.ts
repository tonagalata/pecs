// Web: the recorder returns a temporary blob: URL. Convert it to a data URL so it survives reloads.
export async function keepRecording(tempUri: string): Promise<string> {
  const blob = await (await fetch(tempUri)).blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function deleteRecording(_uri: string) {}
