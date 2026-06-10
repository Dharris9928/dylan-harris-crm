import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: display } = loadSpaceGrotesk();
const { fontFamily: mono } = loadJetBrains();
const { fontFamily: body } = loadInter();

const EMERALD = "#10B981";
const EMERALD_DEEP = "#065F46";
const GOLD = "#FCD34D";
const INK = "#0B1320";
const PAPER = "#F4F1EA";
const MUTED = "#94A3B8";

// ---------- Persistent background ----------
const Bg: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 120) * 40;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(252,211,77,0.10), transparent 60%)",
          transform: `translateY(${drift}px)`,
        }}
      />
      {/* grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Utilities ----------
const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  return s;
};

const Chip: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const s = useEnter(delay);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
        fontFamily: mono,
        fontSize: 18,
        letterSpacing: 3,
        color: GOLD,
        textTransform: "uppercase",
        padding: "8px 16px",
        border: `1px solid ${GOLD}55`,
        borderRadius: 999,
        display: "inline-block",
      }}
    >
      {children}
    </div>
  );
};

// ---------- Scene 1: Title ----------
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleClip = interpolate(frame, [10, 50], [100, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subS = spring({ frame: frame - 35, fps, config: { damping: 20 } });
  const tagS = spring({ frame: frame - 55, fps, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
      <Chip delay={0}>Portfolio Walkthrough · 2026</Chip>
      <div
        style={{
          marginTop: 40,
          fontFamily: display,
          fontWeight: 700,
          color: PAPER,
          fontSize: 200,
          lineHeight: 0.95,
          letterSpacing: -6,
          clipPath: `inset(0 ${titleClip}% 0 0)`,
        }}
      >
        NestPro
        <br />
        <span style={{ color: EMERALD }}>CRM.</span>
      </div>
      <div
        style={{
          marginTop: 40,
          opacity: subS,
          transform: `translateY(${interpolate(subS, [0, 1], [16, 0])}px)`,
          fontFamily: body,
          fontSize: 32,
          color: MUTED,
          maxWidth: 1100,
          lineHeight: 1.35,
        }}
      >
        A vertical CRM for the Google Nest Pro channel — built for builders,
        contractors, and the channel managers who sell to them.
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 120,
          opacity: tagS,
          fontFamily: mono,
          fontSize: 18,
          color: MUTED,
          letterSpacing: 2,
        }}
      >
        ── 00 · INTRO
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 2: The Problem ----------
const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    "Permit data lives in 50 county portals.",
    "Lead scoring is a gut feeling.",
    "Channel managers re-key Apollo into spreadsheets.",
    "Decks get built in PowerPoint at 11 PM.",
  ];
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
      <Chip>01 · The Problem</Chip>
      <div
        style={{
          marginTop: 60,
          fontFamily: display,
          fontWeight: 600,
          color: PAPER,
          fontSize: 92,
          lineHeight: 1.05,
          letterSpacing: -3,
        }}
      >
        Horizontal CRMs <br />
        <span style={{ color: GOLD, fontStyle: "italic" }}>don't get it.</span>
      </div>
      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 18 }}>
        {lines.map((l, i) => {
          const s = spring({
            frame: frame - 30 - i * 12,
            fps: 30,
            config: { damping: 20 },
          });
          return (
            <div
              key={i}
              style={{
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                fontFamily: body,
                fontSize: 36,
                color: PAPER,
                display: "flex",
                gap: 24,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 99,
                  background: EMERALD,
                  display: "inline-block",
                }}
              />
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 3: Modules ----------
const modules = [
  { k: "Companies", v: "Builders & GCs", tag: "P1–P4 priority tiers" },
  { k: "Contacts", v: "Decision makers", tag: "Apollo-enriched" },
  { k: "Opportunities", v: "Nest deals", tag: "Weighted pipeline" },
  { k: "Permits", v: "Live discovery", tag: "AI-searched" },
  { k: "Activities", v: "Touchpoints", tag: "Auto-logged" },
  { k: "Pipeline", v: "Analytics", tag: "Perspective-filtered" },
];

const SceneModules: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <Chip>02 · The System</Chip>
      <div
        style={{
          marginTop: 30,
          fontFamily: display,
          fontWeight: 600,
          color: PAPER,
          fontSize: 88,
          letterSpacing: -3,
          lineHeight: 1,
        }}
      >
        Six modules. <span style={{ color: EMERALD }}>One pipeline.</span>
      </div>
      <div
        style={{
          marginTop: 60,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
        }}
      >
        {modules.map((m, i) => {
          const s = spring({
            frame: frame - 20 - i * 6,
            fps: 30,
            config: { damping: 22, stiffness: 150 },
          });
          return (
            <div
              key={m.k}
              style={{
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})`,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 18,
                padding: 36,
                minHeight: 220,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  color: GOLD,
                  letterSpacing: 2,
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: display,
                  fontWeight: 600,
                  color: PAPER,
                  fontSize: 44,
                  letterSpacing: -1,
                }}
              >
                {m.k}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: body,
                  fontSize: 22,
                  color: MUTED,
                }}
              >
                {m.v}
              </div>
              <div
                style={{
                  marginTop: 24,
                  fontFamily: mono,
                  fontSize: 16,
                  color: EMERALD,
                }}
              >
                → {m.tag}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 4: AI Features ----------
const aiFeatures = [
  { h: "AI Lead Scoring", b: "Ranks contacts by Nest-buy intent using firmographics + permit signal." },
  { h: "Permit Discovery", b: "Natural-language search over municipal building permits." },
  { h: "AI Presentations", b: "Generates branded Google-Nest decks per opportunity in seconds." },
  { h: "AI Outreach", b: "Drafts emails tuned to builder vs. contractor vs. GC personas." },
];

const SceneAI: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <Chip>03 · The AI Layer</Chip>
      <div
        style={{
          marginTop: 30,
          fontFamily: display,
          fontWeight: 600,
          color: PAPER,
          fontSize: 88,
          letterSpacing: -3,
          lineHeight: 1,
        }}
      >
        AI in the workflow, <span style={{ color: GOLD, fontStyle: "italic" }}>not bolted on.</span>
      </div>
      <div
        style={{
          marginTop: 60,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {aiFeatures.map((f, i) => {
          const s = spring({
            frame: frame - 25 - i * 10,
            fps: 30,
            config: { damping: 20 },
          });
          return (
            <div
              key={f.h}
              style={{
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                padding: "32px 36px",
                borderLeft: `4px solid ${EMERALD}`,
                background: "rgba(16,185,129,0.06)",
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 600,
                  color: PAPER,
                  fontSize: 40,
                  letterSpacing: -1,
                }}
              >
                {f.h}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: body,
                  fontSize: 22,
                  color: MUTED,
                  lineHeight: 1.4,
                }}
              >
                {f.b}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 50,
          fontFamily: mono,
          fontSize: 18,
          color: MUTED,
          letterSpacing: 2,
        }}
      >
        Every call is quota-metered → free tier · pro · business · enterprise
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 5: Tech Stack ----------
const stack = [
  ["Frontend", "React 19 · TanStack Start v1 · Vite 7 · Tailwind v4"],
  ["Backend", "Lovable Cloud · Postgres · RLS · Edge runtime"],
  ["AI", "Lovable AI Gateway · Gemini 2.5 · structured server fns"],
  ["Auth", "Row-level security · role table · approvals + audit log"],
];

const SceneStack: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
      <Chip>04 · Under the Hood</Chip>
      <div
        style={{
          marginTop: 40,
          fontFamily: display,
          fontWeight: 600,
          color: PAPER,
          fontSize: 84,
          letterSpacing: -3,
        }}
      >
        Production-grade <span style={{ color: EMERALD }}>by default.</span>
      </div>
      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 22 }}>
        {stack.map(([k, v], i) => {
          const s = spring({
            frame: frame - 25 - i * 8,
            fps: 30,
            config: { damping: 22 },
          });
          return (
            <div
              key={k}
              style={{
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 40,
                paddingBottom: 18,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 20,
                  color: GOLD,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                {k}
              </div>
              <div style={{ fontFamily: body, fontSize: 30, color: PAPER }}>{v}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 6: Outro ----------
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame, fps: 30, config: { damping: 20 } });
  const s2 = spring({ frame: frame - 20, fps: 30, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity: s,
          transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          fontFamily: display,
          fontWeight: 700,
          color: PAPER,
          fontSize: 180,
          letterSpacing: -6,
          textAlign: "center",
          lineHeight: 0.95,
        }}
      >
        Built end-to-end.
        <br />
        <span style={{ color: EMERALD }}>Ready to demo.</span>
      </div>
      <div
        style={{
          marginTop: 50,
          opacity: s2,
          fontFamily: mono,
          fontSize: 22,
          color: MUTED,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        NestPro CRM  ·  Portfolio  ·  2026
      </div>
    </AbsoluteFill>
  );
};

// ---------- Main ----------
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Bg />
      <Sequence from={0} durationInFrames={130}>
        <SceneTitle />
      </Sequence>
      <Sequence from={130} durationInFrames={150}>
        <SceneProblem />
      </Sequence>
      <Sequence from={280} durationInFrames={180}>
        <SceneModules />
      </Sequence>
      <Sequence from={460} durationInFrames={180}>
        <SceneAI />
      </Sequence>
      <Sequence from={640} durationInFrames={140}>
        <SceneStack />
      </Sequence>
      <Sequence from={780} durationInFrames={90}>
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
