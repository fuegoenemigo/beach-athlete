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

Vor einem Wechsel von der lokalen Entwicklungsadresse oder einem anderen Browser zur GitHub-Pages-Adresse ein JSON-Backup exportieren und dort importieren. Bis Firebase eingerichtet ist, findet **keine automatische Synchronisierung** statt. Das Installieren der App allein überträgt keine Daten zwischen Adressen oder Geräten.

## Firebase: noch nicht eingerichtet

Es gibt noch kein Firebase-Projekt und keine Anmelde- oder Firestore-Anbindung. Die Firebase-SDK-Abhängigkeit, `.env.example`, `firebase.json` und `firestore.rules` sind vorbereitet. Die Regeln erlauben Lese- und Schreibzugriff nur dem angemeldeten Besitzer unter `users/<uid>/`. Nach der Anmeldung werden Projekt und Web-App angelegt, die Konfigurationswerte lokal und als GitHub-Variablen eingetragen, E-Mail/Passwort-Anmeldung und Cloud Firestore aktiviert, die Regeln veröffentlicht und erst dann Migration und Synchronisierung umgesetzt und geprüft.
