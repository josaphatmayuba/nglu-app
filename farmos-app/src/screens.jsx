/* eslint-disable */
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { SPECIES, speciesById, t } from "./data";
import { SpeciesPillBar, KpiCard, Sparkline, FarmScore, EmptyState } from "./shell";
import { api, adaptMedicine, adaptTreatment, adaptReproEvent, adaptSaleAsTransaction, adaptExpenseAsTransaction } from "./api";

// All remaining screens: Health, Calendar, Stock, Repro, Production, Alerts, Finances, Reports.

// ─── HEALTH & TREATMENTS ─────────────────────────────────────────────────
const HealthScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allTreatments, setAllTreatments] = React.useState([]);
  const [allAnimals, setAllAnimals] = React.useState([]);
  const [allExpenses, setAllExpenses] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listTreatments(), api.listAnimals(), api.listDiseases(), api.listExpenses()])
      .then(([trs, animals, diseases, expenses]) => {
        if (cancel) return;
        const animalsArr = Array.isArray(animals) ? animals : [];
        const aMap = new Map(animalsArr.map((a) => [a.id, a]));
        const dMap = new Map((Array.isArray(diseases) ? diseases : []).map((d) => [d.id, d]));
        const mapped = (Array.isArray(trs) ? trs : []).map((t) => adaptTreatment(t, aMap, dMap));
        setAllTreatments(mapped);
        setAllAnimals(animalsArr);
        setAllExpenses(Array.isArray(expenses) ? expenses : []);
      })
      .catch((e) => console.warn("listTreatments failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:treatment-created", onCreated);
    return () => window.removeEventListener("farmos:treatment-created", onCreated);
  }, []);
  const treatments = allTreatments.filter(t => !speciesFilter || t.species === speciesFilter);
  const running = treatments.filter(t => t.status === "running");
  const completed = treatments.filter(t => t.status === "completed");

  // KPIs dérivés des vraies données + filtrés par espèce.
  const animalsFiltered = allAnimals.filter((a) => !speciesFilter || a.species === speciesFilter);
  const quarantineCount = animalsFiltered.filter((a) => {
    const s = String(a.status || "").toLowerCase();
    return s === "quarantine" || s === "quarantaine" || s === "isolated";
  }).length;
  const today = new Date().toISOString().slice(0, 10);
  const withdrawalCount = animalsFiltered.filter((a) => {
    const w = a.withdrawalUntil || a.withdrawal_until;
    return w && String(w).slice(0, 10) >= today;
  }).length;
  // Coût médicaments du mois en cours. Si un filtre espèce est actif on tente
  // de relier l'expense au médicament via related_medicine_id, sinon on
  // compte tout (cas data legacy sans liaison).
  const monthPrefix = today.slice(0, 7);
  const speciesMedicineIds = speciesFilter
    ? new Set(allAnimals
        .filter((a) => a.species === speciesFilter)
        .map((a) => a.id)) // placeholder set, not actually used
    : null;
  const medExpenses = allExpenses.filter((e) => {
    const cat = String(e.category || "").toLowerCase();
    if (cat !== "medicine" && cat !== "médicament" && cat !== "med") return false;
    const d = e.expenseDate || e.expense_date;
    if (!d || !String(d).startsWith(monthPrefix)) return false;
    return true;
  });
  const medCostMonth = medExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Santé · Health" : "Health · Santé"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Traitements & médicaments, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).fr.toLowerCase() : "cheptel complet"}</span></>
            : <>Treatments & medicine, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).en.toLowerCase() : "full herd"}</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      {/* KPI row — dérivés des vraies données + filtrés par espèce. */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Traitements actifs" : "Active treatments"} value={running.length} unit="" icon="pill" accent="var(--health-500)"/>
        <KpiCard label={lang === "fr" ? "Animaux en quarantaine" : "Animals in quarantine"} value={quarantineCount} unit="" icon="shield" accent={quarantineCount > 0 ? "var(--rust-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Délais de retrait actifs" : "Active withdrawals"} value={withdrawalCount} unit="" icon="clock" accent={withdrawalCount > 0 ? "var(--rust-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Coût médicaments · mois" : "Medicine cost · month"} value={medCostMonth.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} unit="$" icon="coins"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-15)", gap: 16 }}>
        {/* Treatments list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px" }}>
            <div className="bilang">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Traitements en cours" : "Active treatments"}</h3>
              <span className="sec">{running.length}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "health" }))}><Icon name="plus" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Individuel" : "Individual"}</button>
              <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "health" }))}><Icon name="layers" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Lot" : "Batch"}</button>
              <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "health" }))}><Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Nouveau" : "New"}</button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-1)" }}>
            {treatments.map((tr, i) => {
              const sp = speciesById(tr.species);
              const ongoing = tr.status === "running";
              return (
                <div key={tr.id} style={{
                  display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 14, padding: "14px 18px",
                  borderBottom: i < treatments.length - 1 ? "1px solid var(--border-1)" : "none",
                  background: ongoing && tr.withdrawal ? "rgba(122,31,43,0.02)" : "transparent",
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AnimalGlyph kind={sp.glyph} size={16} color="currentColor"/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span className="italic-serif" style={{ fontSize: 16, color: "var(--ink-950)" }}>{tr.animal}</span>
                      <span style={{ fontSize: 13, color: "var(--ink-700)" }}>· {tr.reason}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{tr.id}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12, color: "var(--fg-2)", flexWrap: "wrap" }}>
                      <span><Icon name="pill" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.med}</span></span>
                      <span><Icon name="syringe" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.dosage} · {tr.route}</span></span>
                      <span><Icon name="calendar" size={11} color="var(--fg-3)"/> <span className="mono" style={{ marginLeft: 4 }}>{tr.start} → {tr.end}</span></span>
                      <span><Icon name="user" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.vet}</span></span>
                    </div>
                    {tr.withdrawal && Object.entries(tr.withdrawal).some(([k, v]) => v > 0) && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(tr.withdrawal).map(([k, v]) => v > 0 && (
                          <span key={k} className="tag tag-danger" style={{ fontSize: 11 }}>
                            <Icon name="shield" size={10} color="var(--rust-700)"/>
                            {lang === "fr"
                              ? `Retrait ${k === "milk" ? "lait" : k === "meat" ? "viande" : "œufs"} · ${v} j`
                              : `${k === "milk" ? "Milk" : k === "meat" ? "Meat" : "Eggs"} withdrawal · ${v} d`
                            }
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span className="tag" style={{ background: ongoing ? "var(--autorite-50)" : "var(--solidite-50)", color: ongoing ? "var(--autorite-900)" : "var(--solidite-900)" }}>
                      {ongoing ? (lang === "fr" ? "En cours" : "Running") : (lang === "fr" ? "Terminé" : "Completed")}
                    </span>
                    {tr._pk && (
                      <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }} title={lang === "fr" ? "Supprimer" : "Delete"}
                        onClick={async () => {
                          if (!window.confirm(lang === "fr" ? `Supprimer le traitement ${tr.id} ?` : `Delete treatment ${tr.id}?`)) return;
                          try { await api.deleteTreatment(tr._pk); window.dispatchEvent(new CustomEvent("farmos:treatment-created")); } catch (e) { window.alert(e.message); }
                        }}>
                        <Icon name="trash" size={13} color="var(--oxblood-700)"/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diseases card (adaptive) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="bilang">
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Maladies actives" : "Active diseases"}</h3>
                <span className="sec">{lang === "fr" ? "12 cas répartis" : "12 cases"}</span>
              </div>
              <button className="btn btn-sm btn-ghost"><Icon name="filter" size={12} color="var(--ink-700)"/></button>
            </div>
            {(speciesFilter ? [speciesById(speciesFilter)] : SPECIES.slice(0, 5)).map((s) => (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AnimalGlyph kind={s.glyph} size={14} color="var(--ink-700)"/>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-3)" }} className="mono">{s.sick} cas</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(lang === "fr" ? s.diseases : s.diseasesEn).slice(0, 3).map((d, i) => (
                    <span key={i} className="tag" style={{ background: i === 0 ? "var(--rust-50)" : "var(--bg-sunken)", color: i === 0 ? "var(--rust-900)" : "var(--ink-700)" }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Vet card */}
          <div className="card" style={{ background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-800)" }}>
            <div className="overline" style={{ color: "rgba(251,248,242,0.6)", marginBottom: 8 }}>{lang === "fr" ? "Vétérinaire de garde" : "On-call veterinarian"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>EB</div>
              <div>
                <div className="italic-serif" style={{ fontSize: 17, color: "var(--parchment-50)" }}>Dr. Émilie Boucher</div>
                <div style={{ fontSize: 12, color: "var(--ink-300)" }}>Clinique Vétérinaire des Laurentides</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 2 }}>+1 450 555 0124 · disponible 24/7</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.15)", flex: 1 }}>{lang === "fr" ? "Appeler" : "Call"}</button>
              <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.15)", flex: 1 }}>{lang === "fr" ? "Visite" : "Schedule"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── VACCINATION CALENDAR ────────────────────────────────────────────────
const CalendarScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allEvents, setAllEvents] = React.useState([]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listAnimals(), api.listTreatments(), api.listReproductionEvents(), api.listVaccinations()])
      .then(([animals, trs, repro, vaccs]) => {
        if (cancel) return;
        const aMap = new Map((animals || []).map((a) => [a.id, a]));
        const today = new Date().toISOString().slice(0, 10);
        const events = [];
        (vaccs || []).forEach((v) => {
          events.push({
            id: `v-${v.id}`, species: v.species,
            vaccine: v.vaccine, target: v.target, n: v.animalCount,
            due: String(v.dueDate).slice(0, 10), status: v.status || "scheduled",
          });
        });
        (trs || []).forEach((t) => {
          if (t.endDate && t.endDate >= today) {
            const a = aMap.get(t.animalId);
            events.push({
              id: `tr-end-${t.id}`, species: a?.species || "cow",
              vaccine: (lang === "fr" ? "Fin traitement · " : "Treatment end · ") + (t.medicineName || ""),
              target: a?.name || a?.externalId || "—", n: 1,
              due: t.endDate, status: "scheduled",
            });
          }
        });
        (repro || []).forEach((e) => {
          const due = e.expectedDueDate;
          if (due && due >= today) {
            const a = aMap.get(e.animalId);
            events.push({
              id: `repro-${e.id}`, species: a?.species || "cow",
              vaccine: (lang === "fr" ? "Mise bas attendue · " : "Birthing due · ") + (a?.name || a?.externalId || "—"),
              target: a?.name || "—", n: 1,
              due, status: "scheduled",
            });
          }
        });
        setAllEvents(events);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [lang]);
  const filtered = allEvents.filter(v => !speciesFilter || v.species === speciesFilter);
  // Build a month grid
  const days = Array.from({ length: 35 }, (_, i) => i - 4); // May 2026 starting Fri = day 1 on col 5
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Vaccination · Vaccines" : "Vaccines · Vaccination"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Calendrier vaccinal, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>mai 2026</span></> : <>Vaccination calendar, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>May 2026</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-cal)", gap: 16 }}>
        {/* Month grid */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-1)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn btn-sm btn-ghost"><Icon name="chevLeft" size={13} color="var(--ink-700)"/></button>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Mai 2026" : "May 2026"}</h3>
              <button className="btn btn-sm btn-ghost"><Icon name="chevRight" size={13} color="var(--ink-700)"/></button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn btn-sm" style={{ background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" }}>{lang === "fr" ? "Mois" : "Month"}</button>
              <button className="btn btn-sm">{lang === "fr" ? "Semaine" : "Week"}</button>
              <button className="btn btn-sm">{lang === "fr" ? "Liste" : "List"}</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border-1)" }}>
            {[lang==="fr"?"Lun":"Mon", lang==="fr"?"Mar":"Tue", lang==="fr"?"Mer":"Wed", lang==="fr"?"Jeu":"Thu", lang==="fr"?"Ven":"Fri", lang==="fr"?"Sam":"Sat", lang==="fr"?"Dim":"Sun"].map((d) => (
              <div key={d} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 600, color: "var(--fg-2)", letterSpacing: "0.1em", textTransform: "uppercase", borderRight: "1px solid var(--border-1)" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "100px" }}>
            {days.map((d, i) => {
              const day = d + 1;
              const inMonth = day >= 1 && day <= 31;
              const isToday = day === 26;
              const dayVacc = filtered.filter(v => parseInt(v.due.split("-")[2]) === day && v.due.startsWith("2026-05"));
              return (
                <div key={i} style={{
                  borderRight: (i % 7) < 6 ? "1px solid var(--border-1)" : "none",
                  borderBottom: i < days.length - 7 ? "1px solid var(--border-1)" : "none",
                  padding: 6, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden",
                  background: isToday ? "rgba(122,31,43,0.04)" : "transparent",
                  opacity: inMonth ? 1 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 11, color: isToday ? "var(--oxblood-700)" : "var(--ink-700)", fontWeight: isToday ? 600 : 400 }}>{inMonth ? day : (day < 1 ? 30 + day : day - 31)}</span>
                    {isToday && <span style={{ fontSize: 9, fontWeight: 600, color: "var(--oxblood-700)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{lang === "fr" ? "Auj." : "Today"}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayVacc.slice(0, 2).map((v) => {
                      const sp = speciesById(v.species);
                      return (
                        <div key={v.id} style={{
                          fontSize: 10.5, padding: "2px 5px", borderRadius: 4,
                          background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", gap: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          <AnimalGlyph kind={sp.glyph} size={10} color="currentColor"/>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{v.vaccine}</span>
                        </div>
                      );
                    })}
                    {dayVacc.length > 2 && <span style={{ fontSize: 10, color: "var(--fg-3)" }}>+{dayVacc.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side: legend + overdue */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Vaccins en retard" : "Overdue vaccines"}</div>
            {allEvents.filter(v => v.status === "overdue").map((v) => {
              const sp = speciesById(v.species);
              return (
                <div key={v.id} className="pulse-critical" style={{ background: "var(--critical-bg)", border: "1px solid var(--rust-300)", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="alert" size={14} color="var(--rust-700)"/>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--rust-900)" }}>{v.vaccine}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 6 }}>{v.target} · {v.n} {lang === "fr" ? "animaux" : "animals"}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--rust-700)", marginTop: 4 }}>{lang === "fr" ? "Échéance " : "Due "}{v.due}</div>
                  <button className="btn btn-sm btn-primary" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "health" }))}>{lang === "fr" ? "Programmer maintenant" : "Schedule now"}</button>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Vaccins obligatoires · Québec" : "Mandatory vaccines · Québec"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "Rage · Bovins", freq: "Annuel", icon: "syringe" },
                { name: "Brucellose", freq: "Génisses 4–12 mois", icon: "syringe" },
                { name: "Tuberculose · test", freq: "Annuel", icon: "flask" },
                { name: "Grippe aviaire H5", freq: "Programme MAPAQ", icon: "shield" },
              ].map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 3 ? "1px dashed var(--border-1)" : "none" }}>
                  <Icon name={v.icon} size={13} color="var(--ink-500)"/>
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-800)" }}>{v.name}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{v.freq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── STOCK & FEED ────────────────────────────────────────────────────────
const StockScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [stock, setStock] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancel = false;
    api.listMedicines()
      .then((rows) => {
        if (cancel) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(adaptMedicine);
        setStock(mapped);
      })
      .catch((e) => console.warn("listMedicines failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:expense-created", onCreated);
    return () => window.removeEventListener("farmos:expense-created", onCreated);
  }, []);
  // Backend medicines don't carry per-species mapping yet, so species filter is bypassed for now.
  const filteredFeed = stock.filter(s => s.kind === "feed" && (!speciesFilter || (s.species || []).includes(speciesFilter) || (s.species || []).length === 0));
  const filteredMed = stock.filter(s => s.kind === "med" && (!speciesFilter || (s.species || []).includes(speciesFilter) || (s.species || []).length === 0));
  const STOCK = stock;

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Stock · Inventory" : "Inventory · Stock"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Stock & alimentation, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>magasin central</span></> : <>Stock & feed, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>central storage</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Stock aliment" : "Feed stock"} value={`${(filteredFeed.reduce((a,b)=>a+b.qty,0)/1000).toFixed(1)} t`} delta={-2.4} trend={[10, 9.8, 9.6, 9.4, 9.2, 9.0, 8.8, 8.6, 8.4, 8.2, 8.0, 8.06]} icon="wheat" accent="var(--health-500)"/>
        <KpiCard label={lang === "fr" ? "Médicaments" : "Medicines"} value={filteredMed.length} unit="réf." trend={[18, 18, 19, 19, 18, 18, 17, 17, 17, 16, filteredMed.length, filteredMed.length]} icon="pill"/>
        <KpiCard label={lang === "fr" ? "Stock faible" : "Low stock"} value={STOCK.filter(s => s.lowStock).length} unit="" icon="alert" accent="var(--rust-700)" trend={[1,1,2,2,2,2,2,2,2,2,2,2]}/>
        <KpiCard label={lang === "fr" ? "Coût alimentation · mois" : "Feed cost · month"} value="—" unit="$" trend={[0,0,0,0,0,0,0,0,0,0,0,0]} icon="coins" accent="var(--money-500)"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 16 }}>
        <StockTable lang={lang} kind="feed" items={filteredFeed} title={lang === "fr" ? "Aliments" : "Feed"} accent="var(--health-500)"/>
        <StockTable lang={lang} kind="med" items={filteredMed} title={lang === "fr" ? "Médicaments" : "Medicines"} accent="var(--oxblood-700)"/>
      </div>

      {/* AI feed prediction */}
      <div className="card rule-lines" style={{ background: "var(--parchment-50)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ink-900)", color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="sparkle" size={15} color="#D7AA45"/>
          </div>
          <div className="bilang">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Prédiction des besoins · 14 j" : "Needs forecast · 14 d"}</h3>
            <span className="sec">{lang === "fr" ? "IA — consommation moyenne par espèce" : "AI — average consumption by species"}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
          {[
            { species: "cow", item: "Granulé vache 18 %", needed: "1 850 kg", confidence: 92 },
            { species: "pig", item: "Aliment porc engr.", needed: "2 400 kg", confidence: 88, urgent: true },
            { species: "chicken", item: "Aliment ponte", needed: "920 kg", confidence: 91 },
            { species: "fish", item: "Granulé truite", needed: "180 kg", confidence: 79 },
          ].map((p, i) => {
            const sp = speciesById(p.species);
            return (
              <div key={i} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <AnimalGlyph kind={sp.glyph} size={16} color={sp.accent}/>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? sp.fr : sp.en}</span>
                  {p.urgent && <span className="tag tag-danger" style={{ marginLeft: "auto", fontSize: 10 }}>{lang === "fr" ? "Urgent" : "Urgent"}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{p.item}</div>
                <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-950)", letterSpacing: "-0.01em", marginTop: 4 }}>{p.needed}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>confiance {p.confidence}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StockTable = ({ lang, kind, items, title, accent }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{title}</h3>
      <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "stock" }))}><Icon name="plus" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Entrée" : "Entry"}</button>
    </div>
    {items.map((s, i) => {
      const pct = Math.min(100, (s.qty / (s.min * 3)) * 100);
      const low = s.qty < s.min;
      return (
        <div key={s.id} style={{ padding: "12px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border-1)" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{s.id} · {s.supplier}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span className="tnum serif" style={{ fontSize: 18, fontWeight: 500, color: low ? "var(--rust-700)" : "var(--ink-950)" }}>{s.qty.toLocaleString("fr-CA")}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 3 }}>{s.unit}</span>
              <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>min {s.min} · exp {s.expiry}</div>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--ink-100)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: low ? "var(--rust-700)" : accent, transition: "width 200ms" }}/>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(s.min / (s.min * 3)) * 100}%`, width: 1, background: "var(--ink-400)" }}/>
          </div>
          {low && <div style={{ fontSize: 11, color: "var(--rust-700)", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="alert" size={11} color="var(--rust-700)"/>
            {lang === "fr" ? "Stock sous le seuil minimum — commande recommandée" : "Below minimum threshold — order recommended"}
          </div>}
        </div>
      );
    })}
  </div>
);

// ─── REPRODUCTION ────────────────────────────────────────────────────────
const ReproScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allGestations, setAllGestations] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listReproductionEvents(), api.listAnimals()])
      .then(([evs, animals]) => {
        if (cancel) return;
        const aMap = new Map((Array.isArray(animals) ? animals : []).map((a) => [a.id, a]));
        const mapped = (Array.isArray(evs) ? evs : []).map((e) => adaptReproEvent(e, aMap));
        setAllGestations(mapped);
      })
      .catch((e) => console.warn("listReproductionEvents failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:repro-created", onCreated);
    return () => window.removeEventListener("farmos:repro-created", onCreated);
  }, []);
  const gestations = allGestations.filter(g => !speciesFilter || g.species === speciesFilter);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Reproduction · Repro" : "Reproduction · Reproduction"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Reproduction, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>cycles & gestations</span></> : <>Reproduction, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>cycles & gestations</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Gestations actives" : "Active gestations"} value={gestations.filter(g=>!g.complete).length} icon="fingerprint" accent="var(--pertinence-700)" trend={[14,15,16,16,17,17,18,18,17,17,16,16]}/>
        <KpiCard label={lang === "fr" ? "Chaleurs détectées · sem." : "Heats detected · week"} value="24" delta={18} icon="pulse" accent="var(--oxblood-700)" trend={[12,14,15,17,18,20,21,22,23,24,24,24]}/>
        <KpiCard label={lang === "fr" ? "Taux fertilité" : "Fertility rate"} value="78" unit="%" delta={3} icon="chart" accent="var(--solidite-500)" trend={[68, 70, 72, 71, 73, 74, 75, 76, 77, 77, 78, 78]}/>
        <KpiCard label={lang === "fr" ? "Mises bas · 30 j" : "Births · 30 d"} value="42" delta={8} icon="sparkle" trend={[28,30,32,34,36,38,38,40,40,41,42,42]}/>
      </div>

      {/* Gestation timeline */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="bilang">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Gestations en cours" : "Active gestations"}</h3>
            <span className="sec">{lang === "fr" ? "timeline" : "timeline"}</span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "repro" }))}><Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Saillie / IA" : "Mating / AI"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {gestations.map((g) => {
            const sp = speciesById(g.species);
            const pct = (g.day / g.total) * 100;
            return (
              <div key={g.id} style={{ display: "grid", gridTemplateColumns: "32px 160px 1fr 120px 32px", gap: 14, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AnimalGlyph kind={sp.glyph} size={16} color="currentColor"/>
                </div>
                <div>
                  <div className="italic-serif" style={{ fontSize: 15, color: "var(--ink-950)" }}>{g.animal}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{g.ai}</div>
                </div>
                <div>
                  <div style={{ height: 8, background: "var(--ink-100)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: g.complete ? "var(--sage-500)" : g.soon ? "var(--rust-700)" : sp.accent, transition: "width 200ms" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--fg-3)" }} className="mono">
                    <span>J{g.day} / {g.total}</span>
                    <span>{g.start}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {g.complete ? (
                    <span className="tag" style={{ background: "var(--solidite-50)", color: "var(--solidite-900)" }}>{lang === "fr" ? "Mise bas ✓" : "Birthed ✓"}</span>
                  ) : g.soon ? (
                    <>
                      <span className="tag tag-danger" style={{ fontSize: 11 }}>{lang === "fr" ? "Imminent" : "Imminent"}</span>
                      <div className="mono" style={{ fontSize: 11, color: "var(--rust-700)", marginTop: 4 }}>{g.due}</div>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-800)" }}>{Math.round(g.total - g.day)} j</span>
                      <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{g.due}</div>
                    </>
                  )}
                </div>
                {g._pk ? (
                  <button className="btn btn-sm btn-ghost" title={lang === "fr" ? "Supprimer" : "Delete"}
                    onClick={async () => {
                      if (!window.confirm(lang === "fr" ? `Supprimer l'événement ${g.animal} ?` : `Delete event ${g.animal}?`)) return;
                      try { await api.deleteReproductionEvent(g._pk); window.dispatchEvent(new CustomEvent("farmos:repro-created")); } catch (e) { window.alert(e.message); }
                    }}>
                    <Icon name="trash" size={13} color="var(--oxblood-700)"/>
                  </button>
                ) : <span/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heat detection chart */}
      <div className="card">
        <div className="bilang" style={{ marginBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Détection des chaleurs · 14 jours" : "Heat detection · 14 days"}</h3>
          <span className="sec">{lang === "fr" ? "podomètres + IA" : "pedometers + AI"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 4, alignItems: "end", height: 100 }}>
          {[2, 3, 2, 4, 5, 3, 4, 6, 5, 7, 8, 6, 5, 4].map((v, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: `${v * 10}px`, background: i >= 11 ? "var(--oxblood-700)" : "var(--pertinence-500)", borderRadius: "2px 2px 0 0" }}/>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{13 - i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── PRODUCTION ──────────────────────────────────────────────────────────
const ProductionScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [logs, setLogs] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancel = false;
    api.listProductionLogs()
      .then((rows) => { if (!cancel && Array.isArray(rows)) setLogs(rows); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [reloadKey]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:production-created", onCreated);
    return () => window.removeEventListener("farmos:production-created", onCreated);
  }, []);
  const filteredLogs = logs.filter((l) => !speciesFilter || l.species === speciesFilter).slice(0, 12);
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Production · Output" : "Output · Production"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Production journalière, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>lait, œufs, croissance</span></> : <>Daily production, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>milk, eggs, growth</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Lait · aujourd'hui" : "Milk · today"} value="5 412" unit="L" delta={2.4} icon="droplet" accent="var(--pertinence-500)" trend={SPECIES[0].productTrend}/>
        <KpiCard label={lang === "fr" ? "Œufs · aujourd'hui" : "Eggs · today"} value="16 248" unit="" delta={1.2} icon="egg" accent="var(--autorite-500)" trend={SPECIES[2].productTrend.map(v => v/1000)}/>
        <KpiCard label={lang === "fr" ? "GMQ porcs" : "Pig ADG"} value="856" unit="g/j" delta={3.2} icon="weight" accent="var(--oxblood-700)" trend={SPECIES[1].productTrend}/>
        <KpiCard label={lang === "fr" ? "Biomasse poisson" : "Fish biomass"} value="9 820" unit="kg" delta={4.1} icon="fish" accent="var(--pertinence-700)" trend={SPECIES[3].productTrend.map(v => v/100)}/>
      </div>

      {/* Per-species production cards */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 16 }}>
        {SPECIES.filter(s => !speciesFilter || s.id === speciesFilter).slice(0, 6).map((s) => (
          <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.accentBg, color: s.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AnimalGlyph kind={s.glyph} size={20} color="currentColor"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{s.count.toLocaleString("fr-CA")} {s.countingUnit}</div>
              </div>
              <FarmScore sante={84} prod={92} finance={78} size="sm"/>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="serif tnum" style={{ fontSize: 30, fontWeight: 500, color: "var(--ink-950)", letterSpacing: "-0.02em" }}>{s.productValue}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.productUnit}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--solidite-700)", marginLeft: "auto" }}>+{((s.productTrend[s.productTrend.length-1] - s.productTrend[0]) / s.productTrend[0] * 100).toFixed(1)}%</span>
            </div>
            <Sparkline data={s.productTrend} color={s.accent} height={48}/>
          </div>
        ))}
      </div>

      {filteredLogs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Derniers enregistrements" : "Recent records"}</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{filteredLogs.length}</span>
          </div>
          {filteredLogs.map((l, i) => {
            const sp = speciesById(l.species);
            return (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "70px 32px 1fr 90px 70px", gap: 14, padding: "10px 18px", alignItems: "center", borderBottom: i < filteredLogs.length - 1 ? "1px solid var(--border-1)" : "none" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(l.logDate || l.log_date || "").slice(0, 10)}</span>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: sp?.accentBg, color: sp?.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AnimalGlyph kind={sp?.glyph} size={12} color="currentColor"/>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink-900)", fontWeight: 500 }}>{l.productType || l.product_type} {l.period ? `· ${l.period}` : ""}</div>
                  {l.notes && <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{l.notes}</div>}
                </div>
                <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{Number(l.quantity).toLocaleString("fr-CA")}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{l.unit || ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── ALERTS ──────────────────────────────────────────────────────────────
function deriveAlerts(animals, medicines, treatments, repro, diseases, lang) {
  const out = [];
  const aMap = new Map(animals.map((a) => [a.id, a]));
  const dMap = new Map(diseases.map((d) => [d.id, d]));
  // Low stock
  medicines.forEach((m) => {
    const qty = Number(m.quantity);
    const min = m.minQuantity != null ? Number(m.minQuantity) : null;
    if (min != null && qty < min) {
      out.push({
        id: `low-${m.id}`, kind: "stock", severity: qty < min / 2 ? "critical" : "high",
        animal: m.name, animalId: m.kind === "feed" ? "Aliment" : "Médicament",
        species: null, title: lang === "fr" ? `Stock faible · ${m.name}` : `Low stock · ${m.name}`,
        subtitle: `${qty} ${m.unit || ""} restant · seuil ${min}`, date: "—", icon: "wheat",
      });
    }
  });
  // Active treatments with future withdrawal
  const today = new Date().toISOString().slice(0, 10);
  treatments.forEach((t) => {
    const animal = aMap.get(t.animalId);
    const disease = dMap.get(t.diseaseId);
    const milkH = t.withdrawalMilkHours;
    const meat = t.withdrawalMeatDays;
    const eggs = t.withdrawalEggsDays;
    const end = t.endDate;
    const wd = milkH || meat || eggs;
    if (t.status === "running" && wd && end && end >= today) {
      out.push({
        id: `wd-${t.id}`, kind: "withdrawal", severity: "critical",
        animal: animal?.name || animal?.externalId || "—",
        animalId: animal?.externalId || `#${animal?.id}`,
        species: animal?.species, title: lang === "fr" ? "Délai de retrait actif" : "Withdrawal active",
        subtitle: `${t.medicineName || disease?.nameFr || "Traitement"}${milkH ? ` · lait ${Math.round(milkH/24)} j` : ""}${meat ? ` · viande ${meat} j` : ""}${eggs ? ` · œufs ${eggs} j` : ""}`,
        date: end, icon: "shield",
      });
    }
  });
  // Imminent gestations (no due date check possible without a calc)
  const GESTATION = { cow: 283, pig: 114, goat: 152, sheep: 152, rabbit: 31, duck: 28, turkey: 28, chicken: 21, fish: 30 };
  repro.forEach((e) => {
    const animal = aMap.get(e.animalId);
    if (!animal) return;
    const total = GESTATION[animal.species] || 0;
    if (!total || e.outcome === "success" || e.eventType === "birthing") return;
    const start = new Date(e.eventDate);
    const day = Math.round((Date.now() - start.getTime()) / 86400000);
    if (day >= total * 0.92 && day <= total + 7) {
      out.push({
        id: `repro-${e.id}`, kind: "repro", severity: "high",
        animal: animal.name || animal.externalId || "—",
        animalId: animal.externalId || `#${animal.id}`,
        species: animal.species,
        title: lang === "fr" ? "Mise bas imminente" : "Imminent birthing",
        subtitle: `J${day}/${total} · ${e.expectedDueDate || "—"}`,
        date: e.expectedDueDate || "—", icon: "calendar",
      });
    }
  });
  return out;
}

const AlertsScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [liveAlerts, setLiveAlerts] = React.useState(null);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([
      api.listAnimals(), api.listMedicines(), api.listTreatments(),
      api.listReproductionEvents(), api.listDiseases(),
    ])
      .then(([a, m, t, r, d]) => {
        if (cancel) return;
        const all = [a, m, t, r, d].every((x) => Array.isArray(x));
        if (all) setLiveAlerts(deriveAlerts(a, m, t, r, d, lang));
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [lang]);
  const source = liveAlerts || [];
  const [tab, setTab] = React.useState("all");
  const speciesFiltered = source.filter(a => !speciesFilter || a.species === speciesFilter);
  const filtered = speciesFiltered.filter(a => tab === "all" ? true : tab === "withdrawal" ? a.kind === "withdrawal" : a.severity === tab);
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Alertes · Alerts" : "Alerts · Alertes"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Alertes intelligentes, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length} actives</span></> : <>Smart alerts, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length} active</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "flex", gap: 8 }}>
        {[
          { id: "all", fr: "Toutes", en: "All", count: speciesFiltered.length },
          { id: "critical", fr: "Critique", en: "Critical", count: speciesFiltered.filter(a=>a.severity==="critical").length, color: "var(--rust-700)" },
          { id: "high", fr: "Élevée", en: "High", count: speciesFiltered.filter(a=>a.severity==="high").length, color: "var(--autorite-500)" },
          { id: "medium", fr: "Moyenne", en: "Medium", count: speciesFiltered.filter(a=>a.severity==="medium").length, color: "var(--pertinence-500)" },
          { id: "withdrawal", fr: "Délai retrait", en: "Withdrawal", count: speciesFiltered.filter(a=>a.kind==="withdrawal").length, color: "var(--rust-700)" },
        ].map((tb) => (
          <button key={tb.id} className="btn btn-sm" onClick={() => setTab(tb.id)}
            style={tab === tb.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
            {tb.color && <span style={{ width: 6, height: 6, borderRadius: 999, background: tb.color }}/>}
            {lang === "fr" ? tb.fr : tb.en}
            <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{tb.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((a) => {
          const sp = speciesById(a.species) || { glyph: null, fr: "—", en: "—" };
          const sevColor = a.severity === "critical" ? "var(--rust-700)" : a.severity === "high" ? "var(--wheat-500)" : "var(--sky-500)";
          const isCritical = a.kind === "withdrawal" || a.severity === "critical";
          return (
            <div key={a.id} className={isCritical ? "withdrawal-banner" : "card"} style={{ display: "flex", gap: 16, alignItems: "stretch", padding: "16px 20px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: isCritical ? "rgba(255,255,255,0.12)" : a.kind === "env" ? "var(--pertinence-50)" : "var(--autorite-50)", color: isCritical ? "var(--parchment-50)" : sevColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
                <Icon name={a.icon} size={20} color="currentColor"/>
              </div>
              <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: isCritical ? "var(--parchment-50)" : "var(--ink-950)", letterSpacing: "-0.01em" }}>{a.title}</h4>
                  <span className="italic-serif" style={{ fontSize: 14, color: isCritical ? "#F0D6CB" : "var(--ink-700)" }}>{a.animal}</span>
                  <span className="mono" style={{ fontSize: 11, color: isCritical ? "#F0D6CB" : "var(--fg-3)" }}>{a.animalId}</span>
                </div>
                <div style={{ fontSize: 13, color: isCritical ? "#F0D6CB" : "var(--ink-700)", marginTop: 4 }}>{a.subtitle}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 11, color: isCritical ? "rgba(251,248,242,0.7)" : "var(--fg-3)" }}>{a.date}</span>
                  <span style={{ fontSize: 11, color: isCritical ? "rgba(251,248,242,0.7)" : "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <AnimalGlyph kind={sp.glyph} size={11} color={isCritical ? "#F0D6CB" : "var(--fg-3)"}/>
                    {lang === "fr" ? sp.fr : sp.en}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0, position: "relative", zIndex: 1 }}>
                <span className="tag" style={{
                  background: isCritical ? "rgba(255,255,255,0.18)" : a.severity === "critical" ? "var(--rust-50)" : a.severity === "high" ? "var(--wheat-50)" : "var(--sky-50)",
                  color: isCritical ? "var(--bone-50)" : a.severity === "critical" ? "var(--rust-900)" : a.severity === "high" ? "var(--wheat-900)" : "var(--sky-900)",
                  fontWeight: 600,
                }}>
                  {a.severity}
                </span>
                <button className="btn btn-sm" style={isCritical ? { background: "rgba(255,255,255,0.15)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.2)" } : {}}>{lang === "fr" ? "Voir" : "View"}<Icon name="arrowRight" size={11} color={isCritical ? "#ECF1EC" : "var(--ink-700)"}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── FINANCES ────────────────────────────────────────────────────────────
const FinancesScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [summary, setSummary] = React.useState({ months: [], revenue: [], expense: [], byCategory: [] });
  const totalRev = summary.byCategory.reduce((a,b)=>a+b.amount,0);
  const [transactions, setTransactions] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listSales(), api.listExpenses(), api.getFinanceSummary()])
      .then(([sales, expenses, sumry]) => {
        if (cancel) return;
        const merged = [
          ...(Array.isArray(sales) ? sales : []).map((s) => adaptSaleAsTransaction(s, lang)),
          ...(Array.isArray(expenses) ? expenses : []).map((e) => adaptExpenseAsTransaction(e, lang)),
        ].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
        setTransactions(merged.slice(0, 12));
        if (sumry && typeof sumry === "object") setSummary(sumry);
      })
      .catch((e) => console.warn("listSales/Expenses failed:", e.message));
    return () => { cancel = true; };
  }, [lang, reloadKey]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:expense-created", onCreated);
    window.addEventListener("farmos:sale-created", onCreated);
    return () => {
      window.removeEventListener("farmos:expense-created", onCreated);
      window.removeEventListener("farmos:sale-created", onCreated);
    };
  }, []);
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Finances · Finances" : "Finances · Finances"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Finances de la ferme, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>mai 2026</span></> : <>Farm finances, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>May 2026</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {(() => {
          const totalR = summary.revenue.reduce((a, b) => a + b, 0);
          const totalE = summary.expense.reduce((a, b) => a + b, 0);
          const profit = totalR - totalE;
          const margin = totalR > 0 ? (profit / totalR) * 100 : 0;
          return <>
            <KpiCard label={t(lang, "revenue")} value={totalR.toLocaleString("fr-CA")} unit="$" trend={summary.revenue.length ? summary.revenue : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="coins" accent="var(--money-500)"/>
            <KpiCard label={t(lang, "expense")} value={totalE.toLocaleString("fr-CA")} unit="$" trend={summary.expense.length ? summary.expense : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="wallet"/>
            <KpiCard label={t(lang, "profit")} value={profit.toLocaleString("fr-CA")} unit="$" trend={summary.revenue.length ? summary.revenue.map((v, i) => v - (summary.expense[i] || 0)) : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="chart" accent="var(--money-500)"/>
            <KpiCard label={t(lang, "margin")} value={margin.toFixed(1).replace(".", ",")} unit="%" trend={[margin,margin,margin,margin,margin,margin,margin,margin,margin,margin,margin,margin]} icon="chartPie" accent="var(--money-500)"/>
          </>;
        })()}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-15)", gap: 16 }}>
        <div className="card">
          <div className="bilang" style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20 }}>{lang === "fr" ? "Revenus vs dépenses · 12 mois" : "Revenue vs expenses · 12 months"}</h3>
            <span className="sec">{lang === "fr" ? "en milliers $" : "in thousands $"}</span>
          </div>
          <RevExpChart lang={lang} summary={summary}/>
        </div>
        <div className="card">
          <div className="bilang" style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20 }}>{lang === "fr" ? "Sources de revenus" : "Revenue sources"}</h3>
            <span className="sec">{totalRev.toLocaleString("fr-CA")} $</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.byCategory.map((c, i) => {
              const pct = (c.amount / totalRev) * 100;
              return (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--ink-800)", fontWeight: 500 }}>{lang === "fr" ? c.fr : c.en}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-900)" }}>{c.amount.toLocaleString("fr-CA")} $ · {pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Transactions récentes" : "Recent transactions"}</h3>
          <button className="btn btn-sm"><Icon name="download" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Exporter" : "Export"}</button>
        </div>
        {transactions.map((tr, i) => (
          <div key={tr.id || i} style={{
            display: "grid", gridTemplateColumns: "70px 32px 1fr 110px 100px", gap: 14, padding: "12px 18px", alignItems: "center",
            borderBottom: i < transactions.length - 1 ? "1px solid var(--border-1)" : "none",
          }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{tr.date}</span>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: tr.kind === "rev" ? "var(--solidite-50)" : "var(--oxblood-50)", color: tr.kind === "rev" ? "var(--solidite-700)" : "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={tr.kind === "rev" ? "arrowDown" : "arrowUp"} size={12} color="currentColor"/>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink-900)", fontWeight: 500 }}>{tr.label}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <span className="tag" style={{ fontSize: 10 }}>{tr.category}</span>
                {tr.species && speciesById(tr.species) && (
                  <span className="tag" style={{ background: speciesById(tr.species).accentBg, color: speciesById(tr.species).accent, fontSize: 10 }}>
                    <AnimalGlyph kind={speciesById(tr.species).glyph} size={10} color="currentColor"/>
                    {lang === "fr" ? speciesById(tr.species).fr : speciesById(tr.species).en}
                  </span>
                )}
              </div>
            </div>
            <span className="mono tnum" style={{ fontSize: 14, fontWeight: 600, color: tr.kind === "rev" ? "var(--solidite-700)" : "var(--oxblood-700)", textAlign: "right" }}>{tr.amount} $</span>
            {tr._pk && tr._kind ? (
              <button className="btn btn-sm btn-ghost" style={{ justifySelf: "end" }} title={lang === "fr" ? "Supprimer" : "Delete"}
                onClick={async () => {
                  if (!window.confirm(lang === "fr" ? `Supprimer cette transaction ?` : `Delete this transaction?`)) return;
                  try {
                    if (tr._kind === "sale") await api.deleteSale(tr._pk);
                    else if (tr._kind === "expense") await api.deleteExpense(tr._pk);
                    window.dispatchEvent(new CustomEvent(tr._kind === "sale" ? "farmos:sale-created" : "farmos:expense-created"));
                  } catch (e) { window.alert(e.message); }
                }}>
                <Icon name="trash" size={13} color="var(--oxblood-700)"/>
              </button>
            ) : <button className="btn btn-sm btn-ghost" style={{ justifySelf: "end" }}><Icon name="moreH" size={13} color="var(--ink-600)"/></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

const RevExpChart = ({ lang, summary }) => {
  const W = 720, H = 200, PAD_L = 32, PAD_B = 24, PAD_R = 12, PAD_T = 8;
  const SHORT = lang === "fr" ? ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = (summary?.months || []).map((m) => { const i = Number(m.slice(5, 7)) - 1; return SHORT[i] || m; });
  const rev = summary?.revenue || [];
  const exp = summary?.expense || [];
  const max = Math.max(1, ...rev, ...exp) * 1.1;
  const bw = (W - PAD_L - PAD_R) / Math.max(1, rev.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
      {[0, 0.5, 1].map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W-PAD_R} y1={PAD_T + (H-PAD_T-PAD_B)*g} y2={PAD_T + (H-PAD_T-PAD_B)*g} stroke="var(--border-1)" strokeDasharray="2 4"/>
          <text x={PAD_L - 6} y={PAD_T + (H-PAD_T-PAD_B)*g + 4} textAnchor="end" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{Math.round((1-g) * max)}</text>
        </g>
      ))}
      {rev.map((r, i) => {
        const e = exp[i] || 0;
        const x = PAD_L + i * bw + bw * 0.15;
        const hR = (r / max) * (H - PAD_T - PAD_B);
        const hE = (e / max) * (H - PAD_T - PAD_B);
        return (
          <g key={i}>
            <rect x={x} y={H - PAD_B - hR} width={bw * 0.32} height={hR} fill="var(--solidite-500)" rx="2"/>
            <rect x={x + bw * 0.38} y={H - PAD_B - hE} width={bw * 0.32} height={hE} fill="var(--oxblood-500)" rx="2"/>
            <text x={x + bw * 0.35} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{months[i]}</text>
          </g>
        );
      })}
      {/* legend */}
      <g transform={`translate(${W - 200}, 0)`}>
        <rect x="0" y="2" width="10" height="10" fill="var(--solidite-500)" rx="2"/>
        <text x="14" y="11" fontSize="11" fill="var(--ink-700)" fontFamily="var(--font-sans)">{lang === "fr" ? "Revenus" : "Revenue"}</text>
        <rect x="80" y="2" width="10" height="10" fill="var(--oxblood-500)" rx="2"/>
        <text x="94" y="11" fontSize="11" fill="var(--ink-700)" fontFamily="var(--font-sans)">{lang === "fr" ? "Dépenses" : "Expenses"}</text>
      </g>
    </svg>
  );
};

// ─── REPORTS ─────────────────────────────────────────────────────────────
const ReportsScreen = ({ lang }) => {
  const reports = [
    { fr: "Rapport sanitaire mensuel", en: "Monthly health report", icon: "pulse", color: "var(--health-500)", date: "26 mai 2026", size: "12 p." },
    { fr: "Production laitière · trimestre", en: "Milk production · quarter", icon: "droplet", color: "var(--pertinence-500)", date: "1ᵉʳ avril 2026", size: "18 p." },
    { fr: "Bilan reproduction Q1", en: "Q1 reproduction report", icon: "fingerprint", color: "var(--oxblood-500)", date: "31 mars 2026", size: "9 p." },
    { fr: "Mortalité par espèce", en: "Mortality by species", icon: "activity", color: "var(--oxblood-700)", date: "20 mai 2026", size: "6 p." },
    { fr: "Bilan financier mensuel", en: "Monthly financial report", icon: "coins", color: "var(--money-500)", date: "1ᵉʳ mai 2026", size: "14 p." },
    { fr: "Consommation alimentaire", en: "Feed consumption", icon: "wheat", color: "var(--autorite-700)", date: "25 mai 2026", size: "8 p." },
    { fr: "Inventaire médicaments", en: "Medicine inventory", icon: "pill", color: "var(--health-500)", date: "20 mai 2026", size: "11 p." },
    { fr: "Traçabilité MAPAQ", en: "MAPAQ traceability", icon: "shield", color: "var(--ink-700)", date: "Trimestriel", size: "—" },
  ];
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Rapports · Reports" : "Reports · Rapports"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Rapports & analytics, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>bibliothèque</span></> : <>Reports & analytics, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>library</span></>}
        </h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {reports.map((r, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in oklch, ${r.color} 12%, transparent)`, color: r.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Icon name={r.icon} size={18} color="currentColor"/>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16,  color: "var(--ink-950)", fontWeight: 500, lineHeight: 1.25 }}>{lang === "fr" ? r.fr : r.en}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>{r.date} · {r.size}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}><Icon name="download" size={11} color="var(--ink-700)"/>PDF</button>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}><Icon name="download" size={11} color="var(--ink-700)"/>Excel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── EMPLOYEES (équipe FarmOS depuis RH du CRM) ──────────────────────────
const EmployeesScreen = ({ lang }) => {
  const [staff, setStaff] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");

  const reload = React.useCallback(() => {
    setLoading(true);
    api.listFarmosStaff().then((rows) => { setStaff(Array.isArray(rows) ? rows : []); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`;
  const initials = (u) => fullName(u).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const onLeave = (u) => u.leaveDate && new Date(u.leaveDate) <= new Date();

  const roles = Array.from(new Set(staff.map((u) => u.designation).filter(Boolean))).sort();
  const q = search.trim().toLowerCase();
  const filtered = staff.filter((u) => {
    if (roleFilter && u.designation !== roleFilter) return false;
    if (!q) return true;
    return fullName(u).toLowerCase().includes(q)
      || (u.designation || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q);
  });

  const ROLE_COLOR = {
    "Vétérinaire": "var(--solidite-500)",
    "Gérant ferme": "var(--clay-700)",
    "Technicien agricole": "var(--pertinence-500)",
    "Éleveur": "var(--oxblood-500)",
  };
  const colorFor = (role) => ROLE_COLOR[role] || "var(--ink-700)";

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Équipe · Team" : "Team · Équipe"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em" }}>
            {lang === "fr"
              ? <>Employés ferme, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>gérés depuis le RH du CRM</span></>
              : <>Farm staff, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>managed in CRM HR</span></>}
          </h1>
        </div>
        <a className="btn btn-primary" href="/admin/employees" target="_blank" rel="noreferrer"
           style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} color="#FBF8F2"/>
          {lang === "fr" ? "Ajouter un employé (RH)" : "Add employee (HR)"}
        </a>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "1 1 240px", maxWidth: 320 }}
          placeholder={lang === "fr" ? "Rechercher un nom, rôle, email…" : "Search name, role, email…"}
          value={search} onChange={(e) => setSearch(e.target.value)}/>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => setRoleFilter("")}
            style={!roleFilter ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
            {lang === "fr" ? "Tous" : "All"} ({staff.length})
          </button>
          {roles.map((r) => (
            <button key={r} className="btn btn-sm" onClick={() => setRoleFilter(r === roleFilter ? "" : r)}
              style={roleFilter === r ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>}
      {err && <div style={{ color: "var(--rust-700)", fontSize: 13 }}>{err}</div>}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="users"
          title={lang === "fr" ? "Aucun employé ferme" : "No farm staff"}
          hint={lang === "fr"
            ? "Crée un département nommé \"FarmOS\" dans le CRM, puis assigne tes employés à ce département."
            : "Create a department named \"FarmOS\" in the CRM, then assign employees to that department."}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-3)", gap: 12 }}>
        {filtered.map((u) => {
          const color = colorFor(u.designation);
          const leave = onLeave(u);
          return (
            <div key={u.id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: color, color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, flexShrink: 0 }}>
                {initials(u)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{fullName(u)}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{u.designation || (lang === "fr" ? "(sans rôle)" : "(no role)")}</div>
                {(u.email || u.phone) && (
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {u.email && <span>📧 {u.email}</span>}
                    {u.phone && <span>📞 {u.phone}</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span className="tag" style={{ background: leave ? "var(--bg-sunken)" : "var(--solidite-50)", color: leave ? "var(--ink-700)" : "var(--solidite-900)" }}>
                    {leave ? (lang === "fr" ? "Inactif" : "Inactive") : (lang === "fr" ? "Actif" : "Active")}
                  </span>
                  {u.department && <span className="tag">{u.department}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SETTINGS (placeholder) ──────────────────────────────────────────────
const SettingsScreen = ({ lang }) => (
  <div style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%" }}>
    <div>
      <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Paramètres · Settings" : "Settings · Paramètres"}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em" }}>
        {lang === "fr" ? <>Paramètres, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>ferme & utilisateurs</span></> : <>Settings, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>farm & users</span></>}
      </h1>
    </div>
    <div style={{ marginTop: 20, maxWidth: 720 }}>
      <EmptyState title={lang === "fr" ? "À configurer" : "To configure"} hint={lang === "fr" ? "Permissions, rôles, sauvegardes, intégrations MAPAQ — disponible à la demande." : "Roles, permissions, backups, MAPAQ integrations — available on request."} icon="settings"/>
    </div>
  </div>
);

export { HealthScreen, CalendarScreen, StockScreen, ReproScreen, ProductionScreen, AlertsScreen, FinancesScreen, ReportsScreen, EmployeesScreen, SettingsScreen };
