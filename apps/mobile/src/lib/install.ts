// Native apps are already installed; see install.web.ts for the web board.
export type InstallState = 'installed' | 'prompt' | 'ios' | 'other';
export const listenForInstall = () => {};
export const installState = (): InstallState => 'installed';
export const promptInstall = async () => false;
export const onInstallChange = (_fn: () => void) => () => {};
