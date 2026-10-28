"use client";
/**
 * The poster a fan lands on from a link: no app, no account. The poster on the wall, how close
 * the city is, and one short form: your initials, your neighbourhood, sign. Signing prints a
 * receipt with your number on it and a link to bring two friends.
 */
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PosterState } from "@/ui/types";
import { Art } from '@web/components/Art';
import { Icon } from "@web/components/Icon";
import { Reel } from "@web/components/Reel";
import { api, ApiError } from "@web/lib/api";
import { mutate, useApi } from "@web/lib/hooks";
import "../../../posters.css";
import "../../../fan.css";

const PROOF = 50;
type SignOut = {
  claim: NonNullable<PosterState["mine"]>;
  alreadySigned: boolean;
  count: number;
  wear: 0 | 1 | 2 | 3;
};
const stamp = (t: number) =>
  new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function FanPoster() {
  const { artist, city } = useParams<{ artist: string; city: string }>();
  const path = `/w/${artist}/${city}`;
  const poster = useApi<PosterState>(path, { every: 10_000 });
  const p = poster.data;
  const [initials, setInitials] = useState("");
  const [hood, setHood] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mineNow, setMineNow] = useState<SignOut | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("on-wall");
    return () => document.documentElement.classList.remove("on-wall");
  }, []);
  useEffect(() => {
    if (p) document.title = `WANTED in ${p.city.name}: ${p.artist.name}`;
  }, [p]);

  const hoods = useMemo(() => {
    if (!p) return [];
    return [
      ...new Set([
        ...p.topNeighborhoods,
        ...p.neighborhoods.map((n) => n.name),
      ]),
    ].slice(0, 6);
  }, [p]);

  if (poster.error && !p)
    return (
      <main className="fp">
        <div className="pw-ground" />
        <div className="empty fp-empty">
          <Art name="binoculars" size={128} />
          <h3>No poster here.</h3>
          <p>The link might be old, or the act took this one down.</p>
          <a className="btn light" href="/">
            Go to Wanted
          </a>
        </div>
      </main>
    );
  if (!p)
    return (
      <main className="fp">
        <div className="pw-ground" />
        <div className="sk fp-skel" />
      </main>
    );

  const mine = mineNow?.claim ?? p.mine;
  const count = mineNow?.count ?? p.count;
  const first = p.artist.name.split(" ")[0];
  const where = other.trim() || hood;
  const proven = count >= PROOF;
  const ref =
    typeof location !== "undefined"
      ? new URLSearchParams(location.search).get("ref")
      : null;
  const invite =
    mine && typeof location !== "undefined"
      ? `${location.origin}/w/${p.artist.slug}/${p.city.id}?ref=${mine.refCode}`
      : "";

  const sign = async () => {
    if (!initials.trim())
      return setErr("Add your initials so the poster knows who signed.");
    setErr(null);
    setBusy(true);
    try {
      const r = await api.post<SignOut>(`${path}/sign`, {
        neighborhood: where,
        initials: initials.trim(),
        contact: contact.trim() || null,
        ref,
      });
      setMineNow(r);
      scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => mutate(path), 1200);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Network trouble. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    if (navigator.share)
      navigator
        .share({
          title: `WANTED in ${p.city.name}`,
          text: `Help bring ${p.artist.name} to ${p.city.name}. Sign the poster:`,
          url: invite,
        })
        .catch(() => {});
    else
      navigator.clipboard
        ?.writeText(invite)
        .then(() =>
          setErr("Link copied. Send it to two friends who’d show up."),
        );
  };

  return (
    <main className="fp">
      <div className="pw-ground" />

      <section className="fp-hero">
        <span className="kicker fp-where">
          {p.played
            ? "Caught live"
            : `Wanted in ${p.city.name}, ${p.city.state}`}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`fp-poster${mine ? " signed" : ""}`}
          src={`/img/poster/${p.artist.slug}/${p.city.id}?w=720&v=${count}`}
          alt={`WANTED poster for ${p.artist.name} in ${p.city.name}`}
        />
        <h1>{p.artist.name}</h1>
        <div className="fp-count">
          <b>
            <Reel value={count} />
          </b>
          <span>
            {proven
              ? `signed. ${p.city.name} proved it.`
              : `of ${PROOF} signed`}
          </span>
        </div>
        {!proven && (
          <div
            className="pw-meter fp-meter"
            role="img"
            aria-label={`${count} of ${PROOF} signed`}
          >
            {Array.from({ length: PROOF }, (_, i) => (
              <i
                key={i}
                className={i < count ? "on" : ""}
                style={{ ["--i" as string]: i }}
              />
            ))}
          </div>
        )}
        <p className="fp-pitch">
          {p.show
            ? `${p.show.room} is holding a date. Sign and you hear first.`
            : proven
              ? `Enough people signed for venues to take ${first} seriously. Sign and you hear first when there’s a date.`
              : `${PROOF - count} more and ${first}’s team asks venues here for a date. Everyone who signed hears first.`}
        </p>
      </section>

      {mine ? (
        <section className="fp-after">
          <div className="fp-rc-wrap">
            <div className="fp-receipt" aria-label="Your signature">
              <div className="fp-rc-h">
                <b>WANTED</b>
                <span>
                  {p.city.name}, {p.city.state}
                </span>
              </div>
              <div className="fp-rc-n">
                <span>Signature</span>
                <b>#{mine.number}</b>
              </div>
              <dl>
                <div>
                  <dt>Signed by</dt>
                  <dd>{mine.initials}</dd>
                </div>
                {mine.neighborhood && (
                  <div>
                    <dt>From</dt>
                    <dd>{mine.neighborhood}</dd>
                  </div>
                )}
                <div>
                  <dt>For</dt>
                  <dd>{p.artist.name}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>{stamp(mine.createdAt)}</dd>
                </div>
              </dl>
              <p className="fp-rc-foot">
                {mine.earlyAccess
                  ? "Brought 2 friends: first dibs on 4 tickets"
                  : "Bring 2 friends: first dibs on 4 tickets"}
              </p>
            </div>
          </div>
          <button className="btn hot block" onClick={share}>
            <Icon name="share" bold size={18} />
            Send it to two friends
          </button>
          {err && <p className="fp-note">{err}</p>}
          {p.dibs?.mine && <FirstDibs d={p.dibs} path={path} />}
          {p.bounty && !p.bounty.drawn && (
            <p className="fp-note">
              You’re in the draw. Once there’s a show, one signer here meets{" "}
              {first}.
            </p>
          )}
          {p.bounty?.drawn?.mineWon && (
            <p className="fp-note win">
              You won the draw. {first}’s team will be in touch.
            </p>
          )}
        </section>
      ) : (
        <section className="fp-form">
          <label className="fp-label" htmlFor="fp-in">
            Your initials
          </label>
          <div className="fp-field">
            <input
              id="fp-in"
              value={initials}
              onChange={(e) =>
                setInitials(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z.\s]/g, "")
                    .slice(0, 5),
                )
              }
              placeholder="C.D."
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="next"
            />
          </div>
          <span className="fp-label">Your neighbourhood</span>
          <div className="fp-hoods">
            {hoods.map((h) => (
              <button
                key={h}
                className={`fp-hood${hood === h && !other ? " on" : ""}`}
                aria-pressed={hood === h && !other}
                onClick={() => {
                  setOther("");
                  setHood(hood === h ? null : h);
                }}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="fp-field sm">
            <input
              value={other}
              onChange={(e) => setOther(e.target.value.slice(0, 60))}
              placeholder="Somewhere else"
              aria-label="Another neighbourhood"
            />
          </div>
          <details className="fp-more">
            <summary>Hear first when there’s a date</summary>
            <div className="fp-field sm">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email or phone"
                type="text"
                inputMode="email"
                autoComplete="email"
                aria-label="Email or phone, optional"
              />
            </div>
          </details>
          {err && <p className="fp-err">{err}</p>}
          <button
            className="btn hot block fp-sign"
            disabled={busy}
            onClick={sign}
          >
            {busy ? "Signing…" : `Sign for ${p.city.name}`}
          </button>
          <p className="fp-fine">
            Your initials and neighbourhood go on the poster. Anything else is
            encrypted and only used to tell you about this show.
          </p>
        </section>
      )}

      <a className="fp-brand" href="/">
        Made with Wanted
      </a>
    </main>
  );
}

