/**
 * The Bounty (FR-23d): one signer per city meets the artist at soundcheck. The same card
 * serves the fan (your entries, then whether you won) and the artist (entries so far, the
 * button that picks the winner, the winner). The draw's proof never shows as hashes: "Check it’s
 * fair" re-runs it on this device, and "Copy the proof" hands the raw numbers to anyone who wants them.
 */
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { haptic } from '../haptics';
import { Icon } from '../icons/Icon';
import { C, F, R, S } from '../theme';
import type { PosterState } from '../types';
import { Btn } from './core';
import { T } from './T';

type Bounty = NonNullable<PosterState['bounty']>;

const sha = (s: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);

/** Recomputes the draw: the seal matches the secret, the snapshot matches its hash, and the ticket lands on the winner. */
async function verify(b: Bounty, commit: string): Promise<{ ok: boolean; why: string }> {
  const p = b.drawn?.proof;
  if (!p) return { ok: false, why: 'Nobody’s been picked yet.' };
  if ((await sha(p.secret)) !== commit) return { ok: false, why: 'This draw doesn’t check out.' };
  if ((await sha(p.snapshot)) !== p.snapshotHash) return { ok: false, why: 'This draw doesn’t check out.' };
  const lines = p.snapshot.split('\n').filter(Boolean).map((l) => l.split(':').map(Number));
  const total = lines.reduce((s, [, n]) => s + n, 0);
  const ticket = Number(BigInt(`0x${await sha(`${p.secret}:${p.snapshotHash}`)}`) % BigInt(total));
  let acc = 0;
  const hit = lines.find(([, n]) => ticket < (acc += n));
  if (!hit || hit[0] !== b.drawn!.winner.number) return { ok: false, why: 'This draw doesn’t check out.' };
  return { ok: true, why: `It’s fair. Fan #${hit[0]} won it.` };
}

export function BountyCard({
  bounty: b,
  artistFirst,
  side,
  signed,
  onDraw,
  drawing,
}: {
  bounty: Bounty;
  artistFirst: string;
  side: 'fan' | 'artist';
  signed?: boolean;
  onDraw?: () => void;
  drawing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<{ ok: boolean; why: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const won = side === 'fan' && !!b.drawn?.mineWon;
  const w = b.drawn?.winner;

  const headline = won
    ? `You won. You’re meeting ${artistFirst}.`
    : w
      ? `Fan #${w.number}${w.neighborhood ? ` from ${w.neighborhood}` : ''} meets ${side === 'artist' ? 'you' : artistFirst}.`
      : side === 'artist'
        ? `${b.signers} ${b.signers === 1 ? 'fan is' : 'fans are'} in the running.`
        : b.mine
          ? `You’re in, with ${b.mine.entries} ${b.mine.entries === 1 ? 'chance' : 'chances'}.`
          : `Sign and you could meet ${artistFirst}.`;

  return (
    <View
      style={{
        backgroundColor: won ? '#2A1D05' : C.card,
        borderRadius: R.card,
        borderCurve: 'continuous',
        padding: S.xl,
        gap: S.md,
        borderWidth: won ? 1 : 0,
        borderColor: C.gold,
      } as object}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="star" variant="bold" size={16} color={C.gold} />
        <T v="label" color={C.gold}>
          The Bounty
        </T>
      </View>
      <T v="headline" style={won ? { fontFamily: F.displayBold, letterSpacing: 0.2 } : undefined}>
        {headline}
      </T>
      <T v="footnote">{won ? `${b.prize} Keep this page: it’s your proof.` : b.prize}</T>

      {/* The fan's odds, in plain parts. */}
      {side === 'fan' && b.mine && !b.drawn ? (
        <View style={{ gap: 6 }}>
          <Part label="Signed the poster" value="+1" on />
          <Part label="Deputy badge" value="+1" on={b.mine.deputy} />
          <Part label={`Friends who signed with your link (${b.mine.friends} of 3)`} value={`+${b.mine.friends}`} on={b.mine.friends > 0} />
          <T v="caption">
            {b.totalEntries} chances in the hat so far. The winner’s picked when the show is booked.
          </T>
        </View>
      ) : null}

      {side === 'artist' && !b.drawn ? (
        <View style={{ gap: S.sm }}>
          <T v="caption">Gus picks the winner once the date is locked in. Or pick now.</T>
          <Btn tone="gold" size="md" full busy={drawing} disabled={!b.signers} onPress={onDraw} icon={<Icon name="star" variant="bold" size={17} color="#fff" />}>
            Pick the winner
          </Btn>
        </View>
      ) : null}

      {side === 'fan' && !b.mine && !signed ? <T v="caption">{b.rules}</T> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide how the draw is kept fair' : 'How the draw is kept fair'}
        onPress={() => (haptic.tick(), setOpen(!open))}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
          <Icon name="shield" size={14} color={C.text3} />
          <T v="caption" style={{ flex: 1 }} numberOfLines={1}>
            {b.drawn ? 'Picked fairly. Check it' : 'Locked in before anyone signed, so nobody can rig it'}
          </T>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={12} color={C.text3} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: S.md, backgroundColor: C.fill2, borderRadius: R.sm, padding: S.md }}>
          <T v="footnote">
            The draw was locked in before anyone signed, so nobody could choose the winner, Wanted included.{b.drawn ? ' Tap below and this phone runs the draw again from scratch.' : ''}
          </T>
          {b.drawn ? (
            check ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name={check.ok ? 'check' : 'warn'} size={16} color={check.ok ? C.good : C.bad} />
                <T v="footnote" color={check.ok ? C.good : C.bad} style={{ flex: 1 }}>
                  {check.ok ? `Checked on this phone. ${check.why}` : check.why}
                </T>
              </View>
            ) : (
              <Btn size="sm" onPress={async () => setCheck(await verify(b, b.commit).catch(() => ({ ok: false, why: 'Couldn’t check on this phone.' })))}>
                Check it’s fair
              </Btn>
            )
          ) : null}
          {b.drawn ? (
            <Pressable accessibilityRole="button" onPress={() => (haptic.tick(), Clipboard.setStringAsync(proofText(b)).then(() => setCopied(true)))} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <T v="caption" color={C.text3}>
                {copied ? 'Proof copied' : 'Copy the proof'}
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Part({ label, value, on }: { label: string; value: string; on: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name="check" size={14} color={on ? C.gold : C.text3} />
      <T v="footnote" color={on ? C.text : C.text3} style={{ flex: 1 }}>
        {label}
      </T>
      <T style={{ fontFamily: F.monoMed, fontSize: 13, color: on ? C.gold : C.text3 }}>{value}</T>
    </View>
  );
}

/** The raw draw, for anyone who wants to re-run it themselves. */
function proofText(b: Bounty): string {
  const p = b.drawn!.proof;
  return [`Seal: ${b.commit}`, `Secret: ${p.secret}`, `Snapshot hash: ${p.snapshotHash}`, `Ticket: ${p.ticket} of ${p.total}`, 'Snapshot (signature:entries):', p.snapshot].join('\n');
}
