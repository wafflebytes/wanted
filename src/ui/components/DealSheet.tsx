/**
 * Gus and a room's booking agent working out a date, live. The top shows who's talking and
 * what's on the table right now; below, the conversation: their letters like Messages, and
 * the tools Gus runs between them (reading signatures, checking the calendar and the artist's
 * limits, paying) as quiet one-line steps, so the artist can see what he did, not just what
 * he said.
 *
 * The conversation lives in the deals store, so closing this sheet only backgrounds it; the
 * capsule above the tab bar brings it back. Nothing is paid until the artist taps; test mode.
 */
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  GlassSheet,
  GlassSheetContent,
  GlassSheetTitle,
} from "@/components/glassyui/glass-sheet";
import type { Deal, DealLetter } from "@/lib/types";
import { useArtistSlug } from "../artist";
import { deals, useDeals } from "../deals/store";
import { Beam } from "../fx/Beam";
import { Roll } from "../fx/Roll";
import { useReducedMotion } from "../hooks";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/names";
import { enterUp } from "../motion";
import { C, F, S } from "../theme";
import { Btn } from "./core";
import { GusSticker } from "./Gus";
import { T } from "./T";

const nice = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const TOOL_ICON: Record<string, IconName> = {
  read_signatures: "signature",
  pick_room: "building",
  check_calendar: "calendar",
  check_limits: "shield",
  mint_pass: "key",
  pay: "card",
  draw_bounty: "star",
  fill_room: "ticket",
};

export function DealSheet() {
  const { deal, open, deciding, error } = useDeals();
  const reduced = useReducedMotion();
  const scroll = useRef<ScrollView>(null);
  // Steps already on screen when the sheet opened don't animate; new ones rise in.
  const base = useRef(0);
  useEffect(() => {
    if (open)
      base.current = deal?.status === "talking" ? deal.thread.length : Infinity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal?.id]);
  const n = deal?.thread.length ?? 0;
  useEffect(() => {
    if (open)
      setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduced }), 80);
  }, [open, n, deal?.status, reduced]);

  if (!deal) return null;
  const t = deal.terms;
  const live = deal.status === "talking";
  const where = [deal.neighborhood, deal.cityName].filter(Boolean).join(", ");
  const lastLetter = [...deal.thread]
    .reverse()
    .find((l) => l.kind === "letter");
  const next: DealLetter["from"] = lastLetter?.from === "gus" ? "house" : "gus";
  const steps = group(deal.thread);

  return (
    <GlassSheet open={open} onOpenChange={(o) => !o && deals.hide()}>
      <GlassSheetContent
        closeLabel={live ? "Keep it going in the background" : "Close"}
      >
        {/* Who's talking. */}
        <View style={{ gap: S.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(155,48,224,0.22)",
                alignItems: "center",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              <GusSticker
                size={40}
                mood={
                  deal.status === "held" ? "proud" : live ? "thinking" : "idle"
                }
              />
            </View>
            <Wire live={live} />
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 17,
                  color: C.text,
                }}
              >
                {deal.roomName.replace(/^The /, "").charAt(0)}
              </T>
            </View>
          </View>
          <View style={{ gap: 2 }}>
            <GlassSheetTitle>{deal.roomName}</GlassSheetTitle>
            <T v="footnote" color={C.text2}>
              {where}
            </T>
          </View>
        </View>

        {/* What's on the table, updating as offers move. Pinned, so it never scrolls away. */}
        {t ? (
          <View style={{ paddingTop: 14 }}>
            <Beam active={live} radius={18} variant="sunset">
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  borderCurve: "continuous",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  gap: 8,
                }}
              >
                <T
                  v="caption"
                  color={deal.status === "held" ? C.good : C.text3}
                  style={{ fontWeight: "600" }}
                >
                  {live
                    ? "On the table"
                    : deal.status === "held"
                      ? "Held"
                      : deal.status === "passed"
                        ? "You passed"
                        : "They agreed"}
                </T>
                <View style={{ flexDirection: "row" }}>
                  <Cell value={`${t.split}%`} label="of the door" />
                  <Cell value={`$${t.deposit}`} label="to hold it" divider />
                  <Cell
                    value={nice(t.date).replace(/^\w+, /, "")}
                    label={nice(t.date).split(",")[0]}
                    divider
                  />
                </View>
              </View>
            </Beam>
          </View>
        ) : null}

        <ScrollView
          ref={scroll}
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ gap: 14, paddingTop: 14, paddingBottom: 6 }}
        >
          <View style={{ gap: 8 }}>
            {steps.map((g, gi) =>
              g.kind === "tools" ? (
                <Animated.View
                  key={`t${g.at}`}
                  entering={g.at >= base.current ? enterUp(0, 6) : undefined}
                  style={{ gap: 7, paddingVertical: 2, paddingLeft: 4 }}
                >
                  {g.items.map((l, i) => (
                    <ToolRow key={i} l={l} />
                  ))}
                </Animated.View>
              ) : (
                <Letter
                  key={`l${g.at}`}
                  l={g.items[0]}
                  agent={`${deal.roomName}’s agent`}
                  named={
                    gi === 0 ||
                    steps[gi - 1].kind !== "letter" ||
                    steps[gi - 1].items[0].from !== g.items[0].from
                  }
                  fresh={g.at >= base.current}
                />
              ),
            )}
            {live ? (
              <Typing
                who={next === "gus" ? "Gus" : `${deal.roomName}’s agent`}
                mine={next === "gus"}
              />
            ) : null}
          </View>

          {error ? (
            <T v="footnote" color={C.warn}>
              {error}
            </T>
          ) : null}
          <View
            style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
          >
            <View style={{ marginTop: 2 }}>
              <Icon name="info" size={13} color={C.text3} />
            </View>
            <T v="caption" style={{ flex: 1 }}>
              {deal.roomName} doesn’t run a booking agent yet, so Wanted stands
              in with typical terms for a room its size. Test mode: no real
              money moves.
            </T>
          </View>
        </ScrollView>

        <Footer deal={deal} deciding={deciding} />
      </GlassSheetContent>
    </GlassSheet>
  );
}

