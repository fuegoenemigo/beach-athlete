
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { installUpdate, isUpdateAvailable } from "./pwa.js";
import { CloudSync } from "./cloudSync.js";
import { isAthleteData } from "./syncPolicy.js";
import DataSecurity from "./DataSecurity.jsx";
import CloudAccount from "./CloudAccount.jsx";
import TrainingView from "./TrainingView.jsx";
import HomeView from "./HomeView.jsx";
import VolleyballView from "./VolleyballView.jsx";
import { DEFAULT_EXERCISES } from "./volleyballTraining.js";
import { activityDestination } from "./activityHistory.js";
import { adjacentArea, swipeDirection } from "./swipeNavigation.js";
import UIIcon from "./UIIcon.jsx";
import AppChrome from "./AppChrome.jsx";



const damagedStorageKeys = new Set();

function loadStoredArray(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && validate(parsed)) return parsed;
  } catch {
    // Keep the original value in localStorage for manual recovery.
  }
  damagedStorageKeys.add(key);
  return fallback;
}

function loadExerciseLibrary() {
  return loadStoredArray("beach-athlete-exercises", DEFAULT_EXERCISES,
    (items) => isAthleteData({ sessions: [], exerciseLibrary: items, volleyballDays: [] }));
}

const today = () => new Date().toLocaleDateString("sv-SE");
function loadSessions() {
  return loadStoredArray("beach-athlete-diary", [],
    (items) => isAthleteData({ sessions: items, exerciseLibrary: [], volleyballDays: [] }));
}

function loadTrainingPlans() {
  return loadStoredArray("beach-athlete-training-plans", [],
    (items) => isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: [], trainingPlans: items }));
}

function loadVolleyballDays() {
  return loadStoredArray("beach-athlete-volleyball", [],
    (items) => isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: items }));
}

function loadAthleteProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem("beach-athlete-profile"));
    if (stored && typeof stored === "object" && !Array.isArray(stored)
      && (stored.bodyweightKg === "" || stored.bodyweightKg == null
        || (Number.isFinite(Number(stored.bodyweightKg)) && Number(stored.bodyweightKg) > 0))
      && (stored.heightCm === undefined || stored.heightCm === "" || stored.heightCm == null
        || (Number.isFinite(Number(stored.heightCm)) && Number(stored.heightCm) > 0
          && Number(stored.heightCm) <= 300))) {
      return { ...stored, bodyweightKg: stored.bodyweightKg ?? "" };
    }
  } catch { /* Keep the training log available even if this optional field is damaged. */ }
  return { bodyweightKg: "" };
}

function saveLocally(key, value, onError) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    onError("Speichern auf diesem Gerät fehlgeschlagen. Bitte exportiere deine Daten und prüfe den freien Speicherplatz.");
  }
}