const day = (iso: string) =>
  new Date(`${iso}T12:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/**
 * First dibs: the city got its show, and the people who asked for it get tickets first. Pick how
 * many, hold them, and the ticket link opens here for signers two days before everyone else.
 * Nothing is charged now; you pay when the link opens.
 */
function FirstDibs({
  d,
  path,
}: {
  d: NonNullable<PosterState["dibs"]>;
  path: string;
}) {
  const mine = d.mine!;
  const [want, setWant] = useState(mine.tickets || Math.min(2, mine.max));
  const [busy, setBusy] = useState(false);
  const held = mine.tickets > 0;
  const hold = async (n: number) => {
    setBusy(true);
    try {
      await api.post(`${path}/dibs`, { tickets: n });
      await mutate(path);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={`fp-dibs${held ? " held" : ""}`} aria-label="First dibs on tickets">
      <div className="fp-dibs-h">
        <span className="kicker">First dibs</span>
        <b>
          {d.room} · {day(d.date)}
        </b>
      </div>
      {held ? (
        <p className="fp-dibs-say">
          <b>
            {mine.tickets} {mine.tickets === 1 ? "ticket" : "tickets"} held for #{mine.number}.
          </b>{" "}
          The link opens right here on {day(d.signersOn)}, two days before everyone else. You pay
          then, not now.
        </p>
      ) : (
        <p className="fp-dibs-say">
          You asked for this show, so you get tickets first: on {day(d.signersOn)}, two days
          before the public sale.
          {d.holders > 0 && ` ${d.holders} ${d.holders === 1 ? "signer is" : "signers are"} holding ${d.tickets} ${d.tickets === 1 ? "ticket" : "tickets"}.`}
        </p>
      )}
      {!held && (
        <div className="seg" role="radiogroup" aria-label="How many tickets">
          {Array.from({ length: mine.max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={want === n}
              className={want === n ? "on" : ""}
              onClick={() => setWant(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {held ? (
        <button className="fp-dibs-change" disabled={busy} onClick={() => hold(0)}>
          {busy ? "Letting go…" : "Let them go"}
        </button>
      ) : (
        <button className="btn light block" disabled={busy} onClick={() => hold(want)}>
          {busy ? "Holding…" : `Hold ${want} ${want === 1 ? "ticket" : "tickets"}`}
        </button>
      )}
    </section>
  );
}
