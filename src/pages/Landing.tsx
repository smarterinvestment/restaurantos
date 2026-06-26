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
`;

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

          {/* 1. Captura */}
          <div className="show l-reveal">
            <div className="showmock">
              <div className="mock lp-glass">
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
                    <div className="field">
                      <div className="fl">Proveedor</div>
                      <div className="fv">Distribuidora La Fresca</div>
                    </div>
                    <div className="field">
                      <div className="fl">Monto total</div>
                      <div className="fv accent">$3,340.00</div>
                    </div>
                    <div className="field">
                      <div className="fl">Vencimiento</div>
                      <div className="fv">06 jul 2026</div>
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

          {/* 2. Dashboard */}
          <div className="show rev l-reveal">
            <div className="showmock">
              <div className="mock lp-glass">
                <div className="mhead">
                  <div className="mtitle">Tu panel financiero<span>Todo claro de un vistazo</span></div>
                </div>
                <div className="kpis">
                  <div className="kpi"><div className="lab">Disponible</div><div className="val accent">$24,860</div></div>
                  <div className="kpi"><div className="lab">Por pagar</div><div className="val lp-gold">$18,420</div></div>
                  <div className="kpi"><div className="lab">Gastos del mes</div><div className="val">$42,300</div></div>
                  <div className="kpi"><div className="lab">Salud</div><div className="val lp-cyan">92/100</div></div>
                </div>
                <div className="bars">
                  {[50, 65, 58, 80, 72].map((h, i) => (
                    <div key={i} className="bar" style={{ height: `${h}%` }} />
                  ))}
                  <div className="bar c" style={{ height: "94%" }} />
                </div>
              </div>
            </div>
            <div className="showtext">
              <span className="pill">Visión total</span>
              <h3>Sabe en segundos cómo está tu caja</h3>
              <p>
                Dinero disponible, lo que debes, lo que ya venció y tus gastos del mes — todo en
                una sola pantalla, actualizado al instante. Sin abrir diez archivos ni llamar al
                contador.
              </p>
              <ul>
                <li>Ingresos vs gastos en gráficas claras</li>
                <li>Gastos por categoría para ver dónde se va el dinero</li>
                <li>Un indicador de salud financiera siempre visible</li>
              </ul>
            </div>
          </div>

          {/* 3. Alertas */}
          <div className="show l-reveal">
            <div className="showmock">
              <div className="mock lp-glass">
                <div className="mhead">
                  <div className="mtitle">Alertas inteligentes<span>Te avisa antes, no después</span></div>
                </div>
                <div className="alerts-list">
                  <div className="al-item">
                    <div className="al-icon dng">!</div>
                    <div><b>Factura por vencer</b><small>Carnes del Valle · $5,210 vence en 3 días</small></div>
                  </div>
                  <div className="al-item">
                    <div className="al-icon wrn">↑</div>
                    <div><b>Aumento de costos</b><small>El gasto en alimentos subió 18% vs el mes pasado</small></div>
                  </div>
                  <div className="al-item">
                    <div className="al-icon ok">✓</div>
                    <div><b>Liquidez bajo control</b><small>Saldo proyectado positivo a 30 días</small></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="showtext">
              <span className="pill">Siempre un paso adelante</span>
              <h3>Nunca más una factura vencida por sorpresa</h3>
              <p>
                Smarter vigila tu caja por ti y te avisa por la app y por correo cuando algo
                necesita tu atención: un pago próximo, un costo que se disparó o un riesgo de
                liquidez. Decides con tiempo, no con apuro.
              </p>
              <ul>
                <li>Avisos de vencimiento configurables</li>
                <li>Detección de gastos fuera de lo normal</li>
                <li>Notificaciones en la app y por email</li>
              </ul>
            </div>
          </div>

          {/* 4. Asistente IA */}
          <div className="show rev l-reveal">
            <div className="showmock">
              <div className="mock lp-glass">
                <div className="mhead">
                  <div className="mtitle">Asistente financiero IA<span>Tu CFO virtual</span></div>
                </div>
                <div className="chat-list">
                  <div className="msg ai-msg">
                    Hola Carlos 👋 Tienes $8,500 en pagos durante los próximos 10 días y tu liquidez se mantiene saludable.
                  </div>
                  <div className="msg me">¿Cuál será mi saldo si pago todo lo programado?</div>
                  <div className="msg ai-msg">
                    Tu saldo a 30 días sería de $12,300 — positivo. Te conviene pagar Carnes del Valle el día 25 para mantener colchón.
                  </div>
                  <div className="chips">
                    <span className="chip">¿Qué pago primero?</span>
                    <span className="chip">¿Cómo reduzco gastos?</span>
                    <span className="chip">Proyección a 60 días</span>
                  </div>
                </div>
              </div>
            </div>
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
