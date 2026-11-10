# Luffy Performance

Application de coaching personnel : travail en 5x8, JJB, musculation, nutrition, sommeil.
Programme du 11 novembre 2026 au 30 juin 2027. Aucun compte, aucun serveur : tout est enregistré dans le navigateur.

## Lancer l'application sur ton ordinateur

Il faut Node.js 18 ou plus récent (https://nodejs.org, version « LTS »).

```bash
cd luffy-performance
npm install        # une seule fois
npm run dev        # puis ouvre http://localhost:5173
```

Autres commandes :

```bash
npm test           # 25 tests du moteur (cycle 5x8, conflits, musculation, repas, sauvegarde)
npm run build      # version de production dans dist/
npm run preview    # sert dist/ sur http://localhost:4173
```

## L'installer sur iPhone

1. Lance `npm run build`.
2. Mets le contenu du dossier `dist/` en ligne sur un hébergement HTTPS gratuit (GitHub Pages, Netlify, Cloudflare Pages). Les chemins sont relatifs : un sous-dossier fonctionne.
3. Ouvre l'adresse dans Safari, bouton Partager, « Sur l'écran d'accueil ».

Une fois installée, l'application fonctionne hors connexion (fichier `public/sw.js`).

Les données restent sur l'appareil où tu les saisis. Pour passer de l'ordinateur au téléphone : Paramètres, « Exporter (JSON) », puis « Importer un fichier » sur l'autre appareil.

## Rappels

Sans serveur, une application web ne peut pas sonner quand elle est fermée. Deux niveaux :

- rappels dans l'application quand elle est ouverte (Paramètres, Rappels), avec notifications du navigateur si tu les autorises ;
- export `.ics` (Paramètres, Rappels, « Exporter vers mon Calendrier ») : les postes, séances, repas et couchers deviennent des événements avec alerte dans l'application Calendrier du téléphone.

## Comment le planning est calculé

Tout est dans `src/lib/engine.ts`, sans dépendance à l'interface.

- **Postes** : cycle Matin, Matin, Après-midi, Après-midi, Nuit, Nuit, Repos ×4, ancré au 11 novembre 2026 (jour 1). Une exception ne touche qu'un jour ; un recalage recalcule tous les jours suivants.
- **JJB** : chaque créneau est comparé au poste, à une marge avant la prise de poste (1 h 30) et après la fin de poste (1 h), au sommeil qui suit une nuit et à l'heure de réveil. Résultat : compatible, raccourci, ou en conflit. Un conflit est affiché, jamais supprimé : c'est toi qui annules ou maintiens.
- **Musculation** : par cycle de 10 jours, les deux meilleurs jours sont retenus (matins de poste d'après-midi et jours de repos sans JJB en priorité), jamais un lendemain de nuit, avec au moins un jour d'écart. Rotation A, B, C. Un cycle sur quatre est allégé. Une séance courte bonus est proposée sur un troisième jour favorable.
- **Sommeil** : réveil et coucher dépendent du poste du jour et de celui du lendemain ; 8 heures minimum par 24 heures, siestes comprises.
- **Récupération** : sommeil réel, qualité et fatigue des trois derniers jours donnent un niveau (bonne, moyenne, insuffisante) qui allège ou propose de déplacer la séance.
- **Repas** : horaires de référence par poste, décalés autour du JJB ; plats en rotation, même boîte pour les deux jours d'un même poste.

Marges, horaires, créneaux et charges maximales se règlent dans Paramètres.

## Organisation du code

```
src/lib/        moteur de planning, récupération, courses, statistiques, sauvegarde
src/data/       exercices (schémas inclus) et 40 recettes
src/components/ interface partagée, graphiques, illustrations
src/pages/      les 8 écrans
tests/          tests du moteur
```