function Footer({ deal, deciding }: { deal: Deal; deciding: boolean }) {
  const t = deal.terms;
  if (deal.status === "talking")
    return (
      <View style={{ paddingTop: 12, gap: 6 }}>
        <Btn
          tone="glass"
          size="lg"
          full
          onPress={deals.hide}
          icon={<Icon name="chevronDown" size={16} color={C.text} />}
        >
          Keep going in the background
        </Btn>
        <T v="caption" style={{ textAlign: "center" }}>
          Gus keeps talking while you look around.
        </T>
      </View>
    );
  if (deal.status === "waiting" && t)
    return (
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          paddingTop: 12,
        }}
      >
        <Btn
          tone="scout"
          size="lg"
          style={{ flex: 1 }}
          full
          busy={deciding}
          onPress={() => deals.decide(true)}
        >
          {t.deposit ? `Pay $${t.deposit} to hold it` : "Hold it"}
        </Btn>
        <Pressable
          onPress={() => deals.decide(false)}
          disabled={deciding}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 50,
            paddingHorizontal: 18,
            borderRadius: 25,
            backgroundColor: pressed
              ? "rgba(255,255,255,0.16)"
              : "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <T v="headline">Not now</T>
        </Pressable>
      </View>
    );
  return <DoneFooter deal={deal} />;
}

/** Once the date is held, the next thing is selling it: Gus's plan for filling the room. */
function DoneFooter({ deal }: { deal: Deal }) {
  const slug = useArtistSlug();
  const held = deal.status === "held" && !!slug;
  return (
    <View style={{ paddingTop: 12, gap: 8 }}>
      {held ? (
        <Btn
          tone="scout"
          size="lg"
          full
          icon={<Icon name="ticket" size={16} color={C.text} />}
          onPress={() => {
            deals.dismiss();
            router.push(`/a/${slug}/show?deal=${deal.id}`);
          }}
        >
          See how Gus fills the room
        </Btn>
      ) : null}
      <Btn tone="glass" size="lg" full onPress={deals.dismiss}>
        Done
      </Btn>
    </View>
  );
}

