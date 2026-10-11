# Beach Athlete

Persönliches Sporttagebuch für Training, Beachvolleyball und Hallenvolleyball. React + Vite, lokale Speicherung im Browser und Firebase-Synchronisierung nach Anmeldung. Zielplattform: iPhone 15 Pro. Die App besitzt ein Manifest, Installations-Icons und einen Service Worker für die Offline-App-Dateien. Homescreen, Offline-Neustart und Update wurden auf dem iPhone geprüft.

## Projektgrundlagen

- [Vision und Anforderungen: Projektübergabe](docs/PROJEKTUEBERGABE.md)
- [Projektstand, Kalenderkorrektur und vorgeschlagene Roadmap](docs/PROJEKTSTAND-UND-ROADMAP.md)

Kartenattribute und Ratingformeln sind noch offen. Bestehende Eingabedaten und Backups erhalten.

## Entwicklung unter Windows

```powershell
npm.cmd install
npm.cmd run dev
```

Die tatsächliche lokale Adresse zeigt Vite im Terminal an, normalerweise `http://localhost:5173/`.

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

Die App speichert Training, Trainingsvorlagen, Übungsbibliothek sowie Beach- und Hallen-Spieltage weiterhin sofort in `localStorage`. Backups lassen sich auf der Startseite unter „Konto und Datensicherung“ als JSON exportieren und importieren. Dort befinden sich auch Anmeldung und Gerätesynchronisierung. Nach Anmeldung mit einem persönlichen E-Mail/Passwort-Konto synchronisiert sie dieselben Rohdaten zusätzlich mit Firestore. Bei gleichzeitigen Änderungen auf zwei Geräten fragt sie, welche Version erhalten bleiben soll; vor der Entscheidung kann die lokale Version exportiert werden.

Beim Start öffnet sich die Startseite. Sie zeigt einen anklickbaren Monatskalender sowie Platzhalter für Statistiken und die Spielerkarte. Diese Vorschauen enthalten bewusst noch keine berechneten Werte. Über die vier Reiter am unteren Bildschirmrand sind Startseite, Beachvolleyball, Hallenvolleyball und Training erreichbar.

Der Trainingsreiter führt durch die Erfassung in einem eigenen Eingabefenster: Hauptkategorie wählen, bei Krafttraining Muskelgruppe und Übung wählen, Satzwerte mit einem Haken bestätigen, beliebig viele weitere Sätze erfassen und die Übung abschließen. Anschließend kann die nächste Übung gewählt oder das Training mit Datum, Dauer, Anstrengung und Notizen beendet, für später geschlossen oder vollständig abgebrochen werden. Der Name der Einheit wird nicht abgefragt. Die Hauptkategorien sind Krafttraining, Sprungkraft und Agilität, Ausdauer, Core und Mobility, Beach-Training, Hallentraining und Regeneration. Mehrere Einheiten am selben Datum sind möglich. Ältere Kategorien und Sammelwerte bleiben lesbar; aus alten Sammelwerten werden keine einzelnen Sätze erfunden. Vorlagen und Rohdaten werden lokal und mit Firestore synchronisiert und sind im JSON-Backup enthalten.

Der Bereich „Trainingsvorlagen“ ist einklappbar. Oben stehen fünf Fitnessstudio-Vorlagen für Einsteiger: Ganzkörper mit Geräten, Ganzkörper mit Freihanteln sowie Push, Pull und Legs. Darunter stehen sieben Volleyball-Vorschläge: zwei Krafteinheiten, Sprungkraft/Agilität, ein kombinierter Kraft/Sprung-Tag, wiederholte Sprints, Core/Mobility und ein kürzerer gemischter Kraft/Core-Tag. Einsteiger sollten Ganzkörper-Einheiten mit Pausentagen bevorzugen; Push/Pull/Legs sind alternative einzelne Trainingstage, keine Vorgabe für fünf Studiotage pro Woche. Die Vorlagen sind fest im App-Code hinterlegt und überschreiben keine persönlichen Vorlagen. Die Bibliothek enthält über 100 kategorisierte Standardübungen für Kraft, Core/Mobility, Ausdauer und Sprungkraft/Agilität, darunter Freihantel- und Geräteübungen, Back Extensions und explosive Kniebeugen. Vorgeschlagene Satzumfänge sind Orientierung, keine automatische Vorgabe. Bei Eigengewichtsübungen wird das im Home-Profil eingetragene Körpergewicht für neue bestätigte Sätze festgehalten; zusätzliches Gewicht bleibt ein separater Wert. Bereits gespeicherte Satzwerte werden durch spätere Profiländerungen nicht verändert.

