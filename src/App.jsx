
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { installUpdate, isUpdateAvailable } from "./pwa.js";
import { CloudSync } from "./cloudSync.js";
import { isAthleteData, isVolleyballDateTaken } from "./syncPolicy.js";
import CloudAccount from "./CloudAccount.jsx";
import HomeView from "./HomeView.jsx";
import IndoorView from "./IndoorView.jsx";
import { RatingStepper, StrengthStepper } from "./VolleyballInputs.jsx";
import { isRating, strengthLabels } from "./volleyballValues.js";



const EXERCISES = [
  { name: "Bankdrücken", type: "strength", category: "Krafttraining", muscleGroup: "Brust" },
  { name: "Kniebeugen", type: "strength", category: "Krafttraining", muscleGroup: "Beine" },
  { name: "Kreuzheben", type: "strength", category: "Krafttraining", muscleGroup: "Rücken" },
  { name: "Klimmzüge", type: "strength", category: "Krafttraining", muscleGroup: "Rücken" },
  { name: "Rudern", type: "strength", category: "Krafttraining", muscleGroup: "Rücken" },
  { name: "Schulterdrücken", type: "strength", category: "Krafttraining", muscleGroup: "Schultern" },
  { name: "Ausfallschritte", type: "strength", category: "Krafttraining", muscleGroup: "Beine" },
  { name: "Wadenheben", type: "strength", category: "Krafttraining", muscleGroup: "Beine" },
  { name: "Liegestütze", type: "strength", category: "Krafttraining", muscleGroup: "Brust" },

  { name: "Plank", type: "duration", category: "Core & Stabilität", muscleGroup: "Core" },
  { name: "Side Plank", type: "duration", category: "Core & Stabilität", muscleGroup: "Core" },
  { name: "L-Sit", type: "duration", category: "Core & Stabilität", muscleGroup: "Core" },

  { name: "Box Jumps", type: "reps", category: "Sprungkraft & Explosivität", muscleGroup: "Sprungkraft" },
  { name: "Countermovement Jump", type: "jump", category: "Sprungkraft & Explosivität", muscleGroup: "Sprungkraft" },
  { name: "Seitliche Sprünge", type: "reps", category: "Sprungkraft & Explosivität", muscleGroup: "Sprungkraft" },

  { name: "Sprint", type: "distance", category: "Schnelligkeit & Agilität", muscleGroup: "Schnelligkeit" },
  { name: "Mobilitätsroutine", type: "duration", category: "Mobility", muscleGroup: "Ganzkörper" },

  { name: "Beachvolleyball", type: "volleyball", category: "Sport", muscleGroup: "Sport" },
  { name: "Radfahren", type: "distance", category: "Ausdauer", muscleGroup: "Ausdauer" },
];

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
  return loadStoredArray("beach-athlete-exercises", EXERCISES,
    (items) => isAthleteData({ sessions: [], exerciseLibrary: items, volleyballDays: [] }));
}

const TRAINING_CATEGORIES = [
  {
    name: "Krafttraining",
    subcategories: [],
  },
  {
    name: "Sprungkraft & Explosivität",
    subcategories: [],
  },
  {
    name: "Schnelligkeit & Agilität",
    subcategories: [],
  },
  {
    name: "Ausdauer",
    subcategories: [],
  },
  {
    name: "Core & Stabilität",
    subcategories: [],
  },
  {
    name: "Mobility",
    subcategories: [],
  },
  {
    name: "Sport",
    subcategories: [
      "Beachvolleyball",
      "Hallenvolleyball",
      "Schwimmen",
      "Laufen",
      "Radfahren",
      "Sonstiger Sport",
    ],
  },
  {
    name: "Regeneration",
    subcategories: [],
  },
];

const today = () => new Date().toLocaleDateString("sv-SE");
const allowedStrengths = {
  openPlay: ["weaker3", "weaker2", "weaker1", "equal", "stronger1", "stronger2", "stronger3"],
  testMatch: ["weaker2", "weaker1", "equal", "stronger1", "stronger2"],
  tournament: ["weaker1", "equal", "stronger1"],
};

const newExercise = (name, type = "strength") => ({
  id: crypto.randomUUID(),
  name,
  type,
  sets: "3",
  reps: "",
  weight: "",
  duration: "",
  distance: "",
  result: "",
  notes: "",
});

function loadSessions() {
  return loadStoredArray("beach-athlete-diary", [],
    (items) => isAthleteData({ sessions: items, exerciseLibrary: [], volleyballDays: [] }));
}

function loadVolleyballDays() {
  return loadStoredArray("beach-athlete-volleyball", [],
    (items) => isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: items }));
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

