# Beach Athlete

Persönliches Sporttagebuch für Training und Beachvolleyball. React + Vite, lokale Speicherung im Browser. Zielplattform: iPhone 15 Pro. Die App besitzt jetzt ein Manifest, Installations-Icons und einen Service Worker für die Offline-App-Dateien; der Praxistest auf einem iPhone steht noch aus.

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
```

Die App speichert Training, Übungsbibliothek und Beach-Spieltage in `localStorage`. Backups lassen sich im Trainingsbereich als JSON exportieren und importieren. Unterschiedliche Browser oder Adressen teilen diesen Speicher nicht automatisch.

## GitHub Pages und iPhone

Die GitHub-Actions-Datei `.github/workflows/pages.yml` baut und veröffentlicht die App bei einem Push auf `main`. Das Repository ist [fuegoenemigo/beach-athlete](https://github.com/fuegoenemigo/beach-athlete), die veröffentlichte App ist unter [fuegoenemigo.github.io/beach-athlete](https://fuegoenemigo.github.io/beach-athlete/) erreichbar. Die Pages-Quelle ist **GitHub Actions**. Der Build verwendet den Pfad `/<Repositoryname>/`.

Auf GitHub Free benötigt Pages ein öffentliches Repository. Der Programmcode und die App-Adresse sind dann öffentlich erreichbar. Persönliche Projektnotizen (`docs/`), lokale Firebase-Konfiguration und exportierte Backups sind vom Git-Upload ausgeschlossen. Deine späteren Trainingsdaten dürfen ausschließlich unter deinem angemeldeten Firebase-Benutzer gespeichert werden.

Auf dem iPhone die HTTPS-Adresse in Safari öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Nach dem ersten vollständigen Laden sollten die App-Dateien offline bereitstehen. Diese Funktion und die iOS-Bedienung müssen noch auf einem echten iPhone geprüft werden.

Vor einem Wechsel von der lokalen Entwicklungsadresse oder einem anderen Browser zur GitHub-Pages-Adresse ein JSON-Backup exportieren und dort importieren. Bis die Firebase-Anmeldung und Datensynchronisierung in der App implementiert sind, findet **keine automatische Synchronisierung** statt. Das Installieren der App allein überträgt keine Daten zwischen Adressen oder Geräten.

## Firebase: Infrastruktur eingerichtet

Firebase-Projekt: `beach-athlete-fuegoenemigo`; Web-App: `Beach Athlete Web`. Die kostenlose Firestore-Standarddatenbank wurde beim ersten Deployment in `nam5` (USA) angelegt. Die Firestore-Regeln unter `firestore.rules` und der E-Mail/Passwort-Anbieter aus `firebase.json` sind veröffentlicht. Die Web-Konfiguration liegt lokal in der ignorierten `.env.local` und als GitHub-Repository-Variablen für den Pages-Build vor.

Die Regeln erlauben Lese- und Schreibzugriff nur dem angemeldeten Besitzer unter `users/<uid>/`. Die App verwendet Firebase aktuell noch nicht zur Anmeldung oder Synchronisierung: Training, Übungsbibliothek und Spieltage bleiben vorerst ausschließlich im lokalen Browserspeicher. Migration und Synchronisierung müssen implementiert und geprüft werden, bevor ein Gerätewechsel ohne JSON-Backup möglich ist.
