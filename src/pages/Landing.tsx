import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const STYLES = `
.lp{--gold:#f3c24f;--green:#22e0a0;--maxw:1180px;
  background:var(--base);color:var(--text);
  font-family:'DM Sans',system-ui,sans-serif;
  line-height:1.6;letter-spacing:-0.011em;
  -webkit-font-smoothing:antialiased;overflow-x:hidden}
.lp *{box-sizing:border-box}
.lp h1,.lp h2,.lp h3{font-family:'Space Grotesk',sans-serif;letter-spacing:-0.02em;line-height:1.1}
.lp a{color:inherit;text-decoration:none}
.lp .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
.lp .accent{color:var(--brand)}
.lp .lp-cyan{color:var(--brand-cyan)}
.lp .lp-gold{color:var(--gold)}
.lp .lp-green{color:var(--green)}

.lp .halo{position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    radial-gradient(900px 500px at 80% -8%,rgba(61,139,255,0.16),transparent 60%),
    radial-gradient(700px 460px at 0% 8%,rgba(0,212,255,0.10),transparent 55%),
    radial-gradient(800px 600px at 50% 120%,rgba(61,139,255,0.07),transparent 60%)}

.lp nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);
  background:rgba(7,12,26,0.72);border-bottom:1px solid rgba(125,165,255,0.12)}
.lp .navin{display:flex;align-items:center;justify-content:space-between;height:68px}
.lp .lp-brand{display:flex;align-items:center;gap:12px;font-family:'Space Grotesk';font-weight:600;cursor:pointer}
.lp .lp-brand b{font-size:15px;font-weight:700;line-height:1;color:var(--text)}
.lp .lp-brand span{font-size:10.5px;color:var(--text-dim);letter-spacing:.06em;display:block}

.lp .lp-btn{display:inline-flex;align-items:center;gap:8px;font-family:'Space Grotesk';font-weight:600;
  border-radius:12px;padding:12px 22px;font-size:14.5px;cursor:pointer;border:none;transition:.2s;white-space:nowrap}
.lp .lp-btn-primary{background:linear-gradient(150deg,#3d8bff,#1f5fe0);color:#fff;
  box-shadow:0 8px 24px rgba(61,139,255,.4),inset 0 1px 1px rgba(255,255,255,.4)}
.lp .lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(61,139,255,.55)}
.lp .lp-btn-ghost{background:rgba(125,165,255,.08);color:var(--text);border:1px solid rgba(125,165,255,0.12)}
.lp .lp-btn-ghost:hover{background:rgba(125,165,255,.16)}

.lp header{padding:88px 0 60px}
.lp .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;color:#00d4ff;font-weight:600;
  letter-spacing:.12em;text-transform:uppercase;background:rgba(0,212,255,.08);
  border:1px solid rgba(0,212,255,.22);padding:7px 14px;border-radius:100px;margin-bottom:26px}
.lp .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:#00d4ff;box-shadow:0 0 10px #00d4ff;flex-shrink:0}
.lp h1.hero{font-size:clamp(36px,5.6vw,62px);font-weight:700;max-width:15ch}
.lp h1.hero em{font-style:normal;background:linear-gradient(120deg,#3d8bff,#00d4ff);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lp .lede{font-size:clamp(17px,2.1vw,20px);color:var(--text-muted);max-width:54ch;margin:26px 0 36px}
.lp .cta-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.lp .microcopy{font-size:13px;color:var(--text-faint);margin-top:18px}
.lp .herogrid{display:grid;grid-template-columns:1.02fr .98fr;gap:54px;align-items:center}
@media(max-width:920px){.lp .herogrid{grid-template-columns:1fr;gap:40px}}

.lp .lp-glass{background:linear-gradient(180deg,rgba(20,32,60,.6),rgba(9,14,30,.6));
  border:1px solid rgba(125,165,255,0.12);backdrop-filter:blur(20px)}
.lp .mock{border-radius:22px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.lp .mock.tilt{transform:perspective(1500px) rotateY(-7deg) rotateX(3deg)}
.lp .mhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.lp .mtitle{font-family:'Space Grotesk';font-weight:600;font-size:14px;color:var(--text)}
.lp .mtitle span{display:block;font-size:11px;color:var(--text-dim);font-weight:400}
.lp .kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.lp .kpi{background:rgba(10,16,32,.7);border:1px solid rgba(125,165,255,0.12);border-radius:13px;padding:12px}
.lp .kpi .lab{font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.08em}
.lp .kpi .val{font-family:'Space Grotesk';font-weight:700;font-size:21px;margin-top:5px;color:var(--text)}
.lp .kpi .sub{font-size:9.5px;color:var(--text-faint);margin-top:2px}
.lp .bars{display:flex;align-items:flex-end;gap:8px;height:90px;padding:12px;
  background:rgba(10,16,32,.7);border:1px solid rgba(125,165,255,0.12);border-radius:13px}
.lp .bar{flex:1;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#3d8bff,#1f5fe0)}
.lp .bar.c{background:linear-gradient(180deg,#00d4ff,#0090c0)}

.lp .trust{border-top:1px solid rgba(125,165,255,0.12);border-bottom:1px solid rgba(125,165,255,0.12);padding:30px 0;margin-top:60px}
.lp .trustgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center}
@media(max-width:760px){.lp .trustgrid{grid-template-columns:1fr 1fr;gap:28px}}
.lp .stat .n{font-family:'Space Grotesk';font-weight:700;font-size:clamp(26px,3.6vw,38px);
  background:linear-gradient(120deg,#fff,#3d8bff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lp .stat .l{font-size:13px;color:var(--text-muted);margin-top:4px}

.lp section{padding:84px 0}
.lp .sectlead{max-width:62ch;margin-bottom:50px}
.lp .sectlead.center{margin-left:auto;margin-right:auto;text-align:center}
.lp .sectlead .tag{font-size:12px;color:#3d8bff;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.lp .sectlead h2{font-size:clamp(27px,4vw,42px);font-weight:700;margin:14px 0;color:var(--text)}
.lp .sectlead p{color:var(--text-muted);font-size:17px}
.lp .sectlead.center p{margin:0 auto}

.lp .show{display:grid;grid-template-columns:1fr 1fr;gap:54px;align-items:center;margin-bottom:64px}
.lp .show.rev .showtext{order:2}
@media(max-width:880px){.lp .show{grid-template-columns:1fr;gap:32px}.lp .show.rev .showtext{order:0}}
.lp .showtext .pill{display:inline-block;font-size:12px;font-weight:600;color:#00d4ff;
  background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);padding:5px 12px;border-radius:100px;margin-bottom:16px}
.lp .showtext h3{font-size:clamp(22px,3vw,30px);font-weight:700;margin-bottom:14px;color:var(--text)}
.lp .showtext p{color:var(--text-muted);font-size:16px;margin-bottom:18px}
.lp .showtext ul{list-style:none;display:flex;flex-direction:column;gap:10px;padding:0}
.lp .showtext li{font-size:14.5px;color:var(--text-muted);display:flex;gap:10px}
.lp .showtext li::before{content:"→";color:#3d8bff;font-weight:700;flex-shrink:0}

.lp .cap{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lp .dropz{border:1.5px dashed rgba(61,139,255,.4);border-radius:14px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:10px;padding:24px 12px;background:rgba(61,139,255,.04);text-align:center}
.lp .dropz .cam{width:46px;height:46px;border-radius:50%;background:rgba(61,139,255,.15);display:grid;place-items:center;font-size:20px}
.lp .dropz b{font-size:12.5px;color:var(--text)}
.lp .dropz small{font-size:10px;color:var(--text-dim)}
.lp .extr{background:rgba(10,16,32,.7);border:1px solid rgba(125,165,255,0.12);border-radius:14px;padding:14px}
.lp .extr .et{font-size:11px;color:#00d4ff;font-weight:600;margin-bottom:10px;display:flex;gap:6px;align-items:center}
.lp .field{margin-bottom:8px}
.lp .field .fl{font-size:8.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em}
.lp .field .fv{background:rgba(7,12,26,.8);border:1px solid rgba(125,165,255,0.12);border-radius:7px;
  padding:6px 9px;font-size:11.5px;margin-top:3px;font-weight:600;color:var(--text)}

.lp .alerts-list{display:flex;flex-direction:column;gap:9px}
.lp .al-item{display:flex;gap:11px;align-items:flex-start;background:rgba(10,16,32,.7);
  border:1px solid rgba(125,165,255,0.12);border-radius:12px;padding:12px 13px}
.lp .al-icon{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:14px;flex-shrink:0}
.lp .al-item b{font-size:12.5px;display:block;color:var(--text)}
.lp .al-item small{font-size:11px;color:var(--text-dim)}
.lp .al-icon.dng{background:rgba(255,77,109,.14);color:#ff4d6d}
.lp .al-icon.wrn{background:rgba(243,194,79,.14);color:#f3c24f}
.lp .al-icon.ok{background:rgba(34,224,160,.14);color:#22e0a0}

.lp .chat-list{display:flex;flex-direction:column;gap:10px}
.lp .msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:12.5px;line-height:1.5}
.lp .msg.ai-msg{background:rgba(10,16,32,.8);border:1px solid rgba(125,165,255,0.12);align-self:flex-start;
  border-bottom-left-radius:4px;color:var(--text)}
.lp .msg.me{background:linear-gradient(150deg,#3d8bff,#1f5fe0);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.lp .chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:6px}
.lp .chip{font-size:10.5px;color:var(--text-muted);border:1px solid rgba(125,165,255,0.12);
  border-radius:100px;padding:5px 11px;background:rgba(125,165,255,.05)}

.lp .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px}
@media(max-width:920px){.lp .feats{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.lp .feats{grid-template-columns:1fr}}
.lp .feat{padding:24px;border-radius:16px}
.lp .feat .ic{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;font-size:20px;
  background:rgba(61,139,255,.12);border:1px solid rgba(61,139,255,.25);margin-bottom:14px}
.lp .feat h3{font-size:16.5px;font-weight:600;margin-bottom:7px;color:var(--text)}
.lp .feat p{color:var(--text-muted);font-size:14px}

.lp .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
@media(max-width:820px){.lp .steps{grid-template-columns:1fr;gap:20px}}
.lp .step .num{font-family:'Space Grotesk';font-weight:700;font-size:15px;color:#070c1a;
  width:34px;height:34px;border-radius:10px;display:grid;place-items:center;
  background:linear-gradient(150deg,#00d4ff,#3d8bff);margin-bottom:15px}
.lp .step h3{font-size:17px;font-weight:600;margin-bottom:7px;color:var(--text)}
.lp .step p{color:var(--text-muted);font-size:14.5px}

.lp .pricegrid{display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:760px;margin:0 auto}
@media(max-width:680px){.lp .pricegrid{grid-template-columns:1fr}}
.lp .price{padding:34px;border-radius:20px;position:relative}
.lp .price.pop{border-color:rgba(61,139,255,.5)!important;
  box-shadow:0 0 0 1px rgba(61,139,255,.3),0 20px 50px rgba(61,139,255,.18)}
.lp .price .ptag{position:absolute;top:-12px;right:24px;
  background:linear-gradient(150deg,#3d8bff,#1f5fe0);color:#fff;font-size:11px;
  font-weight:700;padding:5px 13px;border-radius:100px;font-family:'Space Grotesk'}
.lp .price .pname{font-family:'Space Grotesk';font-weight:600;font-size:14px;color:#00d4ff;
  text-transform:uppercase;letter-spacing:.08em}
.lp .price .amt{font-family:'Space Grotesk';font-weight:700;font-size:44px;margin:14px 0 2px;color:var(--text)}
.lp .price .amt small{font-size:16px;color:var(--text-dim);font-weight:400}
.lp .price ul{list-style:none;margin:22px 0;display:flex;flex-direction:column;gap:11px;padding:0}
.lp .price li{font-size:14px;color:var(--text-muted);display:flex;gap:10px}
.lp .price li::before{content:"✓";color:#22e0a0;font-weight:700;flex-shrink:0}
.lp .price .lp-btn{width:100%;justify-content:center}

.lp .finalcta{background:linear-gradient(150deg,rgba(61,139,255,.14),rgba(0,212,255,.08));
  border:1px solid rgba(61,139,255,.3);border-radius:26px;padding:58px 40px;
  text-align:center;box-shadow:0 30px 80px rgba(61,139,255,.15)}
.lp .finalcta h2{font-size:clamp(27px,4.4vw,44px);font-weight:700;max-width:20ch;
  margin:0 auto 18px;color:var(--text)}
.lp .finalcta p{color:var(--text-muted);font-size:18px;max-width:48ch;margin:0 auto 30px}

.lp footer{border-top:1px solid rgba(125,165,255,0.12);padding:38px 0;
  color:var(--text-faint);font-size:13.5px}
.lp .footin{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;align-items:center}

.lp .l-reveal{opacity:0;transform:translateY(26px);transition:.7s cubic-bezier(.2,.7,.3,1)}
.lp .l-reveal.l-in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){
  .lp .l-reveal{opacity:1;transform:none;transition:none}
  .lp .mock.tilt{transform:none}}

/* ── extra vars for mockups ── */
.lp{--violet:#a855f7;--danger:#ff4d6d;--cyan:#00d4ff;--dim:#7c8896;--muted:#9fb0c0;--faint:#5f6b7a}

/* ── window frame ── */
.lp .lp-win{width:min(1100px,100%);border-radius:18px;overflow:hidden;border:1px solid rgba(125,165,255,.12);
  box-shadow:0 40px 90px rgba(0,0,0,.55);
  background:radial-gradient(900px 500px at 85% -10%,rgba(61,139,255,.10),transparent 60%),
    radial-gradient(700px 460px at -5% 110%,rgba(0,212,255,.06),transparent 55%),#070c1a}
.lp .lp-wbar{display:flex;align-items:center;gap:7px;padding:11px 15px;
  background:rgba(10,16,32,.8);border-bottom:1px solid rgba(125,165,255,.12)}
.lp .wdot{width:11px;height:11px;border-radius:50%;flex-shrink:0;display:inline-block}
.lp .d1{background:#ff5f57}.lp .d2{background:#febc2e}.lp .d3{background:#28c840}
.lp .lp-wurl{margin-left:12px;font-size:11.5px;color:#7c8896;background:rgba(7,12,26,.7);
  padding:4px 12px;border-radius:7px;border:1px solid rgba(125,165,255,.12)}
.lp .lp-wapp{display:grid;grid-template-columns:208px 1fr}
.lp .lp-wside{border-right:1px solid rgba(125,165,255,.12);padding:16px 12px;
  display:flex;flex-direction:column;gap:14px;min-height:560px;background:rgba(9,14,30,.4)}
.lp .lp-wlogo{display:flex;align-items:center;gap:9px}
.lp .lp-whealth{background:linear-gradient(180deg,rgba(20,32,60,.55),rgba(9,14,30,.55));
  border:1px solid rgba(125,165,255,.12);border-radius:13px;padding:13px}
.lp .lp-whealth .hl{font-size:8.5px;color:#7c8896;letter-spacing:.08em;text-transform:uppercase}
.lp .lp-whealth .hv{font-family:'Space Grotesk';font-weight:700;font-size:26px;color:#00d4ff;margin:3px 0 1px}
.lp .lp-whealth .hv small{font-size:11px;color:#7c8896}
.lp .lp-wtrack{height:5px;border-radius:5px;background:rgba(125,165,255,.12);margin:7px 0 5px;overflow:hidden}
.lp .lp-wtrack span{display:block;height:100%;width:92%;background:linear-gradient(90deg,#3d8bff,#00d4ff)}
.lp .lp-whealth .hs{font-size:9px;color:#22e0a0}
.lp .lp-whealth .hs b{color:#9fb0c0;font-weight:400;display:block;margin-top:2px}
.lp .lp-wnav{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.lp .lp-wnav a{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;
  font-size:12.5px;color:#9fb0c0;cursor:default;text-decoration:none}
.lp .lp-wnav a.on{background:rgba(61,139,255,.12);border:1px solid rgba(61,139,255,.3);color:#fff;font-weight:600}
.lp .lp-wnav a .ni{width:15px;text-align:center;opacity:.85;flex-shrink:0}
.lp .lp-wfoot{margin-top:auto;display:flex;align-items:center;gap:8px;padding:9px;
  border:1px solid rgba(125,165,255,.12);border-radius:11px}
.lp .lp-wfoot .fav{width:26px;height:26px;border-radius:8px;background:rgba(61,139,255,.18);
  display:grid;place-items:center;font-size:12px}
.lp .lp-wfoot small{font-size:10.5px;color:var(--text)}
.lp .lp-wfoot small b{display:block;color:#7c8896;font-weight:400;font-size:9px}
.lp .lp-wmain{padding:22px 24px;flex:1;min-width:0}
.lp .lp-wphead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;gap:12px}
.lp .lp-wphead h2{font-size:21px;font-weight:700;color:var(--text)}
.lp .lp-wphead .sub{font-size:12px;color:#7c8896;margin-top:3px}
.lp .lp-wscan{font-family:'Space Grotesk';font-weight:600;font-size:12px;color:#fff;
  background:linear-gradient(150deg,#3d8bff,#1f5fe0);border-radius:10px;padding:9px 15px;
  box-shadow:0 6px 18px rgba(61,139,255,.4);white-space:nowrap;flex-shrink:0}
.lp .lp-row{display:grid;gap:13px;margin-bottom:13px}
.lp .lp-r4{grid-template-columns:repeat(4,1fr)}
.lp .lp-r2{grid-template-columns:1fr 1fr}
.lp .lp-r32{grid-template-columns:1.4fr 1fr}
.lp .lp-card{background:linear-gradient(180deg,rgba(20,32,60,.5),rgba(9,14,30,.5));
  border:1px solid rgba(125,165,255,.12);border-radius:15px;padding:15px}
.lp .lp-kpi .kl{font-size:9px;color:#7c8896;text-transform:uppercase;letter-spacing:.07em}
.lp .lp-kpi .kv{font-family:'Space Grotesk';font-weight:700;font-size:25px;margin:6px 0 2px}
.lp .lp-kpi .ks{font-size:9.5px;color:#5f6b7a}
.lp .lp-ct{font-family:'Space Grotesk';font-weight:600;font-size:13px;margin-bottom:3px;color:var(--text)}
.lp .lp-cs{font-size:10px;color:#7c8896;margin-bottom:12px}
.lp .lp-cbars{display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:8px}
.lp .lp-bg{flex:1;display:flex;gap:3px;align-items:flex-end;height:100%}
.lp .lp-bg span{flex:1;border-radius:4px 4px 0 0}
.lp .lp-bg .ba{background:linear-gradient(180deg,#3d8bff,#1f5fe0)}
.lp .lp-bg .bb{background:rgba(125,140,160,.5)}
.lp .lp-bglabel{display:flex;gap:10px;margin-top:6px}
.lp .lp-bglabel span{flex:1;text-align:center;font-size:9px;color:#5f6b7a}
.lp .lp-catrow{display:flex;flex-direction:column;gap:13px}
.lp .lp-cat .ch{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px;color:#9fb0c0}
.lp .lp-cat .cv{font-weight:600;color:var(--text)}
.lp .lp-catbar{height:6px;border-radius:6px;background:rgba(125,165,255,.1);overflow:hidden}
.lp .lp-catbar span{display:block;height:100%}
.lp .lp-proj{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}
.lp .lp-proj .pp{background:rgba(10,16,32,.6);border:1px solid rgba(125,165,255,.12);
  border-radius:11px;padding:11px;text-align:center}
.lp .lp-proj .pl{font-size:8px;color:#7c8896;text-transform:uppercase;letter-spacing:.06em}
.lp .lp-proj .pv{font-family:'Space Grotesk';font-weight:700;font-size:18px;color:#f3c24f;margin-top:4px}
.lp .lp-projline{height:78px;position:relative;margin-top:6px}
.lp .lp-walerts{display:flex;flex-direction:column;gap:8px}
.lp .lp-al{display:flex;gap:10px;align-items:flex-start;background:rgba(10,16,32,.6);
  border:1px solid rgba(125,165,255,.12);border-radius:11px;padding:11px}
.lp .lp-al .lai{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:13px;flex-shrink:0}
.lp .lp-al b{font-size:11.5px;display:block;color:var(--text)}
.lp .lp-al small{font-size:10px;color:#7c8896}
.lp .lai.dng{background:rgba(255,77,109,.14);color:#ff4d6d}
.lp .lai.wrn{background:rgba(243,194,79,.14);color:#f3c24f}
.lp .lai.ok{background:rgba(34,224,160,.14);color:#22e0a0}
.lp .lp-venc{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;
  background:rgba(10,16,32,.5);border:1px solid rgba(125,165,255,.12);border-radius:11px;margin-bottom:8px}
.lp .lp-venc:last-child{margin-bottom:0}
.lp .lp-venc .vp{font-size:12px;font-weight:600;color:var(--text)}
.lp .lp-venc .vp small{display:block;color:#7c8896;font-size:9.5px;font-weight:400}
.lp .lp-venc .vr{display:flex;align-items:center;gap:9px}
.lp .lp-venc .vm{font-family:'Space Grotesk';font-weight:700;font-size:13px;color:var(--text)}
.lp .lp-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:100px}
.lp .bd-d{background:rgba(255,77,109,.15);color:#ff4d6d}
.lp .bd-w{background:rgba(243,194,79,.15);color:#f3c24f}
.lp .bd-g{background:rgba(34,224,160,.15);color:#22e0a0}
.lp .bd-b{background:rgba(61,139,255,.15);color:#3d8bff}
.lp .lp-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.lp .lp-filter{font-size:11px;padding:6px 13px;border-radius:100px;border:1px solid rgba(125,165,255,.12);
  color:#9fb0c0;background:rgba(125,165,255,.04);cursor:default}
.lp .lp-filter.on{background:rgba(61,139,255,.15);border-color:rgba(61,139,255,.4);color:#fff;font-weight:600}
.lp .lp-ftable{width:100%;border-collapse:collapse}
.lp .lp-ftable th{text-align:left;font-size:8.5px;color:#7c8896;text-transform:uppercase;
  letter-spacing:.06em;padding:0 10px 11px;font-weight:500}
.lp .lp-ftable td{padding:11px 10px;border-top:1px solid rgba(125,165,255,.12);
  font-size:11.5px;color:var(--text);vertical-align:middle}
.lp .lp-av2{width:26px;height:26px;border-radius:8px;display:inline-grid;place-items:center;
  font-size:9.5px;font-weight:700;margin-right:9px;vertical-align:middle}
.lp .lp-supp{font-weight:600;color:var(--text);display:inline-block;vertical-align:middle}
.lp .lp-supp small{display:block;color:#7c8896;font-size:9px;font-weight:400}
.lp .lp-origin{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0 14px}
.lp .lp-ochip{font-size:10.5px;padding:7px 11px;border-radius:9px;border:1px solid rgba(125,165,255,.12);
  color:#9fb0c0;background:rgba(125,165,255,.04);cursor:default}
.lp .lp-ochip.on{background:rgba(61,139,255,.18);border-color:rgba(61,139,255,.45);color:#fff;font-weight:600}
.lp .lp-flabel{font-size:8.5px;color:#7c8896;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.lp .lp-input{background:rgba(7,12,26,.8);border:1px solid rgba(125,165,255,.12);
  border-radius:9px;padding:10px 12px;font-size:13px;color:#9fb0c0;margin-bottom:12px}
.lp .lp-submit{background:linear-gradient(150deg,#3d8bff,#1f5fe0);color:#fff;font-family:'Space Grotesk';
  font-weight:600;font-size:12.5px;border-radius:10px;padding:11px;text-align:center;
  box-shadow:0 6px 18px rgba(61,139,255,.35)}
.lp .lp-move{display:flex;justify-content:space-between;align-items:center;padding:10px 0;
  border-bottom:1px solid rgba(125,165,255,.12)}
.lp .lp-move:last-child{border-bottom:none}
.lp .lp-move .ml{display:flex;align-items:center;gap:9px}
.lp .lp-move .mi{width:28px;height:28px;border-radius:8px;background:rgba(61,139,255,.14);
  display:grid;place-items:center;font-size:12px}
.lp .lp-move .mn{font-size:11.5px;font-weight:600;color:var(--text)}
.lp .lp-move .mn small{display:block;color:#7c8896;font-size:9px;font-weight:400}
.lp .lp-move .mv{font-family:'Space Grotesk';font-weight:700;font-size:12.5px;color:#22e0a0}
.lp .lp-supcard{background:linear-gradient(180deg,rgba(20,32,60,.5),rgba(9,14,30,.5));
  border:1px solid rgba(125,165,255,.12);border-radius:14px;padding:16px}
.lp .lp-supcard .sh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.lp .lp-supcard .sn{font-size:13px;font-weight:600;color:var(--text)}
.lp .lp-supcard .sn small{display:block;color:#7c8896;font-size:9.5px;font-weight:400}
.lp .lp-supcard .sc{font-size:10.5px;color:#9fb0c0;margin-bottom:5px;display:flex;gap:7px;align-items:center}
.lp .lp-supstats{display:flex;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(125,165,255,.12)}
.lp .lp-supstats > div{flex:1}
.lp .lp-supstats .l{font-size:8px;color:#7c8896;text-transform:uppercase}
.lp .lp-supstats .v{font-family:'Space Grotesk';font-weight:700;font-size:15px;margin-top:3px;color:var(--text)}
.lp .show-full{margin-bottom:80px}
.lp .show-full .sf-text{max-width:54ch;margin:0 auto 32px;text-align:center}
.lp .show-full .sf-text h3{font-size:clamp(22px,3vw,30px);font-weight:700;margin-bottom:12px;color:var(--text)}
.lp .show-full .sf-text p{color:var(--text-muted);font-size:16px;margin-bottom:18px}
.lp .show-full .sf-text ul{list-style:none;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:center;padding:0}
.lp .show-full .sf-text li{font-size:14px;color:var(--text-muted);display:flex;gap:8px}
.lp .show-full .sf-text li::before{content:"→";color:#3d8bff;font-weight:700}
.lp .lp-win-wrap{overflow-x:auto;border-radius:18px}
/* panel window frame for secondary mockups */
.lp .showmock .lp-win{border-radius:16px}
.lp .lp-wincontent{padding:16px}
@media(max-width:760px){
  .lp .showmock .lp-win{overflow-x:auto}
  .lp .lp-wincontent{min-width:360px}
}
`;

