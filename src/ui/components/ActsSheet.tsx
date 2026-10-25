/**
 * Your acts: the one place for who you are in the app. Opened from the artist name above every
 * screen's title (and the map's name pill). Switch act, scout another, or open Settings.
 */
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import { useMemo } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { GlassSheet, GlassSheetContent, GlassSheetTitle } from '@/components/glassyui/glass-sheet';
import { Icon } from '@/ui/icons/Icon';
import { session } from '@/ui/session';
import { C, F, gradient, IMAGES, S } from '@/ui/theme';
import { Group, ListRow } from './core';
import { T } from './T';

export function Avatar({ name, demo }: { name: string; demo: boolean }) {
  return demo ? (
    <Image source={IMAGES['maya-sticker']} style={{ width: 34, height: 34 }} contentFit="contain" accessibilityIgnoresInvertColors />
  ) : (
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{name.slice(0, 1).toUpperCase()}</T>
    </View>
  );
}

/** The header pill opens this: switch between Maya's demo and acts scouted on this device, scout another, or open Settings. */
export function ActsSheet({ open, onClose, slug, current }: { open: boolean; onClose: () => void; slug: string; current: string }) {
  const acts = useMemo(() => (open ? session.acts() : []), [open]);
  // Replace the artist on the root stack. router.replace from inside a tab only swaps that
  // tab's params, leaving the other tabs (and the artist layout) on the previous act.
  const root = useNavigation<{ replace: (name: string, params: object) => void }>('/');
  const go = (to: string) => {
    onClose();
    if (to !== slug) setTimeout(() => root.replace('a/[artist]', { artist: to }), 220);
  };
  const tick = (on: boolean) => (on ? <Icon name="check" variant="bold" size={20} color={C.purpleHi} label="Current act" /> : null);
  return (
    <GlassSheet open={open} onOpenChange={(o) => !o && onClose()}>
      <GlassSheetContent closeLabel="Close">
        <View style={{ gap: S.lg }}>
          <GlassSheetTitle>Your acts</GlassSheetTitle>
          <Group>
            <ListRow
              onPress={() => go('maya-ortiz')}
              leading={<Image source={IMAGES['maya-sticker']} style={{ width: 38, height: 38 }} contentFit="contain" />}
              title="Maya Ortiz"
              subtitle="Demo tour · Phoebe Bridgers + Japanese Breakfast"
              trailing={tick(slug === 'maya-ortiz')}
              accessibilityLabel={`Maya Ortiz, demo tour${slug === 'maya-ortiz' ? ', current' : ''}`}
            />
            {acts.map((a) => (
              <ListRow
                key={a.slug}
                onPress={() => go(a.slug)}
                leading={<Avatar name={a.name} demo={false} />}
                title={a.name}
                subtitle={a.sounds.length ? `Sounds like ${a.sounds.join(' + ')}` : undefined}
                trailing={tick(slug === a.slug)}
                accessibilityLabel={`${a.name}${slug === a.slug ? ', current' : ''}`}
              />
            ))}
          </Group>
          <Group>
            <ListRow
              onPress={() => {
                onClose();
                setTimeout(() => router.push('/welcome?start=link'), 220);
              }}
              leading={
                <View style={[{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, gradient('linear-gradient(180deg, #B45CF0 0%, #8A22D0 100%)')]}>
                  <Icon name="scout" variant="bold" size={17} color="#fff" />
                </View>
              }
              title="Add an act"
              subtitle="Paste a link. About ten seconds."
            />
            <ListRow
              onPress={() => {
                onClose();
                setTimeout(() => router.push(`/a/${slug}/settings`), 220);
              }}
              leading={
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#3a3a3c', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="settings" size={17} color="#fff" />
                </View>
              }
              title="Settings"
              subtitle="Voice, data sources, receipts"
            />
          </Group>
        </View>
      </GlassSheetContent>
    </GlassSheet>
  );
}

/** The map's name pill drops this menu: your acts with a tick on the current one, and Add an act. */
export function ActsMenu({ open, onClose, slug, top }: { open: boolean; onClose: () => void; slug: string; top: number }) {
  const acts = useMemo(() => (open ? session.acts() : []), [open]);
  const root = useNavigation<{ replace: (name: string, params: object) => void }>('/');
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: open ? 1 : 0, duration: open ? 180 : 120, useNativeDriver: true }).start();
  }, [open, fade]);
  if (!open) return null;
  const go = (to: string) => {
    onClose();
    if (to !== slug) setTimeout(() => root.replace('a/[artist]', { artist: to }), 120);
  };
  const all = [{ slug: 'maya-ortiz', name: 'Maya Ortiz', demo: true, sub: 'Demo tour' }, ...acts.map((a) => ({ slug: a.slug, name: a.name, demo: false, sub: a.sounds.length ? a.sounds.join(' + ') : '' }))];
  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close act menu" />
      <Animated.View
        style={{ position: 'absolute', top, left: S.gutter, width: 300, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}
      >
        <GlassSurface preset="prominent" style={{ borderRadius: 22, borderCurve: 'continuous', overflow: 'hidden', paddingVertical: 6 }}>
          {all.map((a) => (
            <MenuRow key={a.slug} onPress={() => go(a.slug)} label={a.name} sub={a.sub} selected={a.slug === slug} leading={<Avatar name={a.name} demo={a.demo} />} />
          ))}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineHi, marginVertical: 6, marginHorizontal: 16 }} />
          <MenuRow
            onPress={() => {
              onClose();
              setTimeout(() => router.push('/welcome?start=link'), 120);
            }}
            label="Add an act"
            leading={
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="scout" size={16} color={C.text} />
              </View>
            }
          />
        </GlassSurface>
      </Animated.View>
    </>
  );
}

function MenuRow({ label, sub, selected, leading, onPress }: { label: string; sub?: string; selected?: boolean; leading: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${label}${selected ? ', current' : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: 16, minHeight: 52, backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' })}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <T v="body" numberOfLines={1}>
          {label}
        </T>
        {sub ? (
          <T v="footnote" color={C.text2} numberOfLines={1}>
            {sub}
          </T>
        ) : null}
      </View>
      {selected ? <Icon name="check" variant="bold" size={16} color={C.text} /> : null}
    </Pressable>
  );
}
