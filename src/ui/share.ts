/**
 * Share a link the way each platform expects: the system share sheet on iOS and Android, the
 * Web Share API in mobile browsers, and the clipboard everywhere else. Returns what happened
 * so the caller can say "Copied" instead of guessing.
 */
import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

export async function shareLink(url: string, title: string, text?: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (Platform.OS !== 'web') {
    const r = await Share.share({ title, message: text ? `${text} ${url}` : url, url });
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  }
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.share && /iPhone|iPad|Android/i.test(nav.userAgent)) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  await Clipboard.setStringAsync(url);
  return 'copied';
}
