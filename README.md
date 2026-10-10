# Beach Athlete

Persönliches Sporttagebuch für Training und Beachvolleyball. React + Vite, lokale Speicherung im Browser und Firebase-Synchronisierung nach Anmeldung. Zielplattform: iPhone 15 Pro. Die App besitzt ein Manifest, Installations-Icons und einen Service Worker für die Offline-App-Dateien. Homescreen, Offline-Neustart und Update wurden auf dem iPhone geprüft.

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

Die App speichert Training, Übungsbibliothek und Beach-Spieltage weiterhin sofort in `localStorage`. Backups lassen sich im Trainingsbereich als JSON exportieren und importieren. Nach Anmeldung mit einem persönlichen E-Mail/Passwort-Konto synchronisiert sie dieselben Rohdaten zusätzlich mit Firestore. Bei gleichzeitigen Änderungen auf zwei Geräten fragt sie, welche Version erhalten bleiben soll; vor der Entscheidung kann die lokale Version exportiert werden.

## GitHub Pages und iPhone

Die GitHub-Actions-Datei `.github/workflows/pages.yml` baut und veröffentlicht die App bei einem Push auf `main`. Das Repository ist [fuegoenemigo/beach-athlete](https://github.com/fuegoenemigo/beach-athlete), die veröffentlichte App ist unter [fuegoenemigo.github.io/beach-athlete](https://fuegoenemigo.github.io/beach-athlete/) erreichbar. Die Pages-Quelle ist **GitHub Actions**. Der Build verwendet den Pfad `/<Repositoryname>/`.

Auf GitHub Free benötigt Pages ein öffentliches Repository. Der Programmcode und die App-Adresse sind dann öffentlich erreichbar. Persönliche Projektnotizen (`docs/`), lokale Firebase-Konfiguration und exportierte Backups sind vom Git-Upload ausgeschlossen. Deine späteren Trainingsdaten dürfen ausschließlich unter deinem angemeldeten Firebase-Benutzer gespeichert werden.

Auf dem iPhone die HTTPS-Adresse in Safari öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Nach dem ersten vollständigen Laden stehen die App-Dateien offline bereit. Homescreen-Start, Flugmodus-Neustart, lokale Eingabe und anschließende Synchronisierung wurden auf dem iPhone erfolgreich geprüft.

Vor dem ersten Gerätewechsel auf dem Gerät mit den bisherigen Einträgen ein JSON-Backup exportieren. Danach **auf diesem Gerät und unter der bisherigen Adresse** im Bereich „Datensicherung“ ein persönliches Konto erstellen oder anmelden und warten, bis „Cloud aktuell“ angezeigt wird. Erst dann auf dem iPhone die Pages-Adresse öffnen und sich mit demselben Konto anmelden. Ein Browser auf einer anderen Adresse hat zunächst einen eigenen lokalen Speicher; das Backup bleibt deshalb eine zusätzliche Absicherung.

Offline bleiben vorhandene Daten und Eingaben auf dem jeweiligen Gerät nutzbar. Die Cloud-Synchronisierung benötigt wieder Internet. Vor dem Wechsel oder Löschen eines Geräts auf „Cloud aktuell“ warten und sicherheitshalber ein Backup exportieren. Der Update-Hinweis erschien auf dem iPhone; nach Installation der neuen Version waren alle Einträge erhalten.

## Firebase: Infrastruktur eingerichtet

Firebase-Projekt: `beach-athlete-fuegoenemigo`; Web-App: `Beach Athlete Web`. Die kostenlose Firestore-Standarddatenbank wurde beim ersten Deployment in `nam5` (USA) angelegt. Die Firestore-Regeln unter `firestore.rules` und der E-Mail/Passwort-Anbieter aus `firebase.json` sind veröffentlicht. Die Web-Konfiguration liegt lokal in der ignorierten `.env.local` und als GitHub-Repository-Variablen für den Pages-Build vor.

Die Regeln erlauben Lese- und Schreibzugriff nur dem angemeldeten Besitzer unter `users/<uid>/`. Die App synchronisiert Training, Übungsbibliothek und Beach-Spieltage in einem versionierten Dokument je Konto. Sie übernimmt vorhandene lokale Daten beim ersten Login, lädt auf einem neuen Gerät den Cloud-Stand und hält bei konkurrierenden Änderungen zur Auswahl an. Ein Testkonto hat Anmeldung sowie erlaubte und verweigerte Firestore-Zugriffe erfolgreich geprüft; die Datenübernahme und Synchronisierung wurden zusätzlich mit dem persönlichen Konto auf dem iPhone bestätigt.