Die Einsteiger-Vorlagen orientieren sich an den [aktuellen ACSM-Empfehlungen](https://acsm.org/resistance-training-guidelines-update-2026/) für regelmäßiges Training aller großen Muskelgruppen und an der [NSCA-Einordnung zur Trainingshäufigkeit](https://dxpprod.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/) mit zwei bis drei Ganzkörpereinheiten pro Woche für Anfänger.

Die Vorlagen stützen sich auf [eine Meta-Analyse zum plyometrischen Training bei Volleyballspielern](https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440/), [eine kontrollierte Studie zur Kombination aus Kniebeugen und Sprüngen](https://pubmed.ncbi.nlm.nih.gov/41961890/), [eine Studie zu Rumpfstabilität und Sprungleistung](https://pubmed.ncbi.nlm.nih.gov/23187323/) sowie [eine Intervention mit wiederholten Sprints](https://pmc.ncbi.nlm.nih.gov/articles/PMC9458279/). Die [NSCA-Praxiseinordnung](https://dxpprod.nsca.com/education/articles/kinetic-select/plyometric-exercises/) weist auf die zusätzliche Sprungbelastung durch Volleyballtraining und Spiele hin. Einzelne Übungsauswahl und Umfang sind daraus abgeleitete Startvorschläge; individuelle Leistungssteigerung oder Verletzungsprävention sind nicht garantiert. Die Evidenz zum Schultertraining ist gemischt: [eine randomisierte Volleyball-Studie](https://pubmed.ncbi.nlm.nih.gov/40052956/) fand bei einigen Schulterparametern Verbesserungen, bei anderen nicht.

In den Volleyball-Kalendern ist ein Datum nur für einen Beach- oder Hallen-Spieltag verfügbar. Trainingseinheiten können am selben Datum weiterhin stattfinden. Ein Beach-Spieltag kann mehrere Spiele enthalten; ein Spiel endet automatisch nach zwei gewonnenen oder verlorenen Sätzen (spätestens nach drei Sätzen). In der Halle endet ein Spiel automatisch nach drei gewonnenen oder verlorenen Sätzen (spätestens nach fünf Sätzen). In beiden Sportarten kann ein Spiel nach jedem Satz auch freiwillig vorzeitig beendet und gespeichert werden, etwa ein Trainingsspiel mit nur einem Satz. Bei Open Play, Beach-Testspielen und Hallen-Spieltagen wird jedes abgeschlossene Spiel sofort gespeichert. Der Spieltag lässt sich später am selben Datum fortsetzen und erst bei Bedarf mit Erschöpfung und Notizen abschließen. Bei Turnieren werden zusätzlich Name und Austragungsort erfasst. Auch Turnierspiele werden sofort gespeichert; erst wenn das letzte Spiel des Turniers markiert wurde, fragt die App nach Platzierung und Erschöpfung.

Bei neuen Beach-Testspielen wird der Gegner pro Spiel erfasst. Für ältere Spieltage mit nur einem gemeinsamen Gegnernamen kann der Gegner weiterhin in den Satzdetails nachgetragen werden; unterschiedliche frühere Gegner lassen sich aus dem alten Eintrag nicht automatisch ableiten.

## GitHub Pages und iPhone

Die GitHub-Actions-Datei `.github/workflows/pages.yml` baut und veröffentlicht die App bei einem Push auf `main`. Das Repository ist [fuegoenemigo/beach-athlete](https://github.com/fuegoenemigo/beach-athlete), die veröffentlichte App ist unter [fuegoenemigo.github.io/beach-athlete](https://fuegoenemigo.github.io/beach-athlete/) erreichbar. Die Pages-Quelle ist **GitHub Actions**. Der Build verwendet den Pfad `/<Repositoryname>/`.

Auf GitHub Free benötigt Pages ein öffentliches Repository. Der Programmcode und die App-Adresse sind dann öffentlich erreichbar. Persönliche Projektnotizen (`docs/`), lokale Firebase-Konfiguration und exportierte Backups sind vom Git-Upload ausgeschlossen. Deine späteren Trainingsdaten dürfen ausschließlich unter deinem angemeldeten Firebase-Benutzer gespeichert werden.

Auf dem iPhone die HTTPS-Adresse in Safari öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Nach dem ersten vollständigen Laden stehen die App-Dateien offline bereit. Homescreen-Start, Flugmodus-Neustart, lokale Eingabe und anschließende Synchronisierung wurden auf dem iPhone erfolgreich geprüft.

Vor dem ersten Gerätewechsel auf dem Gerät mit den bisherigen Einträgen ein JSON-Backup exportieren. Danach **auf diesem Gerät und unter der bisherigen Adresse** auf der Startseite im Bereich „Konto und Datensicherung“ ein persönliches Konto erstellen oder anmelden und warten, bis „Cloud aktuell“ angezeigt wird. Erst dann auf dem iPhone die Pages-Adresse öffnen und sich mit demselben Konto anmelden. Ein Browser auf einer anderen Adresse hat zunächst einen eigenen lokalen Speicher; das Backup bleibt deshalb eine zusätzliche Absicherung.

Offline bleiben vorhandene Daten und Eingaben auf dem jeweiligen Gerät nutzbar. Die Cloud-Synchronisierung benötigt wieder Internet. Vor dem Wechsel oder Löschen eines Geräts auf „Cloud aktuell“ warten und sicherheitshalber ein Backup exportieren. Der Update-Hinweis erschien auf dem iPhone; nach Installation der neuen Version waren alle Einträge erhalten.

## Firebase: Infrastruktur eingerichtet

Firebase-Projekt: `beach-athlete-fuegoenemigo`; Web-App: `Beach Athlete Web`. Die kostenlose Firestore-Standarddatenbank wurde beim ersten Deployment in `nam5` (USA) angelegt. Die Firestore-Regeln unter `firestore.rules` und der E-Mail/Passwort-Anbieter aus `firebase.json` sind veröffentlicht. Die Web-Konfiguration liegt lokal in der ignorierten `.env.local` und als GitHub-Repository-Variablen für den Pages-Build vor.

Die Regeln erlauben Lese- und Schreibzugriff nur dem angemeldeten Besitzer unter `users/<uid>/`. Die App synchronisiert Training, Trainingsvorlagen, Übungsbibliothek sowie Beach- und Hallen-Spieltage in einem versionierten Dokument je Konto. Sie übernimmt vorhandene lokale Daten beim ersten Login, lädt auf einem neuen Gerät den Cloud-Stand und hält bei konkurrierenden Änderungen zur Auswahl an. Ein Testkonto hat Anmeldung sowie erlaubte und verweigerte Firestore-Zugriffe erfolgreich geprüft; die Datenübernahme und Synchronisierung wurden zusätzlich mit dem persönlichen Konto auf dem iPhone bestätigt.