type NavActive = "dashboard" | "ingresos" | "facturas" | "proveedores";

function MockSidebar({ active }: { active: NavActive }) {
  const items: { key: string; icon: string; label: string }[] = [
    { key: "dashboard", icon: "▣", label: "Dashboard" },
    { key: "captura", icon: "▢", label: "Captura" },
    { key: "ingresos", icon: "▤", label: "Ingresos / Caja" },
    { key: "facturas", icon: "▦", label: "Facturas" },
    { key: "proveedores", icon: "▥", label: "Proveedores" },
    { key: "asistente", icon: "✦", label: "Asistente IA" },
  ];
  return (
    <aside className="lp-wside">
      <div className="lp-wlogo">
        <img src="/icon-192.png" alt="Logo" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: "1.1", color: "var(--text)" }}>Smarter Restaurant</div>
          <div style={{ fontSize: 9, color: "#7c8896", fontWeight: 400 }}>MANAGEMENT</div>
        </div>
      </div>
      <div className="lp-whealth">
        <div className="hl">Salud financiera</div>
        <div className="hv">92<small>/100</small></div>
        <div className="lp-wtrack"><span /></div>
        <div className="hs">Saludable<b>Liquidez excelente · 1 factura vencida menor</b></div>
      </div>
      <div className="lp-wnav">
        {items.map(({ key, icon, label }) => (
          <a key={key} className={active === key ? "on" : ""}>
            <span className="ni">{icon}</span> {label}
          </a>
        ))}
      </div>
      <div className="lp-wfoot">
        <div className="fav">🍽️</div>
        <small>El Buen Sabor<b>Carlos Méndez</b></small>
      </div>
    </aside>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme");
    return () => {
      if (prev) document.documentElement.setAttribute("data-theme", prev);
      else document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("l-in"); obs.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".l-reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const goAuth = () => navigate("/registro");

  return (
    <div className="lp">
      <style>{STYLES}</style>
      <div className="halo" />

      {/* ── NAV ── */}
      <nav>
        <div className="wrap navin">
          <div className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/logo-original.png" alt="Smarter Restaurant Management"
              style={{ height: 52, width: "auto", objectFit: "contain" }} />
            <div>
              <b>Smarter</b>
              <span>RESTAURANT MANAGEMENT</span>
            </div>
          </div>
          {session ? (
            <button className="lp-btn lp-btn-primary" onClick={() => navigate("/dashboard")}>
              Ir al dashboard →
            </button>
          ) : (
            <button className="lp-btn lp-btn-primary" onClick={goAuth}>
              Empezar gratis
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <header>
        <div className="wrap herogrid">
          <div>
            <div className="eyebrow l-reveal">
              <span className="dot" />Gestor financiero para restaurantes
            </div>
            <h1 className="hero l-reveal">
              Entiende el dinero de tu restaurante, <em>sin ser contador.</em>
            </h1>
            <p className="lede l-reveal">
              Smarter Restaurant Management pone tus finanzas en orden y en claro: captura tus
              facturas con una foto, te muestra cuánto tienes y cuánto debes, y te ayuda a tomar
              mejores decisiones cada día. La tecnología que los grandes ya usan, ahora al alcance
              de tu cocina.
            </p>
            <div className="cta-row l-reveal">
              <button className="lp-btn lp-btn-primary" onClick={goAuth}>Empezar gratis →</button>
              <button className="lp-btn lp-btn-ghost"
                onClick={() => document.getElementById("funciones")?.scrollIntoView({ behavior: "smooth" })}>
                Ver cómo funciona
              </button>
            </div>
            <p className="microcopy l-reveal">Sin tarjeta · Listo en 5 minutos · Disponible en español e inglés</p>
          </div>
          <div className="l-reveal">
            <div className="mock lp-glass tilt">
              <div className="mhead">
                <div className="mtitle">Buenos días, Carlos<span>Tu resumen financiero de hoy</span></div>
                <div style={{ fontSize: 18 }}>🔔</div>
              </div>
              <div className="kpis">
                <div className="kpi">
                  <div className="lab">Dinero disponible</div>
                  <div className="val accent">$24,860</div>
                  <div className="sub">↑ 6.2% vs mes anterior</div>
                </div>
                <div className="kpi">
                  <div className="lab">Por pagar (30 días)</div>
                  <div className="val lp-gold">$18,420</div>
                  <div className="sub">12 facturas</div>
                </div>
                <div className="kpi">
                  <div className="lab">Vencidas</div>
                  <div className="val" style={{ color: "#ff4d6d" }}>$3,150</div>
                  <div className="sub">2 por atender</div>
                </div>
                <div className="kpi">
                  <div className="lab">Salud financiera</div>
                  <div className="val lp-cyan">
                    92<small style={{ fontSize: 13 }}>/100</small>
                  </div>
                  <div className="sub">Saludable</div>
                </div>
              </div>
              <div className="bars">
                {[48, 62, 54, 78, 70].map((h, i) => (
                  <div key={i} className="bar" style={{ height: `${h}%` }} />
                ))}
                <div className="bar c" style={{ height: "92%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Trust stats */}
        <div className="wrap trust">
          <div className="trustgrid">
            {[
              { n: "8 de 10", l: "cierres de restaurantes empiezan por desorden financiero" },
              { n: "5 seg",   l: "para registrar una factura, solo con una foto" },
              { n: "100%",   l: "de tus números, claros y en un solo lugar" },
              { n: "24/7",   l: "un asistente con IA cuidando tu caja" },
            ].map(({ n, l }) => (
              <div key={n} className="stat l-reveal">
                <div className="n">{n}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── PROPÓSITO ── */}
      <section id="proposito">
        <div className="wrap">
          <div className="sectlead center l-reveal">
            <div className="tag">Por qué importa</div>
            <h2>Un buen restaurante también se administra bien</h2>
            <p>
              La pasión por la comida es lo que te trajo aquí. Pero lo que mantiene las puertas
              abiertas son las finanzas sanas. Saber cuánto entra, cuánto sale y qué viene es lo
              que separa a un negocio que sobrevive de uno que crece. Smarter te da esa claridad,
              sin complicaciones y sin necesidad de saber de contabilidad.
            </p>
          </div>
        </div>
      </section>

      {/* ── FUNCIONES ── */}
      <section id="funciones" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="sectlead center l-reveal">
            <div className="tag">La app en funcionamiento</div>
            <h2>Mira cómo se ve por dentro</h2>
            <p>Cada función pensada para el día a día de un restaurante. Así trabaja Smarter.</p>
          </div>

          {/* 1. Dashboard — full-width window frame */}
          <div className="l-reveal" style={{ marginBottom: 80 }}>
            <div className="lp-win-wrap">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/dashboard</span>
                </div>
                <div className="lp-wapp">
                  <MockSidebar active="dashboard" />
                  <div className="lp-wmain">
                    <div className="lp-wphead">
                      <div><h2>Buenos días, Carlos</h2><div className="sub">Viernes, 26 de junio · resumen en tiempo real</div></div>
                      <div className="lp-wscan">⤢ Escanear factura</div>
                    </div>
                    <div className="lp-row lp-r4">
                      <div className="lp-card lp-kpi"><div className="kl">Dinero disponible</div><div className="kv" style={{ color: "#3d8bff" }}>$24,860</div><div className="ks">↑ 6.2% vs mes anterior</div></div>
                      <div className="lp-card lp-kpi"><div className="kl">Facturas pendientes</div><div className="kv" style={{ color: "#f3c24f" }}>$18,420</div><div className="ks">12 por pagar</div></div>
                      <div className="lp-card lp-kpi"><div className="kl">Facturas vencidas</div><div className="kv" style={{ color: "#ff4d6d" }}>$3,150</div><div className="ks">2 requieren atención</div></div>
                      <div className="lp-card lp-kpi"><div className="kl">Gastos del mes</div><div className="kv" style={{ color: "#00d4ff" }}>$42,300</div><div className="ks">↑ 18% en alimentos</div></div>
                    </div>
                    <div className="lp-row lp-r32">
                      <div className="lp-card">
                        <div className="lp-ct">Ingresos vs Gastos</div><div className="lp-cs">Últimos 6 meses</div>
                        <div className="lp-cbars">
                          {([[60,42],[72,55],[64,48],[85,62],[78,70],[95,66]] as [number,number][]).map(([a,b],i) => (
                            <div key={i} className="lp-bg">
                              <span className="ba" style={{ height: `${a}%` }} />
                              <span className="bb" style={{ height: `${b}%` }} />
                            </div>
                          ))}
                        </div>
                        <div className="lp-bglabel">
                          {["Ene","Feb","Mar","Abr","May","Jun"].map(m => <span key={m}>{m}</span>)}
                        </div>
                      </div>
                      <div className="lp-card">
                        <div className="lp-ct">Gastos por categoría</div><div className="lp-cs">Junio · $42,300</div>
                        <div className="lp-catrow">
                          {([
                            { n:"Alimentos", v:"$19,400", w:"92%", c:"linear-gradient(90deg,#3d8bff,#00d4ff)" },
                            { n:"Carnes y pescado", v:"$9,800", w:"64%", c:"#00d4ff" },
                            { n:"Bebidas", v:"$6,200", w:"42%", c:"#a855f7" },
                            { n:"Servicios", v:"$4,500", w:"30%", c:"#f3c24f" },
                            { n:"Insumos y limpieza", v:"$2,400", w:"18%", c:"#ff4d6d" },
                          ] as { n:string; v:string; w:string; c:string }[]).map(({ n,v,w,c }) => (
                            <div key={n} className="lp-cat">
                              <div className="ch"><span>{n}</span><span className="cv">{v}</span></div>
                              <div className="lp-catbar"><span style={{ width: w, background: c }} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="lp-row lp-r32">
                      <div className="lp-card">
                        <div className="lp-ct">Flujo de caja proyectado</div><div className="lp-cs">Próximos 30 días</div>
                        <div className="lp-proj">
                          <div className="pp"><div className="pl">En 7 días</div><div className="pv" style={{ color: "#f3c24f" }}>$8,500</div></div>
                          <div className="pp"><div className="pl">En 15 días</div><div className="pv" style={{ color: "#f3c24f" }}>$12,840</div></div>
                          <div className="pp"><div className="pl">En 30 días</div><div className="pv" style={{ color: "#f3c24f" }}>$18,420</div></div>
                        </div>
                        <svg className="lp-projline" viewBox="0 0 400 78" preserveAspectRatio="none" style={{ width: "100%" }}>
                          <defs>
                            <linearGradient id="lp-dash-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0" stopColor="#3d8bff" stopOpacity={0.35} />
                              <stop offset="1" stopColor="#3d8bff" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <path d="M0 14 L80 26 L160 40 L240 30 L320 52 L400 60 L400 78 L0 78 Z" fill="url(#lp-dash-grad)" />
                          <path d="M0 14 L80 26 L160 40 L240 30 L320 52 L400 60" fill="none" stroke="#3d8bff" strokeWidth={2.5} />
                          <circle cx={0} cy={14} r={3.5} fill="#00d4ff" />
                          <circle cx={160} cy={40} r={3.5} fill="#00d4ff" />
                          <circle cx={320} cy={52} r={3.5} fill="#00d4ff" />
                          <circle cx={400} cy={60} r={3.5} fill="#00d4ff" />
                        </svg>
                      </div>
                      <div className="lp-card">
                        <div className="lp-ct">⚠ Alertas inteligentes</div><div className="lp-cs">Lo que necesita tu atención</div>
                        <div className="lp-walerts">
                          <div className="lp-al"><div className="lai dng">!</div><div><b>Factura vencida</b><small>Gas Industrial GMX · $1,820 venció hace 5 días</small></div></div>
                          <div className="lp-al"><div className="lai wrn">◷</div><div><b>Vence en 3 días</b><small>Carnes del Valle · $5,210 el 26 de junio</small></div></div>
                          <div className="lp-al"><div className="lai wrn">↗</div><div><b>Aumento inusual de costos</b><small>Alimentos subió 18% vs mayo</small></div></div>
                          <div className="lp-al"><div className="lai ok">✓</div><div><b>Liquidez bajo control</b><small>Saldo proyectado positivo a 30 días</small></div></div>
                        </div>
                      </div>
                    </div>
                    <div className="lp-card">
                      <div className="lp-ct">Próximos vencimientos</div><div className="lp-cs" style={{ marginBottom: 14 }} />
                      <div className="lp-venc"><div className="vp">Carnes del Valle<small>CV-1190 · Carnes</small></div><div className="vr"><span className="vm">$5,210</span><span className="lp-badge bd-w">En 3 días</span></div></div>
                      <div className="lp-venc"><div className="vp">Distribuidora La Fresca<small>A-04821 · Alimentos</small></div><div className="vr"><span className="vm">$3,340</span><span className="lp-badge bd-b">En 13 días</span></div></div>
                      <div className="lp-venc"><div className="vp">Gas Industrial GMX<small>GMX-733 · Servicios</small></div><div className="vr"><span className="vm">$1,820</span><span className="lp-badge bd-d">Vencida</span></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Captura — mockup left, text right */}
          <div className="show l-reveal">
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/captura</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Captura inteligente<span>La IA extrae todo de la foto</span></div>
                  </div>
                  <div className="cap">
                    <div className="dropz">
                      <div className="cam">📷</div>
                      <b>Toma o sube la factura</b>
                      <small>JPG · PNG · PDF</small>
                    </div>
                    <div className="extr">
                      <div className="et">✦ Datos extraídos por IA</div>
                      <div className="field"><div className="fl">Proveedor</div><div className="fv">Distribuidora La Fresca</div></div>
                      <div className="field"><div className="fl">Monto total</div><div className="fv accent">$3,340.00</div></div>
                      <div className="field"><div className="fl">Vencimiento</div><div className="fv">06 jul 2026</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="showtext">
              <span className="pill">Captura sin esfuerzo</span>
              <h3>Una foto, y la factura se registra sola</h3>
              <p>
                Olvídate de teclear datos. Fotografía cualquier factura de proveedor y la
                inteligencia artificial lee el proveedor, el monto, la fecha y el vencimiento por
                ti. Tú solo revisas y confirmas.
              </p>
              <ul>
                <li>Funciona con fotos del celular, escaneos o PDF</li>
                <li>Tú siempre confirmas antes de guardar</li>
                <li>Cero hojas de cálculo, cero tecleo manual</li>
              </ul>
            </div>
          </div>

          {/* 3. Alertas — text left, mockup right */}
          <div className="show l-reveal">
            <div className="showtext">
              <span className="pill">Siempre un paso adelante</span>
              <h3>Nunca más una factura vencida por sorpresa</h3>
              <p>
                Smarter vigila tu caja por ti y te avisa cuando algo necesita tu atención:
                un pago próximo, un costo que se disparó o un riesgo de liquidez. Decides
                con tiempo, no con apuro.
              </p>
              <ul>
                <li>Avisos de vencimiento configurables</li>
                <li>Detección de gastos fuera de lo normal</li>
                <li>Notificaciones en la app y por email</li>
              </ul>
            </div>
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/dashboard</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Alertas inteligentes<span>Te avisa antes, no después</span></div>
                  </div>
                  <div className="alerts-list">
                    <div className="al-item"><div className="al-icon dng">!</div><div><b>Factura por vencer</b><small>Carnes del Valle · $5,210 vence en 3 días</small></div></div>
                    <div className="al-item"><div className="al-icon wrn">↑</div><div><b>Aumento de costos</b><small>Alimentos subió 18% vs el mes pasado</small></div></div>
                    <div className="al-item"><div className="al-icon ok">✓</div><div><b>Liquidez bajo control</b><small>Saldo proyectado positivo a 30 días</small></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Ingresos — mockup left, text right */}
          <div className="show l-reveal">
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/ingresos</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Ingresos · Caja<span>Ventas y entradas del restaurante</span></div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                    <div className="lp-card lp-kpi"><div className="kl">Ingresos de hoy</div><div className="kv" style={{ color:"#3d8bff" }}>$7,620</div><div className="ks">4 movimientos</div></div>
                    <div className="lp-card lp-kpi"><div className="kl">Este mes</div><div className="kv" style={{ color:"#00d4ff" }}>$184k</div><div className="ks">↑ 9.4% vs mayo</div></div>
                  </div>
                  <div className="lp-card" style={{ marginBottom:10 }}>
                    <div className="lp-ct" style={{ marginBottom:8 }}>Registrar ingreso</div>
                    <div className="lp-origin" style={{ margin:"0 0 10px" }}>
                      <span className="lp-ochip on">Cierre de caja</span>
                      <span className="lp-ochip">Terminal de tarjeta</span>
                      <span className="lp-ochip">Domicilio</span>
                    </div>
                    <div className="lp-origin" style={{ margin:"0 0 10px" }}>
                      <span className="lp-ochip on">Efectivo</span>
                      <span className="lp-ochip">Tarjeta</span>
                      <span className="lp-ochip">Transferencia</span>
                    </div>
                    <div className="lp-input">$ 3,180.00</div>
                    <div className="lp-submit">↗ Registrar ingreso</div>
                  </div>
                  <div className="lp-card">
                    <div className="lp-ct" style={{ marginBottom:8 }}>Movimientos recientes</div>
                    <div className="lp-move"><div className="ml"><div className="mi">💵</div><div className="mn">Cierre de caja<small>Efectivo · Hoy 23:10</small></div></div><div className="mv">+$3,180.00</div></div>
                    <div className="lp-move"><div className="ml"><div className="mi">💳</div><div className="mn">Terminal de tarjeta<small>Tarjeta · Hoy 22:40</small></div></div><div className="mv">+$2,640.00</div></div>
                    <div className="lp-move" style={{ borderBottom:"none" }}><div className="ml"><div className="mi">🛵</div><div className="mn">Pedidos a domicilio<small>Transferencia · Hoy 21:15</small></div></div><div className="mv">+$1,420.00</div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="showtext">
              <span className="pill">Ingresos / Caja</span>
              <h3>Registra cada peso que entra</h3>
              <p>Cierre de caja, terminales, domicilio, propinas o eventos — todo en segundos. Tu historial siempre al día, sin papeles.</p>
              <ul>
                <li>Origen y método de cobro en un clic</li>
                <li>KPIs de ingresos del día y del mes</li>
                <li>Historial de movimientos con hora exacta</li>
              </ul>
            </div>
          </div>

          {/* 5. Facturas — text left, mockup right */}
          <div className="show l-reveal">
            <div className="showtext">
              <span className="pill">Control de facturas</span>
              <h3>Todas tus facturas, bajo control</h3>
              <p>Filtra por estado, ve quién está vencido y cuánto debes. Sin sorpresas al cierre del mes.</p>
              <ul>
                <li>Vista por estado: pendiente, programada, vencida, pagada</li>
                <li>Monto e indicador de urgencia de un vistazo</li>
                <li>Nueva factura en segundos con la captura IA</li>
              </ul>
            </div>
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/facturas</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Facturas<span>7 facturas · $18,420 por pagar</span></div>
                  </div>
                  <div className="lp-filters" style={{ marginBottom:12 }}>
                    <span className="lp-filter on">Todas 7</span>
                    <span className="lp-filter">Pendientes 2</span>
                    <span className="lp-filter">Vencidas 2</span>
                    <span className="lp-filter">Pagadas 2</span>
                  </div>
                  <div className="lp-card" style={{ padding:"8px 12px" }}>
                    <table className="lp-ftable">
                      <thead><tr><th>Proveedor</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead>
                      <tbody>
                        <tr>
                          <td><span className="lp-av2" style={{ background:"rgba(61,139,255,.18)",color:"#3d8bff" }}>LF</span><span className="lp-supp">La Fresca<small>Alimentos</small></span></td>
                          <td style={{ fontSize:10.5 }}>06 jul<br /><small style={{ color:"#7c8896" }}>13 días</small></td>
                          <td><b>$3,340</b></td><td><span className="lp-badge bd-w">Pendiente</span></td>
                        </tr>
                        <tr>
                          <td><span className="lp-av2" style={{ background:"rgba(0,212,255,.18)",color:"#00d4ff" }}>CV</span><span className="lp-supp">Carnes Valle<small>Carnes</small></span></td>
                          <td style={{ fontSize:10.5 }}>26 jun<br /><small style={{ color:"#7c8896" }}>3 días</small></td>
                          <td><b>$5,210</b></td><td><span className="lp-badge bd-b">Programada</span></td>
                        </tr>
                        <tr>
                          <td><span className="lp-av2" style={{ background:"rgba(255,77,109,.18)",color:"#ff4d6d" }}>GM</span><span className="lp-supp">Gas GMX<small>Servicios</small></span></td>
                          <td style={{ fontSize:10.5 }}>18 jun<br /><small style={{ color:"#ff4d6d" }}>vencida</small></td>
                          <td><b>$1,820</b></td><td><span className="lp-badge bd-d">Vencida</span></td>
                        </tr>
                        <tr>
                          <td><span className="lp-av2" style={{ background:"rgba(34,224,160,.18)",color:"#22e0a0" }}>PH</span><span className="lp-supp">El Horno<small>Alimentos</small></span></td>
                          <td style={{ fontSize:10.5 }}>12 jun<br /><small style={{ color:"#7c8896" }}>pagada</small></td>
                          <td><b>$890</b></td><td><span className="lp-badge bd-g">Pagada</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Proveedores — mockup left, text right */}
          <div className="show l-reveal">
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/proveedores</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Proveedores<span>Base de datos y condiciones de crédito</span></div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div className="lp-supcard">
                      <div className="sh"><span className="lp-av2" style={{ background:"rgba(61,139,255,.18)",color:"#3d8bff",width:30,height:30 }}>DF</span><div className="sn">La Fresca<small>Crédito 15 días</small></div></div>
                      <div className="sc">✉ ventas@lafresca.mx</div>
                      <div className="lp-supstats"><div><div className="l">Compras / año</div><div className="v">$142k</div></div><div><div className="l">Por pagar</div><div className="v" style={{ color:"#3d8bff" }}>$3,340</div></div></div>
                    </div>
                    <div className="lp-supcard">
                      <div className="sh"><span className="lp-av2" style={{ background:"rgba(0,212,255,.18)",color:"#00d4ff",width:30,height:30 }}>CV</span><div className="sn">Carnes Valle<small>Crédito 7 días</small></div></div>
                      <div className="sc">✉ pedidos@carnesvalle.mx</div>
                      <div className="lp-supstats"><div><div className="l">Compras / año</div><div className="v">$98,600</div></div><div><div className="l">Por pagar</div><div className="v" style={{ color:"#ff4d6d" }}>$5,210</div></div></div>
                    </div>
                    <div className="lp-supcard">
                      <div className="sh"><span className="lp-av2" style={{ background:"rgba(168,85,247,.18)",color:"#a855f7",width:30,height:30 }}>VL</span><div className="sn">Vinos &amp; Licores<small>Crédito 30 días</small></div></div>
                      <div className="sc">✉ hola@licoressur.mx</div>
                      <div className="lp-supstats"><div><div className="l">Compras / año</div><div className="v">$54,200</div></div><div><div className="l">Por pagar</div><div className="v" style={{ color:"#ff4d6d" }}>$1,330</div></div></div>
                    </div>
                    <div className="lp-supcard">
                      <div className="sh"><span className="lp-av2" style={{ background:"rgba(34,224,160,.18)",color:"#22e0a0",width:30,height:30 }}>PH</span><div className="sn">El Horno<small>Contado</small></div></div>
                      <div className="sc">✉ elhorno@correo.mx</div>
                      <div className="lp-supstats"><div><div className="l">Compras / año</div><div className="v">$32,900</div></div><div><div className="l">Por pagar</div><div className="v" style={{ color:"#22e0a0" }}>$0</div></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="showtext">
              <span className="pill">Gestión de proveedores</span>
              <h3>Tus proveedores, ordenados y a la mano</h3>
              <p>Historial de compras, condiciones de crédito y deuda actual por proveedor. Negocia con datos reales.</p>
              <ul>
                <li>Ficha completa: contacto, crédito e historial</li>
                <li>Compras anuales y saldo pendiente visibles</li>
                <li>Agrega proveedores nuevos en segundos</li>
              </ul>
            </div>
          </div>

          {/* 7. Asistente IA — text left, mockup right */}
          <div className="show l-reveal">
            <div className="showtext">
              <span className="pill">Inteligencia a tu servicio</span>
              <h3>Pregúntale a tu negocio lo que quieras</h3>
              <p>
                Un asistente con IA que conoce tus números reales. Pregúntale qué facturas
                priorizar, cómo bajar gastos o cómo se verá tu caja en dos meses. Respuestas
                claras, basadas en tus datos, en lenguaje sencillo.
              </p>
              <ul>
                <li>Responde con la información real de tu restaurante</li>
                <li>Sugerencias para mejorar tu liquidez</li>
                <li>Como tener un director financiero 24/7</li>
              </ul>
            </div>
            <div className="showmock">
              <div className="lp-win">
                <div className="lp-wbar">
                  <span className="wdot d1" /><span className="wdot d2" /><span className="wdot d3" />
                  <span className="lp-wurl">smarter-restaurant.app/asistente</span>
                </div>
                <div className="lp-wincontent">
                  <div className="mhead">
                    <div className="mtitle">Asistente financiero IA<span>Tu CFO virtual · Rey Salomón</span></div>
                  </div>
                  <div className="chat-list">
                    <div className="msg ai-msg">Hola Carlos 👋 Tienes $8,500 en pagos durante los próximos 10 días y tu liquidez se mantiene saludable.</div>
                    <div className="msg me">¿Cuál será mi saldo si pago todo lo programado?</div>
                    <div className="msg ai-msg">Tu saldo a 30 días sería de $12,300 — positivo. Te conviene pagar Carnes del Valle el día 25 para mantener colchón.</div>
                    <div className="chips">
                      <span className="chip">¿Qué pago primero?</span>
                      <span className="chip">¿Cómo reduzco gastos?</span>
                      <span className="chip">Proyección a 60 días</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="feats">
            {[
              { ic: "📈", h: "Flujo de caja proyectado", p: "Mira cuánto tendrás en 7, 15 y 30 días descontando lo que debes. Anticipa los apretones." },
              { ic: "🚚", h: "Proveedores y crédito",    p: "Historial por proveedor, condiciones de pago y cuánto les debes. Negocia con datos en mano." },
              { ic: "📱", h: "En tu celular y en la web", p: "Instálala como app en tu teléfono. Registra una factura desde la cocina, en cualquier momento." },
            ].map(({ ic, h, p }) => (
              <div key={h} className="feat lp-glass l-reveal">
                <div className="ic">{ic}</div>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como" style={{ background: "linear-gradient(180deg,transparent,rgba(61,139,255,.04),transparent)" }}>
        <div className="wrap">
          <div className="sectlead center l-reveal">
            <div className="tag">Cómo funciona</div>
            <h2>Tres pasos, y tomas el control</h2>
          </div>
          <div className="steps">
            {[
              { n: "1", h: "Captura tus facturas",  p: "Fotografía o sube cualquier factura. La IA la registra en segundos." },
              { n: "2", h: "Revisa tu panel",        p: "Mira tu dinero disponible, lo que debes y tu salud financiera al instante." },
              { n: "3", h: "Decide con claridad",    p: "Recibe alertas, consulta a tu asistente IA y planea con confianza." },
            ].map(({ n, h, p }) => (
              <div key={n} className="step l-reveal">
                <div className="num">{n}</div>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios">
        <div className="wrap">
          <div className="sectlead center l-reveal">
            <div className="tag">Precios</div>
            <h2>Una inversión que se paga sola</h2>
            <p>Menos de lo que gastas en insumos en un día. Mucho más tranquilidad cada mes.</p>
          </div>
          <div className="pricegrid">
            {/* Básico */}
            <div className="price lp-glass l-reveal">
              <div className="pname">Básico</div>
              <div className="amt">$29<small>/mes</small></div>
              <ul>
                <li>Captura de facturas con IA</li>
                <li>Panel financiero en tiempo real</li>
                <li>Alertas de vencimiento</li>
                <li>Proveedores ilimitados</li>
                <li>App móvil y web (ES/EN)</li>
              </ul>
              <button className="lp-btn lp-btn-ghost" onClick={goAuth}>Empezar gratis</button>
            </div>
            {/* Pro */}
            <div className="price lp-glass pop l-reveal">
              <div className="ptag">MÁS POPULAR</div>
              <div className="pname">Pro</div>
              <div className="amt">$59<small>/mes</small></div>
              <ul>
                <li>Todo lo de Básico</li>
                <li>Asistente financiero IA</li>
                <li>Flujo de caja proyectado</li>
                <li>Alertas inteligentes avanzadas</li>
                <li>Reportes y varias sucursales</li>
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={goAuth}>Empezar gratis</button>
            </div>
          </div>
          <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13.5, marginTop: 22 }}>
            Plan anual con 2 meses gratis · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section>
        <div className="wrap">
          <div className="finalcta l-reveal">
            <h2>Dale a tu restaurante la claridad financiera que merece</h2>
            <p>Empieza gratis hoy. En cinco minutos verás tus números como nunca antes.</p>
            <button className="lp-btn lp-btn-primary" style={{ fontSize: 16, padding: "15px 32px" }} onClick={goAuth}>
              Crear mi cuenta gratis →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="wrap footin">
          <div className="lp-brand">
            <img src="/logo-original.png" alt="Logo" style={{ height: 32, width: "auto", objectFit: "contain" }} />
            <b style={{ fontSize: 13 }}>Smarter Restaurant Management</b>
          </div>
          <div>© 2026 Smarter · Para quienes cocinan y administran a la vez.</div>
        </div>
      </footer>
    </div>
  );
}
