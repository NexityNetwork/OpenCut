/** Deck: "How to build a dashboard for your entire business" — rebuilt in the CTW brand. 6 slides.
 *  Clean editorial frames for a short: a live-dashboard mock, app-window cards, a
 *  Claude hub-and-spoke, real brand marks. Solid backgrounds, everything readable
 *  inside the safe band. No currency symbols (brand rule); labels carry the money. */
import React from 'react';
import { AHFrame, Disp, Script, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiStripe, SiGooglesheets, SiQuickbooks, SiMailchimp, SiCalendly, SiMeta, SiClaude } from '@icons-pack/react-simple-icons';
import { ArrowRight, ArrowDown, Check, TriangleAlert, FileText, FolderTree, Wand2 } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
const GREEN = '#3ECF8E';
const BLUE = '#4d8dff';

const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={23} color={AH_ORANGE}>{label}</Mono>;

const Callout: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ background: dark ? 'rgba(232,84,43,0.13)' : '#f4ddd2', borderRadius: 14, padding: '24px 28px', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, lineHeight: 1.34, color: dark ? '#f3efe6' : CI }}>{children}</div>
);

const Head: React.FC<{ kick: string; script?: string; lead: string; tail: string; sub?: string; dark: boolean }> = ({ kick, script, lead, tail, sub, dark }) => (
  <div>
    <Kick label={kick} />
    {script && <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: AH_ORANGE, marginTop: 12 }}>{script}</div>}
    <Disp size={84} style={{ marginTop: script ? 4 : 12 }}>{lead} <span style={ah.oi}>{tail}</span></Disp>
    {sub && <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 31, color: dark ? '#cfcabf' : '#3a3733', lineHeight: 1.36, marginTop: 16 }}>{sub}</div>}
  </div>
);

/* ── the live dashboard mock (cover + payoff) ──────────────────────────────*/
const Tile: React.FC<{ label: string; value: string; note: string; noteColor: string; accent: string }> = ({ label, value, note, noteColor, accent }) => (
  <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${accent}`, borderRadius: 12, padding: '16px 18px' }}>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(243,239,230,0.45)' }}>{label}</div>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 42, color: '#f6f4ef', lineHeight: 1, marginTop: 8 }}>{value}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 17, color: noteColor, marginTop: 8 }}>{note}</div>
  </div>
);

const DashMock: React.FC = () => (
  <div style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: 22, boxShadow: '0 30px 70px rgba(0,0,0,0.4)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
      <span style={{ marginLeft: 8, fontFamily: T.monoFont, fontSize: 18, color: '#8a8a92' }}>operator · live</span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.monoFont, fontSize: 16, color: GREEN }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />syncing</span>
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <Tile label="Revenue MTD" value="48.2k" note="▲ 12%" noteColor={GREEN} accent={AH_ORANGE} />
      <Tile label="New leads" value="137" note="▲ 8%" noteColor={GREEN} accent={GREEN} />
      <Tile label="Cash on hand" value="91k" note="healthy" noteColor={GREEN} accent={BLUE} />
      <Tile label="Churn" value="2.1%" note="▼ watch" noteColor={AH_ORANGE} accent={AH_ORANGE} />
    </div>
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.monoFont, fontSize: 15, color: 'rgba(243,239,230,0.5)' }}><span>REVENUE · 12 MO</span><span style={{ color: '#f6f4ef', fontWeight: 700 }}>48.2k</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 92, marginTop: 14 }}>
          {[34, 30, 40, 44, 38, 52, 56, 50, 64, 60, 72, 88].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i === 11 ? AH_ORANGE : 'rgba(255,255,255,0.14)' }} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontFamily: T.monoFont, fontSize: 15, color: 'rgba(243,239,230,0.5)' }}>LEADS PIPELINE</div>
        {[['Reyes Plumbing', 'HOT · 6.8k', AH_ORANGE], ['Northwind HVAC', 'WON · 4.2k', GREEN], ['Lakeside Dental', 'NEW · 2.1k', 'rgba(243,239,230,0.5)']].map(([n, t, c]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 19, color: '#e7e3da' }}>{n}</span>
            <span style={{ fontFamily: T.monoFont, fontSize: 14, color: c as string }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── app-window card (the "6 tabs" problem) ────────────────────────────────*/
type BrandIcon = React.ComponentType<{ size?: number; color?: string }>;
const AppCard: React.FC<{ Icon: BrandIcon; color: string; site: string; metric: string }> = ({ Icon, color, site, metric }) => (
  <div style={{ flex: 1, background: '#ffffff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 16px 38px rgba(20,16,12,0.10)', border: '1px solid rgba(20,16,12,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d7d3ca' }} />
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d7d3ca' }} />
      <span style={{ marginLeft: 6, fontFamily: T.monoFont, fontSize: 16, color: '#9a958c' }}>{site}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
      <Icon size={34} color={color} />
      <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em', color: CI }}>{metric}</span>
    </div>
    <div style={{ fontFamily: T.monoFont, fontSize: 15, color: '#b3aea4', marginTop: 12 }}>last opened 9 days ago</div>
  </div>
);

/* ── Claude hub + 6 spokes (how it connects) ───────────────────────────────*/
const SPOKES: { Icon: BrandIcon; color: string }[] = [
  { Icon: SiStripe, color: '#635BFF' },
  { Icon: SiGooglesheets, color: '#34A853' },
  { Icon: SiQuickbooks, color: '#2CA01C' },
  { Icon: SiMeta, color: '#0467DF' },
  { Icon: SiMailchimp, color: '#FFE01B' },
  { Icon: SiCalendly, color: '#006BFF' },
];
const HubSpoke: React.FC = () => {
  const W = 810, H = 540, cx = W / 2, cy = H / 2, rx = 300, ry = 210, chip = 96;
  const pts = SPOKES.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / SPOKES.length;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  return (
    <div style={{ position: 'relative', width: W, height: H, margin: '0 auto' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {pts.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(232,84,43,0.45)" strokeWidth={2} strokeDasharray="3 7" />
        ))}
      </svg>
      {pts.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.x - chip / 2, top: p.y - chip / 2 }}>
          <LogoBadge Icon={SPOKES[i].Icon} color={SPOKES[i].color} chip="#ffffff" box={chip} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: cx - 78, top: cy - 78, width: 156, height: 156, borderRadius: '50%', background: 'rgba(232,84,43,0.16)', border: `2px solid ${AH_ORANGE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SiClaude size={78} color={AH_ORANGE} />
      </div>
    </div>
  );
};

