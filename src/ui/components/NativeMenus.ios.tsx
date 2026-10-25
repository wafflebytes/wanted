/**
 * The map header's dropdowns as real iOS menus: SwiftUI Menu with a Liquid Glass trigger, so the
 * system draws, animates and dismisses them (morph from the button, haptics, the checkmark).
 */
import { Host } from '@expo/ui';
import { Button, Divider, Menu } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, controlSize, menuIndicator, opacity, scaleEffect, tint } from '@expo/ui/swift-ui/modifiers';
import { router, useNavigation } from 'expo-router';
import { useMemo } from 'react';
import type { Basemap } from '@/ui/map/types';
import { session } from '@/ui/session';
import { C } from '@/ui/theme';

/** Your acts, the current one ticked, then Add an act. */
export function ActsMenuNative({ slug, name }: { slug: string; name: string }) {
  const acts = useMemo(() => session.acts(), [slug]);
  // Replace the artist on the root stack so every tab follows the new act.
  const root = useNavigation<{ replace: (n: string, p: object) => void }>('/');
  const go = (to: string) => to !== slug && root.replace('a/[artist]', { artist: to });
  const all = [{ slug: 'maya-ortiz', name: 'Maya Ortiz' }, ...acts.map((a) => ({ slug: a.slug, name: a.name }))];
  return (
    <Host matchContents style={{ height: 44 }}>
      <Menu label={name || ' '} modifiers={[buttonStyle('glass'), controlSize('large'), menuIndicator('visible'), tint(C.text)]}>
        {all.map((a) => (
          <Button key={a.slug} label={a.name} systemImage={a.slug === slug ? 'checkmark' : undefined} onPress={() => go(a.slug)} />
        ))}
        <Divider />
        <Button label="Add an act" systemImage="plus" onPress={() => router.push('/welcome?start=link')} />
      </Menu>
    </Host>
  );
}

/** Map style, as a round glass button with a native menu. */
/** The system menu with its label hidden, to sit over a button that is drawn in JS; the menu owns the tap. */
export function LayersMenuNative({ value, options, onChange }: { value: Basemap; options: { key: Basemap; label: string }[]; onChange: (b: Basemap) => void }) {
  return (
    <Host style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 44 }}>
      <Menu label="" systemImage="circle.fill" modifiers={[buttonStyle('plain'), scaleEffect(4), opacity(0.011), menuIndicator('hidden')]}>
        {options.map((b) => (
          <Button key={b.key} label={b.label} systemImage={b.key === value ? 'checkmark' : undefined} onPress={() => onChange(b.key)} />
        ))}
      </Menu>
    </Host>
  );
}
