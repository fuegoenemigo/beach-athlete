# Private Testplätze

Die App lässt nur angemeldete Nutzer an Training, Spieltage, Kalender und Profil. Firestore prüft für jeden persönlichen Datensatz zusätzlich, ob die Firebase-Auth-UID in `config/betaAccess.members` steht. Beim ersten Login wird die eigene UID atomar in diese Liste aufgenommen, solange `members.length < limit` gilt. Das vorhandene Konto wurde als erster Platz eingetragen; der Startwert von `limit` ist 5.

Die Anzahl belegter Plätze steht in Firebase Firestore unter `config/betaAccess` in der Liste `members`. Die zugehörigen E-Mail-Adressen stehen in Firebase Authentication → Users. Die Liste enthält nur UIDs, keine E-Mail-Adressen. Eine spätere Erhöhung braucht eine Änderung des Felds `limit` durch den Projektadministrator; die Firestore-Regeln erlauben Nutzern nur, ihre eigene UID hinzuzufügen. Die Texte in der App, die „fünf“ nennen, sollten dann ebenfalls angepasst und veröffentlicht werden.

Die Grenze gilt für **nutzbare App-Konten**. Firebase Authentication kann technisch weitere Registrierungen annehmen; solche Konten erhalten keinen Zugriff auf die persönlichen Firestore-Daten und sehen in der App den Hinweis auf belegte Plätze. Die Vergabe ist „wer zuerst kommt“: Ein weitergegebener Link kann einen freien Platz belegen. Eine personengebundene Einladungsliste wäre eine spätere Erweiterung.

Bereits zugelassene Konten können auf einem zuvor freigeschalteten Gerät offline arbeiten. Die Cloud synchronisiert nach erneuter Verbindung. Ein nicht zugelassenes Konto kann sich offline nicht erstmals freischalten.