function getCalendarDays(calendarMonth) {
  const [year, month] = calendarMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  return [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${calendarMonth}-${day}`;
    }),
  ];
}

function App() {
  const [sessions, setSessions] = useState(loadSessions);
  const [volleyballDays, setVolleyballDays] = useState(loadVolleyballDays);
  const [activeArea, setActiveArea] = useState("home");
  const [homeViewKey, setHomeViewKey] = useState(0);
  const [showVolleyballForm, setShowVolleyballForm] = useState(false);
  const [volleyballType, setVolleyballType] = useState("");
  const [selectedVolleyballDayId, setSelectedVolleyballDayId] = useState(null);
  const [volleyballDate, setVolleyballDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => today().slice(0, 7));
  const [volleyballFitness, setVolleyballFitness] = useState("5");
  const [volleyballFatigue, setVolleyballFatigue] = useState("5");
  const [volleyballNotes, setVolleyballNotes] = useState("");
  const [volleyballOpponent, setVolleyballOpponent] = useState("");
  const [volleyballTournamentLocation, setVolleyballTournamentLocation] = useState("");
  const [volleyballTournamentPlace, setVolleyballTournamentPlace] = useState("");
  const [volleyballSets, setVolleyballSets] = useState([]);
  const [volleyballSetDraft, setVolleyballSetDraft] = useState({
    opponentStrength: "equal",
    intensity: "5",
    technique: "5",
    fitness: "5",
    won: "true",
  });
  const [exerciseLibrary, setExerciseLibrary] = useState(loadExerciseLibrary);
  const [showExerciseManager, setShowExerciseManager] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [newLibraryExerciseName, setNewLibraryExerciseName] = useState("");
  const [newLibraryCategory, setNewLibraryCategory] = useState("Krafttraining");
  const [newLibraryMuscleGroup, setNewLibraryMuscleGroup] = useState("Brust");
  const [expandedLibraryCategory, setExpandedLibraryCategory] = useState(null);
  const [expandedMuscleGroup, setExpandedMuscleGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [exerciseChoice, setExerciseChoice] = useState("Bankdrücken");
  const [customExercise, setCustomExercise] = useState("");
  const [customMuscleGroup, setCustomMuscleGroup] = useState("Brust");
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
        setVolleyballDays(data.volleyballDays);
      },
      defaultLibrary: EXERCISES,
    });
    cloudRef.current = cloud;
    cloud.start();
    return () => {
      cloud.stop();
      cloudRef.current = null;
    };
  }, [storageDamaged]);

  useEffect(() => {
    cloudRef.current?.updateData({ sessions, exerciseLibrary, volleyballDays });
  }, [sessions, exerciseLibrary, volleyballDays]);

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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function exportData() {
    const backup = {
      schemaVersion: 1,
      sessions,
      exerciseLibrary,
      volleyballDays,
      exportedAt: new Date().toISOString(),
    };

    downloadJson(`beach-athlete-backup-${today()}.json`, backup);
    setNotice("Datensicherung wurde heruntergeladen.");
  }

  function exportRawData() {
    try {
      const rawLocalStorage = Object.fromEntries(
        ["beach-athlete-diary", "beach-athlete-exercises", "beach-athlete-volleyball"]
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
        volleyballDays: backup.volleyballDays ?? [],
      };
      if (!isAthleteData(imported)) {
        throw new Error("Ungültige Sicherungsdatei");
      }

      const confirmed = window.confirm(
        "Möchtest du die aktuellen Trainingsdaten, die Übungsbibliothek und die Beachvolleyball-Spieltage durch die Sicherung ersetzen?"
      );

      if (!confirmed) return;

      setSessions(imported.sessions);
      setExerciseLibrary(imported.exerciseLibrary);
      setVolleyballDays(imported.volleyballDays);
      setNotice("Daten wurden erfolgreich wiederhergestellt.");
    } catch {
      setNotice(
        "Import fehlgeschlagen. Bitte prüfe die Sicherungsdatei."
      );
    } finally {
      event.target.value = "";
    }
  }

  function resetVolleyballDraft() {
    setVolleyballType("");
    setVolleyballDate("");
    setCalendarMonth(today().slice(0, 7));
    setVolleyballFitness("5");
    setVolleyballFatigue("5");
    setVolleyballNotes("");
    setVolleyballOpponent("");
    setVolleyballTournamentLocation("");
    setVolleyballTournamentPlace("");
    setVolleyballSets([]);
    setVolleyballSetDraft({
      opponentStrength: "equal",
      intensity: "5",
      technique: "5",
      fitness: "5",
      won: "true",
    });
  }

  function openVolleyballForm() {
    resetVolleyballDraft();
    const currentDate = today();
    if (!isVolleyballDateTaken(volleyballDays, currentDate)) {
      setVolleyballDate(currentDate);
    }
    setNotice("");
    setShowVolleyballForm(true);
  }

  function addVolleyballSet(isLastSet) {
    if (!hasAvailableBeachDate) return;
    if (!allowedStrengths[volleyballType]?.includes(volleyballSetDraft.opponentStrength)
      || !isRating(volleyballSets.length === 0 ? volleyballFitness : volleyballSetDraft.fitness)
      || !isRating(volleyballSetDraft.intensity)
      || !isRating(volleyballSetDraft.technique)) {
      setNotice("Bitte gib gültige Werte von 1 bis 10 und eine passende Gegnerstärke ein.");
      return;
    }

    const newSet = {
      id: crypto.randomUUID(),
      fitness: volleyballSets.length === 0
        ? Number(volleyballFitness)
        : Number(volleyballSetDraft.fitness),
      opponentStrength: volleyballSetDraft.opponentStrength,
      intensity: Number(volleyballSetDraft.intensity),
      technique: Number(volleyballSetDraft.technique),
      won: volleyballSetDraft.won === "true",
      isLastSet,
    };

    setVolleyballSets((previous) => [...previous, newSet]);

    setVolleyballSetDraft({
      opponentStrength: "equal",
      intensity: "5",
      technique: "5",
      fitness: "5",
      won: "true",
    });
    setNotice("");
  }

  function saveBeachVolleyballDay() {
    if (!volleyballDate) {
      setNotice("Bitte wähle zuerst ein freies Datum im Kalender.");
      return;
    }
    if (
      isVolleyballDateTaken(volleyballDays, volleyballDate)
    ) {
      setNotice("Für dieses Datum existiert bereits ein Spieltag.");
      return;
    }
    if (!allowedStrengths[volleyballType]
      || volleyballSets.length === 0
      || !volleyballSets.at(-1).isLastSet
      || !isRating(volleyballFitness)
      || !isRating(volleyballFatigue)
      || (volleyballTournamentPlace !== ""
        && (!Number.isInteger(Number(volleyballTournamentPlace))
          || Number(volleyballTournamentPlace) < 1))) {
      setNotice("Bitte prüfe Spieltagstyp, Sätze und Zahlenwerte vor dem Speichern.");
      return;
    }
    const newDay = {
      id: crypto.randomUUID(),
      date: volleyballDate,
      type: "beach",
      gameType: volleyballType,
      opponent: volleyballOpponent.trim(),
      tournamentLocation: volleyballTournamentLocation.trim(),
      tournamentPlace: volleyballTournamentPlace
        ? Number(volleyballTournamentPlace)
        : null,
      fitness: Number(volleyballFitness),
      endFatigue: Number(volleyballFatigue),
      notes: volleyballNotes.trim(),
      sets: volleyballSets,
      createdAt: new Date().toISOString(),
    };

    setVolleyballDays((previous) => [...previous, newDay]);
    setShowVolleyballForm(false);
    resetVolleyballDraft();
    setNotice("Beachvolleyball-Spieltag gespeichert.");
  }

  const calendarDays = getCalendarDays(calendarMonth);
  const takenBeachDates = volleyballDays
    .filter((day) => day.type === "beach" || day.type === "indoor")
    .map((day) => day.date);
  const hasAvailableBeachDate = Boolean(volleyballDate) &&
    !takenBeachDates.includes(volleyballDate);
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );

  const sortedSessions = [...sessions].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  function startSession() {
    const existing = sessions.find((session) => session.date === selectedDate);

    if (existing) {
      setActiveSessionId(existing.id);
      setNotice("");
      return;
    }

    const session = {
      id: crypto.randomUUID(),
      date: selectedDate,
      title: "Training",
      category: "Krafttraining",
      subcategory: "",
      exercises: [],
      createdAt: new Date().toISOString(),
    };

    setSessions((previous) => [...previous, session]);
    setActiveSessionId(session.id);
    setNotice("");
  }

  function updateSessionTitle(value) {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId ? { ...session, title: value } : session
      )
    );
  }

  function updateSessionCategory(category) {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? {
            ...session,
            category,
            subcategory: category === "Sport" ? session.subcategory || "" : "",
          }
          : session
      )
    );
  }

  function updateSessionSubcategory(subcategory) {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, subcategory }
          : session
      )
    );
  }


  function addExercise() {
    if (!activeSession) return;

    const isCustom = exerciseChoice === "__custom";
    const name = isCustom ? customExercise.trim() : exerciseChoice;

    if (!name) {
      setNotice("Bitte wähle eine Übung aus oder gib einen Namen ein.");
      return;
    }

    const libraryItem =
      exerciseLibrary.find(
        (item) =>
          item.name === name &&
          item.category === activeSession.category
      ) ||
      EXERCISES.find(
        (item) =>
          item.name === name &&
          item.category === activeSession.category
      );

    const newLibraryItem = {
      name,
      type: libraryItem?.type || "strength",
      category: activeSession.category,
      ...(activeSession.category === "Krafttraining"
        ? { muscleGroup: customMuscleGroup }
        : {}),
    };

    if (isCustom) {
      setExerciseLibrary((previous) => {
        const alreadyExists = previous.some(
          (item) =>
            item.name.toLowerCase() === name.toLowerCase() &&
            item.category === activeSession.category
        );

        return alreadyExists ? previous : [...previous, newLibraryItem];
      });
    }

    const exercise = newExercise(
      name,
      libraryItem?.type || newLibraryItem.type
    );

    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? {
            ...session,
            exercises: [...session.exercises, exercise],
          }
          : session
      )
    );

    setExerciseChoice(name);
    setCustomExercise("");
    setNotice("");
  }

  function saveExerciseEdit() {
    if (!editingExercise) return;

    const newName = editExerciseName.trim();

    if (!newName) {
      setNotice("Bitte gib einen Übungsnamen ein.");
      return;
    }

    const duplicate = exerciseLibrary.some(
      (item, index) =>
        index !== editingExercise.index &&
        item.name.toLowerCase() === newName.toLowerCase() &&
        item.category === editingExercise.category
    );

    if (duplicate) {
      setNotice("Diese Übung gibt es in dieser Kategorie bereits.");
      return;
    }

    setExerciseLibrary((previous) =>
      previous.map((item, index) =>
        index === editingExercise.index
          ? { ...item, name: newName }
          : item
      )
    );

    setEditingExercise(null);
    setEditExerciseName("");
    setNotice("Übung wurde umbenannt.");
  }

  function addLibraryExercise() {
    const name = newLibraryExerciseName.trim();

    if (!name) {
      setNotice("Bitte gib einen Übungsnamen ein.");
      return;
    }

    const alreadyExists = exerciseLibrary.some(
      (exercise) =>
        exercise.name.toLowerCase() === name.toLowerCase() &&
        exercise.category === newLibraryCategory
    );

    if (alreadyExists) {
      setNotice("Diese Übung existiert in dieser Kategorie bereits.");
      return;
    }

    const existingExercise = EXERCISES.find(
      (exercise) =>
        exercise.name.toLowerCase() === name.toLowerCase() &&
        exercise.category === newLibraryCategory
    );

    const newExerciseItem = {
      name,
      type: existingExercise?.type || (
        newLibraryCategory === "Krafttraining" ? "strength" : "duration"
      ),
      category: newLibraryCategory,
      ...(newLibraryCategory === "Krafttraining"
        ? { muscleGroup: newLibraryMuscleGroup }
        : {}),
    };

    setExerciseLibrary((previous) => [...previous, newExerciseItem]);
    setNewLibraryExerciseName("");
    setNotice(`„${name}“ wurde zur Bibliothek hinzugefügt.`);
  }

  function deleteExercise(indexToDelete) {
    const exerciseToDelete = exerciseLibrary[indexToDelete];

    if (!exerciseToDelete) return;

    setExerciseLibrary((previous) =>
      previous.filter((_, index) => index !== indexToDelete)
    );

    setEditingExercise(null);
    setEditExerciseName("");
    setNotice("Übung wurde aus der Übungsliste entfernt.");
  }

  function updateExercise(exerciseId, field, value) {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? {
            ...session,
            exercises: session.exercises.map((exercise) =>
              exercise.id === exerciseId
                ? { ...exercise, [field]: value }
                : exercise
            ),
          }
          : session
      )
    );
  }

  function removeExercise(exerciseId) {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? {
            ...session,
            exercises: session.exercises.filter(
              (exercise) => exercise.id !== exerciseId
            ),
          }
          : session
      )
    );
  }

  function deleteSession(sessionId) {
    if (!window.confirm("Diese Trainingseinheit wirklich löschen?")) return;

    setSessions((previous) =>
      previous.filter((session) => session.id !== sessionId)
    );

    if (activeSessionId === sessionId) setActiveSessionId(null);
  }

  function finishSession() {
    setActiveSessionId(null);
    setNotice("Trainingseinheit gespeichert.");
  }

  function formatDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function selectArea(area) {
    if (area === "home") setHomeViewKey((key) => key + 1);
    setNotice("");
    setActiveArea(area);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  return (
    <main className="app" onClickCapture={() => { if (notice) setNotice(""); }}>
      <header className="app-header">
        <div>
          <p className="eyebrow">DEIN TRAINING. DEINE ENTWICKLUNG.</p>
          <h1>Beach Athlete</h1>
        </div>
        <span className="app-mark">BA</span>

      </header>

      <nav className="main-navigation" aria-label="Hauptnavigation">

        <button
          type="button"
          className={activeArea === "beach" ? "primary-button" : "secondary-button"}
          aria-label="Beachvolleyball"
          aria-pressed={activeArea === "beach"}
          onClick={() => selectArea("beach")}
        >
          <span className="nav-icon" aria-hidden="true">🏖️</span>
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
          <span className="nav-icon" aria-hidden="true">🏟️</span>
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
          <span className="nav-icon" aria-hidden="true">💪</span>
          <span>Training</span>
        </button>

        <button type="button" className="home-navigation-button"
          aria-label="Startseite" aria-pressed={activeArea === "home"}
          onClick={() => selectArea("home")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
            <path d="M9 21v-7h6v7" />
          </svg>
        </button>

      </nav>

      <button type="button" className="sync-status"
        onClick={() => {
          setActiveArea("training");
          window.setTimeout(() => document.getElementById("cloud-account")?.scrollIntoView({ behavior: "smooth" }), 0);
        }}
        aria-label="Synchronisierungsstatus anzeigen">
        {cloudState.status === "ready" ? "☁ Cloud aktuell" :
          cloudState.status === "pending" || cloudState.status === "saving" ? "☁ Synchronisierung läuft" :
            cloudState.status === "signedOut" ? "◌ Nur auf diesem Gerät" :
              cloudState.status === "conflict" ? "⚠ Datenkonflikt prüfen" :
                cloudState.status === "offline" ? "◌ Cloud offline" :
                  cloudState.status === "unavailable" || cloudState.status === "error" ? "⚠ Daten prüfen" : "◌ Cloud prüfen"}
      </button>

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

      {activeArea === "home" && <HomeView key={homeViewKey} />}

      {activeArea === "training" && (
        <>
          <section className="diary-intro">
            <p className="eyebrow">TRAININGSTAGEBUCH</p>
            <h2>Fortschritt beginnt mit Daten.</h2>
            <p>
              Dokumentiere, was du trainierst. Deine Statistiken und deine
              Athletenkarte bauen wir auf deinen tatsächlichen Ergebnissen auf.
            </p>
          </section>

          <section className="diary-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NEUER EINTRAG</p>
                <h2>Training starten</h2>
              </div>
            </div>

            <label className="field-label" htmlFor="training-date">
              Trainingsdatum
            </label>
            <input
              id="training-date"
              className="field"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />

            <button className="primary-button" onClick={startSession}>
              <span>＋</span> Training für diesen Tag öffnen
            </button>

            {sessions.some((session) => session.date === selectedDate) && (
              <p className="helper-text">
                Für dieses Datum gibt es bereits einen Eintrag. Du kannst ihn
                weiterbearbeiten.
              </p>
            )}
          </section>

          {activeSession && (
            <section className="diary-panel active-workout">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{formatDate(activeSession.date)}</p>
                  <h2>Dein Training</h2>
                </div>
                <span className="status-dot">● Aktiv</span>
              </div>

              <label className="field-label" htmlFor="session-title">
                Name der Einheit
              </label>
              <input
                id="session-title"
                className="field"
                value={activeSession.title}
                onChange={(event) => updateSessionTitle(event.target.value)}
                placeholder="z. B. Kraft, Beachvolleyball, Mobility"
              />
              <label className="field-label" htmlFor="session-category">
                Hauptkategorie
              </label>
              <select
                id="session-category"
                className="field"
                value={activeSession.category || "Krafttraining"}
                onChange={(event) =>
                  updateSessionCategory(event.target.value)
                }
              >
                {TRAINING_CATEGORIES.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>

              {activeSession.category === "Sport" && (
                <>
                  <label className="field-label" htmlFor="session-subcategory">
                    Sportart
                  </label>
                  <select
                    id="session-subcategory"
                    className="field"
                    value={activeSession.subcategory || ""}
                    onChange={(event) =>
                      updateSessionSubcategory(event.target.value)
                    }
                  >
                    <option value="">Sportart auswählen</option>
                    {TRAINING_CATEGORIES.find(
                      (category) => category.name === "Sport"
                    ).subcategories.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {!["Sport", "Regeneration"].includes(activeSession.category) && (
                <>
                  <div className="exercise-adder">
                    <label className="field-label" htmlFor="exercise-select">
                      Übung hinzufügen
                    </label>
                    <select
                      id="exercise-select"
                      className="field"
                      value={exerciseChoice}
                      onChange={(event) => setExerciseChoice(event.target.value)}
                    >

                      {exerciseLibrary.filter(
                        (exercise) => exercise.category === activeSession.category
                      ).map((exercise) => (
                        <option key={exercise.name} value={exercise.name}>
                          {exercise.name}
                        </option>
                      ))}
                      <option value="__custom">＋ Eigene Übung eingeben</option>
                    </select>


                    {exerciseChoice === "__custom" && (
                      <>
                        <input
                          className="field"
                          value={customExercise}
                          onChange={(event) => setCustomExercise(event.target.value)}
                          placeholder="Name deiner Übung"
                        />

                        {activeSession.category === "Krafttraining" && (
                          <>
                            <label className="field-label" htmlFor="muscle-group-select">
                              Muskelgruppe
                            </label>
                            <select
                              id="muscle-group-select"
                              className="field"
                              value={customMuscleGroup}
                              onChange={(event) => setCustomMuscleGroup(event.target.value)}
                            >
                              <option value="Brust">Brust</option>
                              <option value="Rücken">Rücken</option>
                              <option value="Schultern">Schultern</option>
                              <option value="Bizeps">Bizeps</option>
                              <option value="Trizeps">Trizeps</option>
                              <option value="Beine">Beine</option>
                              <option value="Core">Core</option>
                              <option value="Ganzkörper">Ganzkörper</option>
                            </select>
                          </>
                        )}
                      </>
                    )}

                    <button className="secondary-button" onClick={addExercise}>
                      Übung hinzufügen
                    </button>
                  </div>

                  {activeSession.exercises.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">＋</span>
                      <p>Noch keine Übungen eingetragen.</p>
                      <span>Füge deine erste Übung hinzu.</span>
                    </div>
                  ) : (
                    <div className="exercise-list">
                      {activeSession.exercises.map((exercise, index) => (
                        <article className="exercise-card" key={exercise.id}>
                          <div className="exercise-card-heading">
                            <div>
                              <span className="exercise-number">
                                ÜBUNG {String(index + 1).padStart(2, "0")}
                              </span>
                              <h3>{exercise.name}</h3>
                            </div>
                            <button
                              className="icon-button"
                              onClick={() => removeExercise(exercise.id)}
                              aria-label={`${exercise.name} entfernen`}
                              title="Übung entfernen"
                            >
                              ×
                            </button>
                          </div>

                          <div className="exercise-fields">
                            <label>
                              Sätze
                              <input
                                className="field"
                                type="number"
                                min="0"
                                value={exercise.sets}
                                onChange={(event) =>
                                  updateExercise(exercise.id, "sets", event.target.value)
                                }
                                placeholder="3"
                              />
                            </label>

                            <label>
                              Wiederholungen
                              <input
                                className="field"
                                type="number"
                                min="0"
                                value={exercise.reps}
                                onChange={(event) =>
                                  updateExercise(exercise.id, "reps", event.target.value)
                                }
                                placeholder="10"
                              />
                            </label>

                            <label>
                              Gewicht (kg)
                              <input
                                className="field"
                                type="number"
                                min="0"
                                step="0.5"
                                value={exercise.weight}
                                onChange={(event) =>
                                  updateExercise(
                                    exercise.id,
                                    "weight",
                                    event.target.value
                                  )
                                }
                                placeholder="z. B. 60"
                              />
                            </label>

                            <label>
                              Dauer (Min.)
                              <input
                                className="field"
                                type="number"
                                min="0"
                                value={exercise.duration}
                                onChange={(event) =>
                                  updateExercise(
                                    exercise.id,
                                    "duration",
                                    event.target.value
                                  )
                                }
                                placeholder="z. B. 30"
                              />
                            </label>

                            <label>
                              Distanz (m/km)
                              <input
                                className="field"
                                value={exercise.distance}
                                onChange={(event) =>
                                  updateExercise(
                                    exercise.id,
                                    "distance",
                                    event.target.value
                                  )
                                }
                                placeholder="z. B. 5 km"
                              />
                            </label>

                            <label>
                              Ergebnis / Messwert
                              <input
                                className="field"
                                value={exercise.result}
                                onChange={(event) =>
                                  updateExercise(
                                    exercise.id,
                                    "result",
                                    event.target.value
                                  )
                                }
                                placeholder="z. B. 52 cm Sprunghöhe"
                              />
                            </label>
                          </div>

                          <label className="notes-label">
                            Notizen
                            <textarea
                              className="field notes-field"
                              value={exercise.notes}
                              onChange={(event) =>
                                updateExercise(exercise.id, "notes", event.target.value)
                              }
                              placeholder="z. B. Gefühl, Technik, Belastung ..."
                              rows="2"
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button className="primary-button" onClick={finishSession}>
                Training abschließen
              </button>
            </section>
          )}

          <section className="diary-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DEIN VERLAUF</p>
                <h2>Trainingshistorie</h2>
              </div>
              <span className="count-badge">{sessions.length}</span>
            </div>

            {sortedSessions.length === 0 ? (
              <div className="empty-state">
                <p>Hier erscheinen deine Trainingseinheiten.</p>
                <span>Starte oben dein erstes Training.</span>
              </div>
            ) : (
              <div className="history-list">
                {sortedSessions.map((session) => (
                  <article className="history-item" key={session.id}>
                    <button
                      className="history-main"
                      onClick={() => {
                        setSelectedDate(session.date);
                        setActiveSessionId(session.id);
                        setNotice("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <span className="history-date">{formatDate(session.date)}</span>
                      <strong>{session.title || "Training"}</strong>
                      <span className="history-meta">
                        {session.exercises.length}{" "}
                        {session.exercises.length === 1 ? "Übung" : "Übungen"}
                      </span>
                    </button>
                    <button
                      className="icon-button delete-button"
                      onClick={() => deleteSession(session.id)}
                      aria-label="Trainingseinheit löschen"
                      title="Trainingseinheit löschen"
                    >
                      ×
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>



          <section className="diary-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DEINE BIBLIOTHEK</p>
                <h2>Übungen verwalten</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => setShowExerciseManager((previous) => !previous)}
              >
                {showExerciseManager ? "Schließen" : "Verwalten"}
              </button>
            </div>

            {showExerciseManager && (
              <div className="exercise-list">

                <article className="exercise-card">
                  <h3>Neue Übung hinzufügen</h3>

                  <label className="field-label" htmlFor="library-exercise-name">
                    Übungsname
                  </label>
                  <input
                    id="library-exercise-name"
                    className="field"
                    value={newLibraryExerciseName}
                    onChange={(event) =>
                      setNewLibraryExerciseName(event.target.value)
                    }
                    placeholder="z. B. Schrägbankdrücken"
                  />

                  <label className="field-label" htmlFor="library-exercise-category">
                    Hauptkategorie
                  </label>
                  <select
                    id="library-exercise-category"
                    className="field"
                    value={newLibraryCategory}
                    onChange={(event) =>
                      setNewLibraryCategory(event.target.value)
                    }
                  >
                    <option value="Krafttraining">Krafttraining</option>
                    <option value="Sprungkraft & Explosivität">
                      Sprungkraft & Explosivität
                    </option>
                    <option value="Schnelligkeit & Agilität">
                      Schnelligkeit & Agilität
                    </option>
                    <option value="Ausdauer">Ausdauer</option>
                    <option value="Core & Stabilität">Core & Stabilität</option>
                    <option value="Mobility">Mobility</option>
                    <option value="Sport">Sport</option>
                    <option value="Regeneration">Regeneration</option>
                  </select>

                  {newLibraryCategory === "Krafttraining" && (
                    <>
                      <label
                        className="field-label"
                        htmlFor="library-exercise-muscle"
                      >
                        Muskelgruppe
                      </label>
                      <select
                        id="library-exercise-muscle"
                        className="field"
                        value={newLibraryMuscleGroup}
                        onChange={(event) =>
                          setNewLibraryMuscleGroup(event.target.value)
                        }
                      >
                        <option value="Brust">Brust</option>
                        <option value="Rücken">Rücken</option>
                        <option value="Schultern">Schultern</option>
                        <option value="Bizeps">Bizeps</option>
                        <option value="Trizeps">Trizeps</option>
                        <option value="Beine">Beine</option>
                        <option value="Core">Core</option>
                        <option value="Ganzkörper">Ganzkörper</option>
                      </select>
                    </>
                  )}

                  <button
                    className="secondary-button"
                    onClick={addLibraryExercise}
                  >
                    Übung zur Bibliothek hinzufügen
                  </button>
                </article>
                {[...new Set(exerciseLibrary.map((exercise) => exercise.category))].map(
                  (category) => {
                    const categoryExercises = exerciseLibrary.filter(
                      (exercise) => exercise.category === category
                    );
                    const isCategoryExpanded = expandedLibraryCategory === category;

                    const muscleGroups = [
                      ...new Set(
                        categoryExercises.map(
                          (exercise) => exercise.muscleGroup || "Ohne Muskelgruppe"
                        )
                      ),
                    ];

                    return (
                      <article className="exercise-card" key={category}>
                        <button
                          className="history-main"
                          onClick={() =>
                            setExpandedLibraryCategory(
                              isCategoryExpanded ? null : category
                            )
                          }
                        >
                          <strong>{isCategoryExpanded ? "▾" : "▸"} {category}</strong>
                          <span className="history-meta">
                            {categoryExercises.length} Übungen
                          </span>
                        </button>

                        {isCategoryExpanded && (
                          <div className="exercise-list">
                            {category === "Krafttraining" ? (
                              muscleGroups.map((group) => {
                                const groupExercises = categoryExercises.filter(
                                  (exercise) =>
                                    (exercise.muscleGroup || "Ohne Muskelgruppe") === group
                                );
                                const isGroupExpanded = expandedMuscleGroup === group;

                                return (
                                  <div key={group}>
                                    <button
                                      className="history-main"
                                      onClick={() =>
                                        setExpandedMuscleGroup(
                                          isGroupExpanded ? null : group
                                        )
                                      }
                                    >
                                      <strong>
                                        {isGroupExpanded ? "▾" : "▸"} {group}
                                      </strong>
                                      <span className="history-meta">
                                        {groupExercises.length} Übungen
                                      </span>
                                    </button>

                                    {isGroupExpanded && (
                                      <div className="exercise-list">
                                        {groupExercises.map((exercise) => {
                                          const index = exerciseLibrary.indexOf(exercise);

                                          return (
                                            <article
                                              className="exercise-card"
                                              key={`${exercise.name}-${index}`}
                                            >
                                              {editingExercise?.index === index ? (
                                                <>
                                                  <label className="field-label">
                                                    Übungsname
                                                  </label>
                                                  <input
                                                    className="field"
                                                    value={editExerciseName}
                                                    onChange={(event) =>
                                                      setEditExerciseName(event.target.value)
                                                    }
                                                  />
                                                  <div className="exercise-actions">
                                                    <button
                                                      className="secondary-button"
                                                      onClick={saveExerciseEdit}
                                                    >
                                                      Speichern
                                                    </button>
                                                    <button
                                                      className="secondary-button"
                                                      onClick={() => {
                                                        setEditingExercise(null);
                                                        setEditExerciseName("");
                                                      }}
                                                    >
                                                      Abbrechen
                                                    </button>
                                                  </div>
                                                </>
                                              ) : (
                                                <>
                                                  <h3>{exercise.name}</h3>
                                                  <div className="exercise-actions">
                                                    <button
                                                      className="secondary-button"
                                                      onClick={() => {
                                                        setEditingExercise({
                                                          index,
                                                          category: exercise.category,
                                                        });
                                                        setEditExerciseName(exercise.name);
                                                      }}
                                                    >
                                                      Umbenennen
                                                    </button>
                                                    <button
                                                      className="secondary-button"
                                                      onClick={() => {
                                                        if (
                                                          window.confirm(
                                                            `Übung „${exercise.name}“ aus der Bibliothek entfernen?`
                                                          )
                                                        ) {
                                                          deleteExercise(index);
                                                        }
                                                      }}
                                                    >
                                                      Löschen
                                                    </button>
                                                  </div>
                                                </>
                                              )}
                                            </article>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              categoryExercises.map((exercise) => {
                                const index = exerciseLibrary.indexOf(exercise);

                                return (
                                  <article
                                    className="exercise-card"
                                    key={`${exercise.name}-${index}`}
                                  >
                                    {editingExercise?.index === index ? (
                                      <>
                                        <label className="field-label">
                                          Übungsname
                                        </label>
                                        <input
                                          className="field"
                                          value={editExerciseName}
                                          onChange={(event) =>
                                            setEditExerciseName(event.target.value)
                                          }
                                        />
                                        <div className="exercise-actions">
                                          <button
                                            className="secondary-button"
                                            onClick={saveExerciseEdit}
                                          >
                                            Speichern
                                          </button>
                                          <button
                                            className="secondary-button"
                                            onClick={() => {
                                              setEditingExercise(null);
                                              setEditExerciseName("");
                                            }}
                                          >
                                            Abbrechen
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <h3>{exercise.name}</h3>
                                        <div className="exercise-actions">
                                          <button
                                            className="secondary-button"
                                            onClick={() => {
                                              setEditingExercise({
                                                index,
                                                category: exercise.category,
                                              });
                                              setEditExerciseName(exercise.name);
                                            }}
                                          >
                                            Umbenennen
                                          </button>
                                          <button
                                            className="secondary-button"
                                            onClick={() => {
                                              if (
                                                window.confirm(
                                                  `Übung „${exercise.name}“ aus der Bibliothek entfernen?`
                                                )
                                              ) {
                                                deleteExercise(index);
                                              }
                                            }}
                                          >
                                            Löschen
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </article>
                                );
                              })
                            )}
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="diary-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DATEN & SICHERHEIT</p>
                <h2>Datensicherung</h2>
              </div>
            </div>

            <CloudAccount
              state={cloudState}
              onResolve={(choice) => cloudRef.current?.resolveConflict(choice)}
              onRetry={() => cloudRef.current?.retry()}
              onExport={exportData}
            />

            {storageDamaged && (
              <div className="cloud-conflict" role="alert">
                <p>Lokale Daten konnten nicht gelesen werden. Sie wurden nicht überschrieben. Exportiere die Rohdaten und bewahre die Datei auf.</p>
                <button className="secondary-button" type="button" onClick={exportRawData}>Rohdaten exportieren</button>
              </div>
            )}

            <p>
              Sichere deine Trainingshistorie und Übungsbibliothek
              als Datei oder stelle eine frühere Sicherung wieder her.
            </p>

            <div className="exercise-actions">
              <button
                className="secondary-button"
                onClick={exportData}
              >
                Daten exportieren
              </button>

              <label className="secondary-button">
                Daten importieren
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importData}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </section>

        </>
      )}

      {activeArea === "beach" && (
        <section className="diary-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VOLLEYBALL</p>
              <h2>🏖️ Beachvolleyball</h2>
            </div>
          </div>

          <p>
            Erfasse deine Beachvolleyball-Spieltage und dokumentiere
            deine einzelnen Sätze.
          </p>


          {!showVolleyballForm && (
            <button
              className="primary-button"
              onClick={openVolleyballForm}
            >
              ＋ Spieltag erfassen
            </button>
          )}

          {showVolleyballForm && (
            <div className="volleyball-form">
              {(volleyballSets.length === 0 || !hasAvailableBeachDate) && (
                <>
                  <label className="field-label">Datum</label>

                  <div className="beach-calendar">
                    <div className="beach-calendar-header">
                      <button
                        type="button"
                        className="secondary-button"
                        aria-label="Vorheriger Monat"
                        onClick={() => {
                          const [year, month] = calendarMonth.split("-").map(Number);
                          const date = new Date(year, month - 2, 1);
                          setCalendarMonth(
                            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                          );
                        }}
                      >
                        ‹
                      </button>

                      <strong>
                        {new Date(
                          Number(calendarMonth.slice(0, 4)),
                          Number(calendarMonth.slice(5, 7)) - 1,
                          1
                        ).toLocaleDateString("de-DE", {
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>

                      <button
                        type="button"
                        className="secondary-button"
                        aria-label="Nächster Monat"
                        onClick={() => {
                          const [year, month] = calendarMonth.split("-").map(Number);
                          const date = new Date(year, month, 1);
                          setCalendarMonth(
                            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                          );
                        }}
                      >
                        ›
                      </button>
                    </div>

                    <div className="beach-calendar-grid">
                      {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) => (
                        <div className="beach-calendar-weekday" key={weekday}>
                          {weekday}
                        </div>
                      ))}

                      {calendarDays.map((date, index) =>
                        date === null ? (
                          <div key={`empty-${index}`} />
                        ) : (
                          <button
                            key={date}
                            type="button"
                            className={`beach-calendar-day ${hasAvailableBeachDate && volleyballDate === date ? "selected" : ""
                              }`}
                            aria-label={formatDate(date)}
                            aria-pressed={hasAvailableBeachDate && volleyballDate === date}
                            disabled={takenBeachDates.includes(date)}
                            onClick={() => setVolleyballDate(date)}
                          >
                            {Number(date.slice(8, 10))}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}

              {!hasAvailableBeachDate && (
                <p className="helper-text" role="status">
                  Bitte wähle ein freies Datum. Durchgestrichene Tage haben bereits einen Beach- oder Hallenvolleyball-Spieltag.
                </p>
              )}

              {hasAvailableBeachDate && (
                <>
                  {!volleyballType && (
                    <div>
                      <h3>Welche Art von Spieltag?</h3>


                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setVolleyballType("openPlay")}
                      >
                        🏐 Open Play
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setVolleyballType("testMatch")}
                      >
                        🤝 Testspiel
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setVolleyballType("tournament")}
                      >
                        🏆 Turnier
                      </button>
                    </div>
                  )}

                  {volleyballType && (
                    <>
                      {volleyballType === "testMatch" && (
                        <>
                          <label className="field-label" htmlFor="beach-opponent">
                            Gegner / gegnerisches Team
                          </label>
                          <input
                            id="beach-opponent"
                            className="field"
                            type="text"
                            value={volleyballOpponent}
                            onChange={(event) => setVolleyballOpponent(event.target.value)}
                            placeholder="z. B. Team Müller / Schmidt"
                          />
                        </>
                      )}

                      {volleyballType === "tournament" && (
                        <>
                          <label className="field-label" htmlFor="beach-tournament-location">
                            Turnier / Austragungsort
                          </label>
                          <input
                            id="beach-tournament-location"
                            className="field"
                            type="text"
                            value={volleyballTournamentLocation}
                            onChange={(event) =>
                              setVolleyballTournamentLocation(event.target.value)
                            }
                            placeholder="z. B. Stadt oder Turniername"
                          />

                          <label className="field-label" htmlFor="beach-tournament-place">
                            Belegter Platz (optional)
                          </label>
                          <input
                            id="beach-tournament-place"
                            className="field"
                            type="number"
                            min="1"
                            step="1"
                            value={volleyballTournamentPlace}
                            onChange={(event) =>
                              setVolleyballTournamentPlace(event.target.value)
                            }
                            placeholder="z. B. 3"
                          />
                        </>
                      )}

                      {volleyballSets.length === 0 && (
                        <RatingStepper id="beach-fitness" label="Wie fit warst du zu Beginn? (1–10)"
                          value={volleyballFitness} onChange={setVolleyballFitness} />
                      )}

                      {!volleyballSets.some((set) => set.isLastSet) && (
                        <div className="volleyball-set-editor">
                          <h3>Satz {volleyballSets.length + 1}</h3>
                          <StrengthStepper
                            value={volleyballSetDraft.opponentStrength}
                            options={allowedStrengths[volleyballType] ?? []}
                            onChange={(opponentStrength) =>
                              setVolleyballSetDraft((previous) => ({
                                ...previous,
                                opponentStrength,
                              }))
                            }
                          />

                          {volleyballSets.length > 0 && (
                            <RatingStepper id="set-fitness"
                              label="Wie fit warst du zu Beginn dieses Satzes? (1–10)"
                              value={volleyballSetDraft.fitness}
                              onChange={(fitness) => setVolleyballSetDraft((previous) => ({
                                ...previous, fitness,
                              }))} />
                          )}
                          <RatingStepper id="set-intensity" label="Spielintensität (1–10)"
                            value={volleyballSetDraft.intensity}
                            onChange={(intensity) => setVolleyballSetDraft((previous) => ({
                              ...previous, intensity,
                            }))} />

                          <RatingStepper id="set-technique" label="Technische Leistung (1–10)"
                            value={volleyballSetDraft.technique}
                            onChange={(technique) => setVolleyballSetDraft((previous) => ({
                              ...previous, technique,
                            }))} />

                          <label className="field-label" htmlFor="set-result">
                            Satzergebnis
                          </label>
                          <select
                            id="set-result"
                            className="field"
                            value={volleyballSetDraft.won}
                            onChange={(event) =>
                              setVolleyballSetDraft((previous) => ({
                                ...previous,
                                won: event.target.value,
                              }))
                            }
                          >
                            <option value="true">Gewonnen</option>
                            <option value="false">Verloren</option>
                          </select>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => addVolleyballSet(false)}
                          >
                            ＋ Satz hinzufügen
                          </button>
                          <button type="button" className="last-set-button"
                            onClick={() => addVolleyballSet(true)}>
                            ✓ Das war mein letzter Satz
                          </button>
                        </div>
                      )}

                      {volleyballSets.length > 0 && (
                        <div className="volleyball-day-list">
                          <h3>Erfasste Sätze</h3>

                          {volleyballSets.map((set, index) => (
                            <div className="diary-panel" key={set.id}>
                              <h4>Satz {index + 1}</h4>
                              <p>
                                Gegnerstärke: {strengthLabels[set.opponentStrength]}
                              </p>
                              <p>Fitness zu Satzbeginn: {set.fitness ?? "–"}/10</p>
                              <p>Intensität: {set.intensity}/10</p>
                              <p>Technische Leistung: {set.technique}/10</p>
                              <p>Ergebnis: {set.won ? "Gewonnen" : "Verloren"}</p>
                            </div>
                          ))}
                          <button type="button" className="secondary-button"
                            onClick={() => setVolleyballSets((previous) => previous.slice(0, -1))}>
                            Letzten Satz entfernen
                          </button>
                        </div>
                      )}

                      {volleyballSets.some((set) => set.isLastSet) && (
                        <>
                          <RatingStepper id="beach-fatigue"
                            label="Erschöpfung am Ende des Spieltags (1–10)"
                            value={volleyballFatigue}
                            onChange={setVolleyballFatigue} />
                          <p className="helper-text">
                            1 = überhaupt nicht erschöpft, 10 = völlig erschöpft.
                          </p>
                        </>
                      )}

                      <label className="field-label" htmlFor="beach-notes">
                        Notizen (optional)
                      </label>
                      <textarea
                        id="beach-notes"
                        className="field"
                        value={volleyballNotes}
                        onChange={(event) => setVolleyballNotes(event.target.value)}
                        placeholder="z. B. Turnier, Open Play, Wetter ..."
                        rows="3"
                      />

                      {volleyballSets.some((set) => set.isLastSet) && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={saveBeachVolleyballDay}
                        >
                          Spieltag speichern
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              <button type="button" className="secondary-button" onClick={() => {
                if (volleyballSets.length && !window.confirm("Diesen ungespeicherten Spieltag verwerfen?")) return;
                setShowVolleyballForm(false);
                resetVolleyballDraft();
              }}>Abbrechen</button>
            </div>
          )}

          <div className="volleyball-day-list">
            <h3>Meine Spieltage</h3>

            {volleyballDays.filter((day) => day.type === "beach").length === 0 ? (
              <p className="helper-text">
                Noch keine Beachvolleyball-Spieltage gespeichert.
              </p>
            ) : (
              volleyballDays
                .filter((day) => day.type === "beach")
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((day) => (

                  <div className="diary-panel" key={day.id}>
                    <div className="volleyball-day-header">
                      <h3>{formatDate(day.date)}</h3>
                      <span>{(day.sets ?? []).length} {(day.sets ?? []).length === 1 ? "Satz" : "Sätze"}</span>
                    </div>

                    <p>
                      {{
                        openPlay: "🏐 Open Play",
                        testMatch: "🤝 Testspiel",
                        tournament: "🏆 Turnier",
                      }[day.gameType] ?? day.gameType ?? "❓ Unbekannt"} · {(day.sets ?? []).length} {(day.sets ?? []).length === 1 ? "Satz" : "Sätze"}
                    </p>

                    {day.gameType === "testMatch" && day.opponent && (
                      <p>Gegner: {day.opponent}</p>
                    )}

                    {day.gameType === "tournament" && (
                      <>
                        {day.tournamentLocation && (
                          <p>Turnier / Ort: {day.tournamentLocation}</p>
                        )}
                        {day.tournamentPlace != null && (
                          <p>Platzierung: {day.tournamentPlace}. Platz</p>
                        )}
                      </>
                    )}

                    <p>Tagesform zu Beginn: {day.fitness}/10 · Erschöpfung am Ende: {day.endFatigue ?? "–"}/10</p>
                    {day.notes && <p>{day.notes}</p>}

                    <button type="button" className="secondary-button"
                      aria-expanded={selectedVolleyballDayId === day.id}
                      onClick={() => setSelectedVolleyballDayId(
                        selectedVolleyballDayId === day.id ? null : day.id
                      )}>
                      {selectedVolleyballDayId === day.id ? "Details schließen" : "Sätze anzeigen"}
                    </button>

                    {selectedVolleyballDayId === day.id && (
                      <div className="volleyball-day-list">
                        {(day.sets ?? []).length === 0 ? (
                          <p className="helper-text">Keine Sätze gespeichert.</p>
                        ) : (
                          (day.sets ?? []).map((set, index) => (
                            <div className="volleyball-saved-set" key={set.id}>
                              <strong>Satz {index + 1} · {set.won ? "Gewonnen" : "Verloren"}</strong>
                              <p>Gegnerstärke: {strengthLabels[set.opponentStrength] ?? set.opponentStrength}</p>
                              <p>Fitness zu Satzbeginn: {set.fitness ?? "–"}/10</p>
                              <p>Intensität: {set.intensity}/10</p>
                              <p>Technische Leistung: {set.technique}/10</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    <button type="button" className="secondary-button volleyball-delete-action"
                      onClick={() => {
                        if (!window.confirm("Möchtest du diesen Spieltag wirklich löschen?")) return;
                        setVolleyballDays((previous) => previous.filter((item) => item.id !== day.id));
                        setSelectedVolleyballDayId(null);
                      }}>
                      Spieltag löschen
                    </button>
                  </div>
                ))
            )}
          </div>
        </section>
      )}

      <div hidden={activeArea !== "indoor"}>
        <IndoorView volleyballDays={volleyballDays}
          setVolleyballDays={setVolleyballDays} setNotice={setNotice} />
      </div>
      <footer className="app-footer">
        BEACH ATHLETE <span>•</span> DEIN WEG, DEINE DATEN
      </footer>
    </main>
  );
}

export default App;
