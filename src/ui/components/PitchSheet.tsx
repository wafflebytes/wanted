/**
 * The booking email (FR-24, FR-25): 120 to 180 words, evidence chips for Qloo says, Fans say
 * and the suggested opener. Every number in it is checked against the evidence object on the
 * server; if Gus's draft fails, the deterministic draft is used and labeled. Editable; copy,
 * share or open in mail.
 */
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { GlassSheet, GlassSheetContent, GlassSheetTitle } from '@/components/glassyui/glass-sheet';
import type { DayKey, Receipt } from '@/lib/types';
import { api } from '../api';
import { haptic } from '../haptics';
import { C, F } from '../theme';
import { Btn } from './core';
import { GusLine } from './Gus';
import { DemoTag } from './Receipts';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';

type PitchEvidence = {
  artist: { name: string; soundsLike: string[] };
  room: { name: string; neighborhood: string | null; website: string | null };
  city: { name: string; state: string };
  date: { date: string; day: DayKey } | null;
  qloo: { wantedScore: number | null; cityRank: number | null; citiesScored: number; heatRank: number | null; liftRank: number | null; sleeper: boolean; topNeighborhoods: string[]; roomInTopNeighborhood: boolean; pulledBy: { name: string; share: number }[]; vibe: string[] };
  fans: { signatures: number; deputies: number; neighborhoods: { name: string; count: number }[]; signatureShare: number | null; heatShare: number | null; proofRatio: number | null; isDemoData: boolean };
  opener: { name: string; shared: string[] } | null;
};
type PitchResponse = { evidence: PitchEvidence; email: { subject: string; body: string; model: string; check: { ok: boolean; words: number; problems: string[] } }; receipts: Receipt[] };

export type PitchTarget = { city: string; cityName: string; roomId: string | null; date: { date: string; day: DayKey } | null };

export function PitchSheet({ slug, target, onClose }: { slug: string; target: PitchTarget | null; onClose: () => void }) {
  const [res, setRes] = useState<PitchResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!target) return;
    let live = true;
    setRes(null);
    setErr(null);
    setCopied(false);
    api
      .post<PitchResponse>(`/artist/${slug}/pitch`, { city: target.city, roomId: target.roomId, date: target.date })
      .then((r) => {
        if (!live) return;
        setRes(r);
        setBody(r.email.body);
        setSubject(r.email.subject);
        haptic.success();
      })
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [slug, target]);

  const ev = res?.evidence;
  const copy = async () => {
    await Clipboard.setStringAsync(`Subject: ${subject}\n\n${body}`);
    haptic.tap();
    setCopied(true);
  };
  const share = async () => {
    if (Platform.OS === 'web') return copy();
    await Share.share({ title: subject, message: `${subject}\n\n${body}` });
  };
  const mail = () => Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

  const hoods = ev?.fans.neighborhoods.slice(0, 2).map((n) => n.name) ?? [];
  const where = ev ? [ev.room.neighborhood, ev.city.name].filter(Boolean).join(', ') : target?.cityName ?? '';

  return (
    <GlassSheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <GlassSheetContent closeLabel="Close pitch">
        <View style={{ gap: 2 }}>
          <GlassSheetTitle>{ev ? `Write to ${ev.room.name}` : `Pitch ${target?.cityName ?? ''}`}</GlassSheetTitle>
          {ev ? (
            <T v="footnote" color={C.text2}>
              {where}
              {ev.date ? ` · ${new Date(`${ev.date.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
            </T>
          ) : null}
        </View>
        <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 18, paddingTop: 14, paddingBottom: 4 }} keyboardDismissMode="interactive">
          {err ? <T color={C.bad}>{err}</T> : null}
          {!res && !err ? <GusLine line={null} thinking={`Writing to ${target?.cityName ?? 'the room'}. Only real numbers go in.`} orb="composing" /> : null}
          {ev ? (
            <>
              {/* Why they should say yes: three lines, an icon each. */}
              <View style={{ gap: 12 }}>
                <Proof icon="signature" tint={C.fans}>
                  {`${ev.fans.signatures} people signed${hoods.length ? `, most from ${hoods.join(' and ')}` : ''}.`}
                </Proof>
                <Proof icon="music" tint={C.amber}>
                  {ev.qloo.pulledBy.length ? `Fans of ${ev.qloo.pulledBy[0].name} here like your sound.` : `${ev.city.name} likes your sound.`}
                  {ev.qloo.roomInTopNeighborhood ? ' The room is right where they live.' : ''}
                </Proof>
                {ev.opener ? (
                  <Proof icon="ticket" tint={C.text2}>
                    {`${ev.opener.name} would open well.`}
                  </Proof>
                ) : null}
                {ev.fans.isDemoData ? <DemoTag /> : null}
              </View>

              {/* The email, like a Mail compose window: subject on a line, the body below. */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 46, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.lineHi }}>
                  <T v="callout" color={C.text3} style={{ width: 64 }}>
                    Subject
                  </T>
                  <TextInput value={subject} onChangeText={setSubject} accessibilityLabel="Email subject" style={{ flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 15, paddingVertical: 12, outlineStyle: 'none' } as object} />
                </View>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  multiline
                  scrollEnabled={false}
                  accessibilityLabel="Email body"
                  style={{ color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 22, padding: 14, paddingTop: 12, outlineStyle: 'none', textAlignVertical: 'top' } as object}
                />
              </View>
              {!res!.email.check.ok ? (
                <T v="footnote" color={C.warn}>
                  Gus wasn't sure about: {res!.email.check.problems.join('; ')}
                </T>
              ) : null}

            </>
          ) : null}
        </ScrollView>
        {ev ? (
          // Pinned under the email, so sending never needs a scroll.
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 12 }}>
            <Btn tone="scout" size="lg" style={{ flex: 1 }} full onPress={mail} icon={<Icon name="mail" variant="bold" size={18} color={C.text} />}>
              Open in Mail
            </Btn>
            <Round icon={copied ? 'check' : 'copy'} label={copied ? 'Copied' : 'Copy email'} onPress={copy} />
            {Platform.OS !== 'web' ? <Round icon="share" label="Share" onPress={share} /> : null}
          </View>
        ) : null}
      </GlassSheetContent>
    </GlassSheet>
  );
}

function Proof({ icon, tint, children }: { icon: IconName; tint: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} color={tint} />
      </View>
      <T v="callout" style={{ flex: 1, paddingTop: 4 }}>
        {children}
      </T>
    </View>
  );
}

function Round({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' })}>
      <Icon name={icon} size={20} color={C.text} />
    </Pressable>
  );
}
