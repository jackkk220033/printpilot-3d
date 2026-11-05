# PrintPilot 3D v4.10 — Atelier intégré & notifications par section

Cette version reprend tous les fichiers de la **v4.9.1** et conserve les règles Firebase correspondantes. Elle modifie seulement la navigation et la présentation du module Atelier +, sans changer les données, les actions, les calculs, les collections Firebase ou les permissions.

## Changements
- Les huit outils possèdent chacun leur lien dans le **menu principal** et dans **Plus** sur téléphone : Stock Boutique, Demandes, À imprimer, Prévisions, Étiquettes QR, Statistiques atelier, Entretien et Rapports.
- Ils apparaissent **dans la page principale de PrintPilot**, sous la même barre supérieure et dans le même thème, sans ouvrir une deuxième application ni un nouvel onglet. Le module existant est hébergé dans un cadre intégré pour conserver son comportement Firebase éprouvé.
- Les notifications de Demandes affichent désormais leur badge directement **à côté du lien Demandes Boutique**. Le badge Messages reste à côté de Messages Boutique.
- Lorsqu'il y a des éléments à traiter, une barre de notifications fournit des **liens directs vers la bonne section**, plutôt qu'un chiffre sans destination.
- `atelier-plus.html` reste présent pour compatibilité avec d'anciens liens; `?embedded=1&tab=demandes` sert à l'affichage interne.

## Installation
1. Fais une sauvegarde JSON de PrintPilot.
2. Remplace sur GitHub tous les fichiers du ZIP en respectant les dossiers `js/` et `css/`; ne supprime pas `atelier-plus.html`.
3. **Aucun changement de règles Firestore n'est nécessaire** si les règles v4.9.1 fonctionnent déjà. Le fichier `firestore.rules` dans le ZIP est identique.
4. Attends la coche verte de GitHub Pages et recharge avec `Ctrl+Shift+R`. Le titre doit afficher **v4.10**.
5. Clique sur les huit sections du menu et teste une demande Boutique, son badge et le lien vers la bonne page.

## Précision
Les notifications fonctionnent en temps réel **quand PrintPilot est ouvert et connecté**. Il ne s'agit pas encore de notifications système lorsque le navigateur est fermé. Les données Atelier restent dans leurs collections Firebase existantes et le stock principal n'est pas modifié par une demande en attente.