/* ── app-icon + label (payoff row) ─────────────────────────────────────────*/
const IconLabel: React.FC<{ Icon: BrandIcon; color: string; label: string }> = ({ Icon, color, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <LogoBadge Icon={Icon} color={color} chip="#ffffff" box={86} />
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 22, color: '#cfcabf' }}>{label}</span>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE DASHBOARD" />
      <Disp size={92} style={{ marginTop: 14 }}>how to build a dashboard for your <span style={ah.oi}>entire business.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 32, color: '#cfcabf', marginTop: 16 }}>every number that runs it, live, in one place.</div>
    </div>
    <DashMock />
  </AHFrame>,

  // 2 — the problem
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="THE PROBLEM" script="sound familiar?" lead="your business lives in" tail="six different tabs." sub="Stripe here, a spreadsheet there, the bank in another window. you see the whole picture once a month, if you are lucky." />
    <div style={{ display: 'flex', gap: 18 }}>
      <AppCard Icon={SiStripe} color="#635BFF" site="stripe.com" metric="48.2k" />
      <AppCard Icon={SiGooglesheets} color="#34A853" site="sheets" metric="137 leads" />
      <AppCard Icon={SiQuickbooks} color="#2CA01C" site="quickbooks" metric="91k cash" />
    </div>
    <div style={{ display: 'flex', gap: 18 }}>
      <AppCard Icon={SiMailchimp} color="#FFB81C" site="mailchimp" metric="2.1% churn" />
      <AppCard Icon={SiCalendly} color="#006BFF" site="calendly" metric="29 booked" />
      <AppCard Icon={SiMeta} color="#0467DF" site="meta ads" metric="6.4k spend" />
    </div>
  </AHFrame>,

  // 3 — what's on it
  <AHFrame variant="dark" justify="center">
    <Head dark kick="WHAT IS ON IT" script="all of it, live." lead="one software, one place" tail="to view everything." />
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${GREEN}`, borderRadius: 16, padding: '24px 26px' }}>
        <Mono size={18} color={GREEN}>REVENUE</Mono>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 64, color: '#f6f4ef', lineHeight: 1, marginTop: 10 }}>48.2k</div>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 22, color: GREEN, marginTop: 8 }}>▲ 12% vs last month</div>
      </div>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${AH_ORANGE}`, borderRadius: 16, padding: '24px 26px' }}>
        <Mono size={18} color={AH_ORANGE}>LEADS PIPELINE</Mono>
        {[['Reyes Plumbing', '6.8k', AH_ORANGE], ['Lakeside Dental', '2.1k', '#cfcabf'], ['Northwind HVAC', 'WON', GREEN]].map(([n, v, c]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontFamily: T.bodyFont, fontWeight: 700, fontSize: 22 }}>
            <span style={{ color: '#e7e3da' }}>{n}</span><span style={{ color: c as string }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${BLUE}`, borderRadius: 16, padding: '24px 26px' }}>
        <Mono size={18} color={BLUE}>TODAY'S TASKS</Mono>
        {[['Send Reyes proposal', true], ['Reconcile Stripe payouts', true], ['Follow up: 3 cold leads', false]].map(([t, done]) => (
          <div key={t as string} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, fontFamily: T.bodyFont, fontWeight: 600, fontSize: 21, color: done ? '#e7e3da' : 'rgba(231,227,218,0.5)' }}>
            {done ? <Check size={20} color={GREEN} /> : <span style={{ width: 18, height: 18, border: '2px solid rgba(231,227,218,0.4)', borderRadius: 5 }} />}{t}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${AH_ORANGE}`, borderRadius: 16, padding: '24px 26px' }}>
        <Mono size={18} color={AH_ORANGE}>ALERTS</Mono>
        {[['Churn ticked up to 2.1%', AH_ORANGE], ['Ad ROAS hit 3.1x today', GREEN], ['2 invoices overdue · 3.4k', '#e7e3da']].map(([t, c]) => (
          <div key={t as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontFamily: T.bodyFont, fontWeight: 600, fontSize: 21, color: '#e7e3da' }}>
            <TriangleAlert size={18} color={c as string} />{t}
          </div>
        ))}
      </div>
    </div>
  </AHFrame>,

  // 4 — how it connects
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="HOW IT CONNECTS" script="plug them in." lead="Claude sits at the" tail="center of your stack." />
    <HubSpoke />
    <div style={{ textAlign: 'center', fontFamily: T.monoFont, fontWeight: 600, fontSize: 24, letterSpacing: '0.04em', color: '#8a857c' }}>read only · one prompt · refreshes every morning</div>
  </AHFrame>,

  // 5 — the payoff
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE PAYOFF" />
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 36, color: AH_ORANGE, marginTop: 10 }}>same business.</div>
      <Disp size={80} style={{ marginTop: 4 }}>six tabs, <span style={ah.oi}>one dashboard.</span></Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
      <IconLabel Icon={SiStripe} color="#635BFF" label="Stripe" />
      <IconLabel Icon={SiGooglesheets} color="#34A853" label="Sheets" />
      <IconLabel Icon={SiQuickbooks} color="#2CA01C" label="Books" />
      <IconLabel Icon={SiCalendly} color="#006BFF" label="Calendly" />
      <IconLabel Icon={SiMailchimp} color="#FFB81C" label="Mailchimp" />
      <IconLabel Icon={SiMeta} color="#0467DF" label="Meta" />
    </div>
    <div style={{ display: 'flex', justifyContent: 'center' }}><IconBadge Icon={ArrowDown} dark box={56} /></div>
    <DashMock />
    <div style={{ textAlign: 'center', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 28, color: '#cfcabf', lineHeight: 1.32 }}>checked daily, not monthly. decisions on facts, not a hunch.</div>
  </AHFrame>,

  // 6 — CTA
  <AHFrame variant="cream" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}>comment <span style={ah.oi}>dash</span></Disp>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 44, color: CI, marginTop: 6 }}>and I will send you the build.</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="DASH" /></div>
    <div style={{ background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '28px 30px', boxShadow: '0 16px 38px rgba(20,16,12,0.08)', marginTop: 14 }}>
      <Mono size={19} color={AH_ORANGE}>THE DASHBOARD BUILD KIT</Mono>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[[FileText, 'the exact prompt that builds your dashboard'], [Wand2, 'a CLAUDE.md that teaches it your business'], [FolderTree, 'a data folder layout so it pulls the right numbers']].map(([Ic, t], i) => {
          const Ico = Ic as BrandIcon;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <IconBadge Icon={Ico as any} box={52} />
              <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 27, color: '#3a3733', lineHeight: 1.3 }}>{t as string}</span>
            </div>
          );
        })}
      </div>
    </div>
  </AHFrame>,
];

export const dashboardBuildDeck = { id: 'DashboardBuild', title: 'How to build a dashboard for your entire business', slides };
