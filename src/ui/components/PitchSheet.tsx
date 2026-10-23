/**
 * The booking email (FR-24, FR-25): 120 to 180 words, evidence chips for Qloo says, Fans say
 * and the suggested opener. Every number in it is checked against the evidence object on the
 * server; if Gus's draft fails, the deterministic draft is used and labeled. Editable; copy,
 * share or open in mail.
 */
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Share, TextInput, View } from 'react-native';
import { Sheet } from './Sheet';
import type { DayKey, Receipt } from '@/lib/types';
import { api } from '../api';
import { haptic } from '../haptics';
import { C, F } from '../theme';
import { Btn, Chip, Row } from './core';
import { GusLine } from './Gus';
import { DemoTag, Prov } from './Receipts';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

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

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      closeLabel="Close pitch"
      title={`Pitch ${ev?.room.name ?? target?.cityName ?? ''}`}
      subtitle={ev ? `${target?.cityName ?? ''}${target?.date ? ` · ${target.date.day.charAt(0).toUpperCase()}${target.date.day.slice(1)} ${target.date.date}` : ''}` : 'Gus is drafting'}
      large
      footer={
        ev ? (
          <Row gap={8}>
            <Btn tone="action" size="lg" onPress={copy} style={{ flex: 1 }} full icon={<Icon name="copy" variant="bold" size={18} color={C.text} />}>
              {copied ? 'Copied' : 'Copy email'}
            </Btn>
            <Btn size="lg" onPress={Platform.OS === 'web' ? mail : share} icon={<Icon name={Platform.OS === 'web' ? 'mail' : 'share'} size={18} color={C.text} />}>
              {Platform.OS === 'web' ? 'Mail' : 'Share'}
            </Btn>
          </Row>
        ) : null
      }
    >
        <View style={{ gap: 14 }}>
          {err ? <T color={C.bad}>{err}</T> : null}
          {!res && !err ? <GusLine line={null} thinking="Drafting the pitch. Every number has to come from the evidence" /> : null}
          {ev ? (
            <>
              <View style={{ gap: 8 }}>
                <Row gap={6} wrap>
                  <Prov kind="qloo" receipts={res!.receipts} title="Evidence behind the pitch" />
                  {ev.qloo.cityRank ? <Chip mono color={C.qloo}>#{ev.qloo.cityRank} of {ev.qloo.citiesScored} cities</Chip> : null}
                  {ev.qloo.wantedScore !== null ? <Chip mono color={C.qloo}>Wanted Score {ev.qloo.wantedScore.toFixed(0)}</Chip> : null}
                  {ev.qloo.sleeper ? <Chip mono color={C.gold} icon={<Icon name="star" variant="bold" size={12} color={C.gold} />}>sleeper city</Chip> : null}
                  {ev.qloo.roomInTopNeighborhood ? <Chip mono color={C.qloo}>room in a top-3 neighborhood</Chip> : null}
                  {ev.qloo.pulledBy.length > 1 ? <Chip mono color={C.qloo}>pulled by {ev.qloo.pulledBy.map((p) => `${p.name} ${Math.round(p.share * 100)}%`).join(' · ')}</Chip> : null}
                </Row>
                <Row gap={6} wrap>
                  <Prov kind="fans" />
                  <Chip mono color={C.fans}>{ev.fans.signatures} signatures</Chip>
                  {ev.fans.proofRatio !== null ? <Chip mono color={ev.fans.proofRatio >= 1.5 ? C.good : C.fans}>{ev.fans.proofRatio.toFixed(1)}x proof ratio</Chip> : null}
                  {ev.fans.neighborhoods.slice(0, 2).map((n) => (
                    <Chip key={n.name} mono color={C.fans}>
                      {n.count} in {n.name}
                    </Chip>
                  ))}
                  {ev.fans.isDemoData ? <DemoTag /> : null}
                </Row>
                {ev.opener ? (
                  <Row gap={6} wrap>
                    <Prov kind="gus" />
                    <Chip mono color={C.gus}>opener: {ev.opener.name}</Chip>
                    <Chip mono>shares {ev.opener.shared.slice(0, 3).join(', ')}</Chip>
                  </Row>
                ) : null}
              </View>
              <View style={{ gap: 6 }}>
                <T v="label">Subject</T>
                <TextInput value={subject} onChangeText={setSubject} accessibilityLabel="Email subject" style={{ color: C.text, fontFamily: F.bodyMed, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, outlineStyle: 'none' } as object} />
                <T v="label">Email</T>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  multiline
                  accessibilityLabel="Email body"
                  style={{ color: C.text, fontFamily: F.body, fontSize: 14.5, lineHeight: 21, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, minHeight: 300, outlineStyle: 'none', textAlignVertical: 'top' } as object}
                />
                <Row gap={8} wrap>
                  <Chip mono color={res!.email.check.ok ? C.good : C.warn}>
                    {res!.email.check.words} words · {res!.email.check.ok ? 'every number checked' : 'check flagged'}
                  </Chip>
                  <Chip mono color={C.gus}>{res!.email.model.startsWith('gus-lite') ? 'drafted by Gus (lite)' : `drafted by ${res!.email.model.split('/').pop()?.replace(':free', '')}`}</Chip>
                </Row>
                {!res!.email.check.ok ? <T v="caption">{res!.email.check.problems.join('; ')}</T> : null}
              </View>
              <T v="caption">Qloo predicts taste, not headcounts, so the pitch never promises a capacity or ticket number.</T>
            </>
          ) : null}
        </View>
    </Sheet>
  );
}
