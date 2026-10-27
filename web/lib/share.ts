'use client';
/**
 * Hand a story image to the phone's share sheet, where Instagram, TikTok and Messages take a
 * picture straight into a story or a chat. Desktops (and browsers that can't share files)
 * save the image instead, with the link copied so the caption is one paste away.
 */
import { gus } from './gus';
import { haptic } from './haptics';

export async function shareStory(src: string, name: string, opts: { text: string; url: string }) {
  haptic('tap');
  gus.flash('Making the story', 4000);
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const file = new File([blob], `${name}.jpg`, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      gus.flash('Pick where to post it', 1600);
      await navigator.share({ files: [file], text: `${opts.text} ${opts.url}` });
      haptic('success');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await navigator.clipboard?.writeText(`${opts.text} ${opts.url}`).catch(() => {});
    gus.flash('Saved. Caption copied', 2400);
    haptic('success');
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return gus.flash('Maybe later', 1200);
    gus.flash('Couldn’t make it just now', 2000);
  }
}
