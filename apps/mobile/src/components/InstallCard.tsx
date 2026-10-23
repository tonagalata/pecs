import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { installState, onInstallChange, promptInstall, type InstallState } from '@/lib/install';
import { Btn, Card, Icon, Row, Txt } from './ui';

/** Settings › Install PictoTalk (web only): add it to the home screen, and whether it works offline yet. */
export function InstallCard() {
  const [state, setState] = useState<InstallState>(installState);
  const [offline, setOffline] = useState('');

  useEffect(() => onInstallChange(() => setState(installState())), []);

  // Ask the service worker whether the whole app is saved on this device.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; cached?: number; total?: number };
      if (d?.type !== 'pictotalk:status') return;
      setOffline(!d.total ? '' : (d.cached ?? 0) >= d.total ? 'Ready to use offline on this device.' : `Saving the app for offline use (${d.cached ?? 0} of ${d.total} files)…`);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage('pictotalk:status')).catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);

  if (Platform.OS !== 'web') return null;
  return (
    <Card>
      <Txt display size={18}>Install PictoTalk</Txt>
      {state === 'installed' ? (
        <Row gap={8}><Icon name="check-circle" size={20} /><Txt size={15} style={{ flex: 1 }}>Installed. PictoTalk opens from the home screen like any other app.</Txt></Row>
      ) : state === 'prompt' ? (
        <>
          <Txt soft size={14}>Adds PictoTalk to the home screen or dock. It opens full screen and works without internet.</Txt>
          <Btn kind="primary" icon="download" label="Install" onPress={() => { promptInstall(); }} />
        </>
      ) : state === 'ios' ? (
        <>
          <Txt soft size={14}>Adds PictoTalk to the home screen. It opens full screen and works without internet.</Txt>
          <Txt size={15}>1. In Safari, tap the Share button <Icon name="share" size={16} />.</Txt>
          <Txt size={15}>2. Choose “Add to Home Screen”.</Txt>
          <Txt size={15}>3. Tap “Add”.</Txt>
        </>
      ) : (
        <Txt soft size={14}>To install, use your browser’s menu: “Install PictoTalk” or “Add to Home screen”. Chrome, Edge and Safari support this.</Txt>
      )}
      {offline ? <Txt soft size={14}>{offline}</Txt> : null}
    </Card>
  );
}