type Step = { kind: "tools" | "letter"; at: number; items: DealLetter[] };
/** Runs of tool steps collapse into one quiet block between letters. */
function group(thread: DealLetter[]): Step[] {
  const out: Step[] = [];
  thread.forEach((l, i) => {
    const prev = out[out.length - 1];
    if (l.kind === "tool" && prev?.kind === "tools") prev.items.push(l);
    else
      out.push({
        kind: l.kind === "tool" ? "tools" : "letter",
        at: i,
        items: [l],
      });
  });
  return out;
}

function ToolRow({ l }: { l: DealLetter }) {
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.07)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={TOOL_ICON[l.tool ?? ""] ?? "check"}
          size={11}
          color={l.tool === "pay" ? C.good : C.text2}
        />
      </View>
      <T v="footnote" color={C.text2} style={{ flex: 1 }} numberOfLines={2}>
        {l.text}
      </T>
    </View>
  );
}

function Letter({
  l,
  agent,
  named,
  fresh,
}: {
  l: DealLetter;
  agent: string;
  named: boolean;
  fresh: boolean;
}) {
  const mine = l.from === "gus";
  return (
    <Animated.View
      entering={fresh ? enterUp(0, 6) : undefined}
      style={{
        alignItems: mine ? "flex-end" : "flex-start",
        gap: 3,
        marginTop: named ? 4 : 0,
      }}
    >
      {named ? (
        <T v="caption" style={{ paddingHorizontal: 12 }}>
          {mine ? "Gus" : agent}
        </T>
      ) : null}
      <View
        style={{
          maxWidth: "86%",
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderRadius: 19,
          borderCurve: "continuous",
          backgroundColor: mine ? C.purple : "rgba(255,255,255,0.11)",
        }}
      >
        <T v="callout" style={{ lineHeight: 21 }}>
          {l.text}
        </T>
      </View>
    </Animated.View>
  );
}

/** Three dots on the side of whoever writes next, like Messages. */
function Typing({ who, mine }: { who: string; mine: boolean }) {
  return (
    <Animated.View
      entering={enterUp(0, 4)}
      style={{
        alignItems: mine ? "flex-end" : "flex-start",
        gap: 3,
        marginTop: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 19,
          backgroundColor: mine
            ? "rgba(155,48,224,0.35)"
            : "rgba(255,255,255,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} />
        ))}
      </View>
      <T v="caption" style={{ paddingHorizontal: 12 }}>
        {who} is writing
      </T>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0.35);
  useEffect(() => {
    if (reduced) return;
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, {
            duration: 380,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.text },
        s,
      ]}
    />
  );
}

/** The line between the two agents; a dot travels along it while they talk. */
function Wire({ live }: { live: boolean }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!live || reduced) return;
    x.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, reduced]);
  const dot = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 34 }],
  }));
  return (
    <View style={{ width: 40, height: 8, justifyContent: "center" }}>
      <View
        style={{
          height: 1,
          backgroundColor: live
            ? "rgba(255,255,255,0.25)"
            : "rgba(52,199,89,0.6)",
        }}
      />
      {live ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: C.purpleHi,
            },
            dot,
          ]}
        />
      ) : null}
    </View>
  );
}

function Cell({
  value,
  label,
  divider,
}: {
  value: string;
  label: string;
  divider?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        gap: 2,
        borderLeftWidth: divider ? 1 : 0,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <Roll
        text={value}
        align="center"
        style={{
          fontFamily: F.displayBold,
          fontSize: 22,
          lineHeight: 27,
          color: C.text,
          fontVariant: ["tabular-nums"],
        }}
      />
      <T v="caption">{label}</T>
    </View>
  );
}