function downloadJson(filename, value) {
  const file = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function App() {
  const [sessions, setSessions] = useState(loadSessions);
  const [volleyballDays, setVolleyballDays] = useState(loadVolleyballDays);
  const [activeArea, setActiveArea] = useState("home");
  const [homeViewKey, setHomeViewKey] = useState(0);
  const [homeInitialView, setHomeInitialView] = useState(null);
  const [homeReturnArea, setHomeReturnArea] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [activityTarget, setActivityTarget] = useState(null);
  const activityNavigationId = useRef(0);
  const pageSwipeStart = useRef(null);
  const pageSlideRef = useRef(null);
  const swipeContentRef = useRef(null);
  const pageFrame = useRef(null);
  const pageTimer = useRef(null);
  const [pageSlide, setPageSlide] = useState(null);
  const suppressPageClickUntil = useRef(0);
  useEffect(() => () => {
    window.cancelAnimationFrame(pageFrame.current);
    window.clearTimeout(pageTimer.current);
  }, []);
  const [exerciseLibrary, setExerciseLibrary] = useState(loadExerciseLibrary);
  const [trainingPlans, setTrainingPlans] = useState(loadTrainingPlans);
  const [athleteProfile, setAthleteProfile] = useState(loadAthleteProfile);
  const [notice, setNotice] = useState("");
  const [criticalNotice, setCriticalNotice] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState(isUpdateAvailable);
  const storageDamaged = damagedStorageKeys.size > 0;
  const [cloudState, setCloudState] = useState(() => storageDamaged
    ? { status: "unavailable", email: "", message: "Lokale Daten sind beschädigt. Speicherung und Synchronisierung wurden zum Schutz angehalten." }
    : { status: "loading", email: "", message: "" });
  const cloudRef = useRef(null);

  useEffect(() => {
    if (storageDamaged) return;
    const cloud = new CloudSync({
      onState: setCloudState,
      onApply: (data) => {
        setSessions(data.sessions);
        setExerciseLibrary(data.exerciseLibrary);
        setTrainingPlans(data.trainingPlans);
        setVolleyballDays(data.volleyballDays);
        setAthleteProfile(data.athleteProfile ?? { bodyweightKg: "" });
      },
      defaultLibrary: DEFAULT_EXERCISES,
    });
    cloudRef.current = cloud;
    cloud.start();
    return () => {
      cloud.stop();
      cloudRef.current = null;
    };
  }, [storageDamaged]);

  useEffect(() => {
    cloudRef.current?.updateData({ sessions, exerciseLibrary, volleyballDays, trainingPlans, athleteProfile });
  }, [sessions, exerciseLibrary, volleyballDays, trainingPlans, athleteProfile]);

  useEffect(() => {
    const showUpdate = () => setUpdateAvailable(true);
    window.addEventListener("beach-athlete-update-available", showUpdate);
    return () => window.removeEventListener("beach-athlete-update-available", showUpdate);
  }, []);

  useEffect(() => {
    if (!storageDamaged) saveLocally("beach-athlete-diary", sessions, setCriticalNotice);
  }, [sessions, storageDamaged]);

  useEffect(() => {
    if (!storageDamaged) saveLocally("beach-athlete-volleyball", volleyballDays, setCriticalNotice);
  }, [volleyballDays, storageDamaged]);

  useEffect(() => {
    if (!storageDamaged) saveLocally("beach-athlete-exercises", exerciseLibrary, setCriticalNotice);
  }, [exerciseLibrary, storageDamaged]);

  useEffect(() => {
    if (!storageDamaged) saveLocally("beach-athlete-training-plans", trainingPlans, setCriticalNotice);
  }, [trainingPlans, storageDamaged]);

  useEffect(() => {
    if (!storageDamaged) saveLocally("beach-athlete-profile", athleteProfile, setCriticalNotice);
  }, [athleteProfile, storageDamaged]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function exportData() {
    const backup = {
      schemaVersion: 2,
      sessions,
      exerciseLibrary,
      trainingPlans,
      athleteProfile,
      volleyballDays,
      exportedAt: new Date().toISOString(),
    };

    downloadJson(`beach-athlete-backup-${today()}.json`, backup);
    setNotice("Datensicherung wurde heruntergeladen.");
  }

  function exportRawData() {
    try {
      const rawLocalStorage = Object.fromEntries(
        ["beach-athlete-diary", "beach-athlete-exercises", "beach-athlete-volleyball", "beach-athlete-training-plans", "beach-athlete-profile"]
          .map((key) => [key, localStorage.getItem(key)])
      );
      downloadJson(`beach-athlete-rohdaten-${today()}.json`, { rawLocalStorage });
      setNotice("Rohdaten wurden heruntergeladen. Bitte bewahre diese Datei auf.");
    } catch {
      setCriticalNotice("Rohdaten konnten nicht gelesen werden. Bitte schließe die App nicht und kontaktiere mich.");
    }
  }

  async function importData(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (storageDamaged) {
      setCriticalNotice("Import ist angehalten, bis die beschädigten lokalen Daten gesichert und geprüft wurden.");
      event.target.value = "";
      return;
    }

    try {
      const content = await file.text();
      const backup = JSON.parse(content);

      const imported = {
        sessions: backup.sessions,
        exerciseLibrary: backup.exerciseLibrary,
        trainingPlans: backup.trainingPlans ?? [],
        athleteProfile: backup.athleteProfile ?? { bodyweightKg: "" },
        volleyballDays: backup.volleyballDays ?? [],
      };
      if (!isAthleteData(imported)) {
        throw new Error("Ungültige Sicherungsdatei");
      }

      const confirmed = window.confirm(
        "Möchtest du Training, Trainingsvorlagen, Übungsbibliothek sowie Beach- und Hallenvolleyball-Spieltage durch die Sicherung ersetzen?"
      );

      if (!confirmed) return;

      setSessions(imported.sessions);
      setExerciseLibrary(imported.exerciseLibrary);
      setTrainingPlans(imported.trainingPlans);
      setVolleyballDays(imported.volleyballDays);
      setAthleteProfile(imported.athleteProfile);
      setNotice("Daten wurden erfolgreich wiederhergestellt.");
    } catch {
      setNotice(
        "Import fehlgeschlagen. Bitte prüfe die Sicherungsdatei."
      );
    } finally {
      event.target.value = "";
    }
  }

  function clearPageSlide() {
    window.cancelAnimationFrame(pageFrame.current);
    window.clearTimeout(pageTimer.current);
    pageSlideRef.current = null;
    setPageSlide(null);
  }

  function selectArea(area) {
    clearPageSlide();
    if (area === "home") {
      setArchiveTarget(null);
      setHomeInitialView(null);
      setHomeReturnArea(null);
      setHomeViewKey((key) => key + 1);
    }
    setNotice("");
    setActiveArea(area);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openHomeView(view, originArea = activeArea) {
    clearPageSlide();
    setArchiveTarget(null);
    setHomeInitialView(view);
    setHomeReturnArea(originArea === 'home' ? null : originArea);
    setHomeViewKey((key) => key + 1);
    setActiveArea("home");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openActivity(entry, returnView = null) {
    clearPageSlide();
    const destination = activityDestination(entry);
    if (destination === "archive") {
      setArchiveTarget({ id: entry.id, type: entry.type, date: entry.date });
      setHomeInitialView("archive");
      setHomeViewKey((key) => key + 1);
      setActiveArea("home");
    } else {
      activityNavigationId.current += 1;
      setActivityTarget({ type: entry.type, id: entry.item.id, returnArea: activeArea,
        returnView, navigationId: activityNavigationId.current });
      setActiveArea(destination);
    }
    setNotice("");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function createCalendarEntry(type, date, category, returnView = null) {
    clearPageSlide();
    activityNavigationId.current += 1;
    setActivityTarget({ type, date, category, mode: "create", returnArea: activeArea,
      returnView, navigationId: activityNavigationId.current });
    setActiveArea(type);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function returnFromActivity(target) {
    if (!target?.returnArea || target.returnArea === target.type) return;
    setActivityTarget(null);
    if (target.returnArea === 'home') openHomeView(target.returnView, 'home');
    else selectArea(target.returnArea);
  }

  function startPageSwipe(event) {
    pageSwipeStart.current = null;
    if (pageSlideRef.current?.settling || document.querySelector('.entry-window')
      || event.touches.length !== 1 || event.target.closest(
        '.home-calendar-stage, .value-wheel, input, textarea, select, [contenteditable="true"], [role="slider"]')) return;
    const touch = event.touches[0];
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    pageSwipeStart.current = { x: touch.clientX, y: touch.clientY,
      width: event.currentTarget.getBoundingClientRect().width };
  }

  function dragPageSwipe(event) {
    const start = pageSwipeStart.current;
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const direction = dx < 0 ? 'left' : 'right';
    const to = adjacentArea(activeArea, direction);
    if (to === activeArea) return;
    const slide = { from: activeArea, to, direction, width: start.width,
      offset: Math.max(-start.width, Math.min(start.width, dx)), settling: false };
    if (pageSlideRef.current?.to === to && !pageSlideRef.current.settling) {
      pageSlideRef.current = slide;
      swipeContentRef.current?.style.setProperty('--swipe-offset', `${slide.offset}px`);
      return;
    }
    pageSlideRef.current = slide;
    setPageSlide(slide);
  }

  function settlePageSwipe(slide, commit, offset) {
    if (!slide) return;
    const initial = { ...slide, offset, settling: false };
    pageSlideRef.current = initial;
    setPageSlide(initial);
    window.cancelAnimationFrame(pageFrame.current);
    window.clearTimeout(pageTimer.current);
    pageFrame.current = window.requestAnimationFrame(() => {
      const target = { ...initial, offset: commit
        ? slide.direction === 'left' ? -slide.width : slide.width : 0,
      settling: true };
      pageSlideRef.current = target;
      setPageSlide(target);
    });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pageTimer.current = window.setTimeout(() => {
      if (commit) selectArea(slide.to);
      else { pageSlideRef.current = null; setPageSlide(null); }
    }, reducedMotion ? 30 : 300);
  }

  function finishPageSwipe(event) {
    const start = pageSwipeStart.current;
    pageSwipeStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const direction = swipeDirection(start, { x: touch.clientX, y: touch.clientY });
    const next = adjacentArea(activeArea, direction);
    const slide = pageSlideRef.current;
    if (next !== activeArea && direction) {
      suppressPageClickUntil.current = Date.now() + 350;
      settlePageSwipe(slide ?? { from: activeArea, to: next, direction,
        width: start.width, offset: 0 }, true, touch.clientX - start.x);
    } else if (slide) settlePageSwipe(slide, false, slide.offset);
  }

  function areaVisible(area) {
    return activeArea === area || pageSlide?.to === area;
  }

  function areaStyle(area) {
    if (!pageSlide || (area !== pageSlide.from && area !== pageSlide.to)) return undefined;
    const incoming = area === pageSlide.to;
    const startOffset = pageSlide.direction === 'left' ? pageSlide.width : -pageSlide.width;
    return { transform: incoming
      ? `translate3d(calc(var(--swipe-offset) + ${startOffset}px), 0, 0)`
      : 'translate3d(var(--swipe-offset), 0, 0)' };
  }

  if (!cloudState.authorized) {
    return (
      <main className="app app-access-gate">
        <header className="app-header">
          <div>
            <p className="eyebrow">DEIN TRAINING. DEINE ENTWICKLUNG.</p>
            <h1>Beach Athlete</h1>
          </div>
          <span className="app-mark">BA</span>
        </header>
        <nav className="main-navigation" aria-label="Hauptnavigation">
          <button type="button" className="home-navigation-button" disabled aria-label="Startseite">⌂</button>
          <button type="button" className="secondary-button" disabled>🏖️ Beach</button>
          <button type="button" className="secondary-button" disabled>🏟️ Halle</button>
          <button type="button" className="secondary-button" disabled>💪 Training</button>
        </nav>
        <section className="access-gate-card">
          <p className="eyebrow">PERSÖNLICHER ZUGANG</p>
          <h2>Bitte melde dich an</h2>
          <p>Nach der Anmeldung kannst du deine Trainings, Spieltage und Auswertungen nutzen. Für diese Testversion stehen insgesamt fünf Plätze bereit.</p>
          <CloudAccount state={cloudState} onRetry={() => cloudRef.current?.retry()} />
          {storageDamaged && (
            <button type="button" className="secondary-button" onClick={exportRawData}>
              Beschädigte lokale Rohdaten sichern
            </button>
          )}
        </section>
        <footer className="app-footer">BEACH ATHLETE <span>•</span> DEIN WEG, DEINE DATEN</footer>
      </main>
    );
  }

  return (
    <main className="app app-signed-in" data-area={activeArea} onClickCapture={() => { if (notice) setNotice(""); }}>
      <AppChrome state={cloudState} updateAvailable={updateAvailable}
        onInstallUpdate={installUpdate} onProfile={() => openHomeView("profile")} />

      <nav className="main-navigation" aria-label="Hauptnavigation">

        <button type="button" className="home-navigation-button"
          aria-label="Startseite" aria-pressed={activeArea === "home"}
          onClick={() => selectArea("home")}>
          <UIIcon name="home" /><span>Start</span>
        </button>

        <button
          type="button"
          className={activeArea === "beach" ? "primary-button" : "secondary-button"}
          aria-label="Beachvolleyball"
          aria-pressed={activeArea === "beach"}
          onClick={() => selectArea("beach")}
        >
          <UIIcon name="beach" />
          <span className="nav-label-long">Beachvolleyball</span>
          <span className="nav-label-short">Beach</span>
        </button>

        <button
          type="button"
          className={activeArea === "indoor" ? "primary-button" : "secondary-button"}
          aria-label="Hallenvolleyball"
          aria-pressed={activeArea === "indoor"}
          onClick={() => selectArea("indoor")}
        >
          <UIIcon name="ball" />
          <span className="nav-label-long">Hallenvolleyball</span>
          <span className="nav-label-short">Halle</span>
        </button>

        <button
          type="button"
          className={activeArea === "training" ? "primary-button" : "secondary-button"}
          aria-label="Training"
          aria-pressed={activeArea === "training"}
          onClick={() => selectArea("training")}
        >
          <UIIcon name="training" />
          <span>Training</span>
        </button>

      </nav>

      {updateAvailable && (
        <div className="update-notice" role="status">
          <span>Neue Version verfügbar. Speichere offene Eingaben, bevor du aktualisierst.</span>
          <button type="button" className="secondary-button" onClick={installUpdate} aria-label="Neue App-Version installieren">
            Jetzt aktualisieren
          </button>
        </div>
      )}

      {criticalNotice && <p className="notice-message" role="alert">{criticalNotice}</p>}
      {notice && <p className="notice-message transient-notice" role="status">{notice}</p>}

      <div className={`app-swipe-content${pageSlide ? ' is-swiping' : ''}${pageSlide?.settling ? ' is-settling' : ''}`}
        ref={swipeContentRef} style={{ '--swipe-offset': `${pageSlide?.offset ?? 0}px` }}
        onTouchStart={startPageSwipe} onTouchMove={dragPageSwipe}
        onTouchEnd={finishPageSwipe} onTouchCancel={() => {
          pageSwipeStart.current = null;
          settlePageSwipe(pageSlideRef.current, false, pageSlideRef.current?.offset ?? 0);
        }}
        onClickCapture={(event) => {
          if (Date.now() < suppressPageClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}>
      {areaVisible("home") && <div className={`app-area-page${pageSlide?.from === 'home' ? ' is-from' : ''}${pageSlide?.to === 'home' ? ' is-to' : ''}`}
        style={areaStyle('home')}><HomeView key={homeViewKey}
        athleteProfile={athleteProfile} setAthleteProfile={setAthleteProfile}
        accountEmail={cloudState.email}
        sessions={sessions} volleyballDays={volleyballDays}
        initialView={activeArea === 'home' ? homeInitialView : null}
        archiveTarget={archiveTarget} onOpenActivity={openActivity} onCreateEntry={createCalendarEntry}
        onExit={homeReturnArea ? () => selectArea(homeReturnArea) : null}>
        <DataSecurity cloudState={cloudState}
          onResolve={(choice) => cloudRef.current?.resolveConflict(choice)}
          onRetry={() => cloudRef.current?.retry()}
          onExport={exportData} onExportRaw={exportRawData}
          onImport={importData} storageDamaged={storageDamaged} />
      </HomeView></div>}

      <div className={`app-area-page${pageSlide?.from === 'training' ? ' is-from' : ''}${pageSlide?.to === 'training' ? ' is-to' : ''}`}
        hidden={!areaVisible('training')} style={areaStyle('training')}>
        <TrainingView sessions={sessions} setSessions={setSessions}
          exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary}
          trainingPlans={trainingPlans} setTrainingPlans={setTrainingPlans}
          athleteProfile={athleteProfile}
          setNotice={setNotice} onOpenArchive={() => openHomeView("archive")}
          navigationTarget={activityTarget?.type === "training" ? activityTarget : null}
          onReturn={returnFromActivity} />
      </div>

      <div className={`app-area-page${pageSlide?.from === 'beach' ? ' is-from' : ''}${pageSlide?.to === 'beach' ? ' is-to' : ''}`}
        hidden={!areaVisible('beach')} style={areaStyle('beach')}>
        <VolleyballView sport="beach" volleyballDays={volleyballDays}
          setVolleyballDays={setVolleyballDays} setNotice={setNotice}
          onOpenArchive={() => openHomeView("archive")}
          navigationTarget={activityTarget?.type === "beach" ? activityTarget : null}
          onReturn={returnFromActivity} />
      </div>
      <div className={`app-area-page${pageSlide?.from === 'indoor' ? ' is-from' : ''}${pageSlide?.to === 'indoor' ? ' is-to' : ''}`}
        hidden={!areaVisible('indoor')} style={areaStyle('indoor')}>
        <VolleyballView sport="indoor" volleyballDays={volleyballDays}
          setVolleyballDays={setVolleyballDays} setNotice={setNotice}
          onOpenArchive={() => openHomeView("archive")}
          navigationTarget={activityTarget?.type === "indoor" ? activityTarget : null}
          onReturn={returnFromActivity} />
      </div>
      </div>
      <footer className="app-footer">
        BEACH ATHLETE <span>·</span> VERSION 0.1
      </footer>
    </main>
  );
}

export default App;
