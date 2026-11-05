# PrintPilot 3D — v4.6

Version créée à partir de la v4.5.1 corrigée.

## Nouveautés
- Trois temps : production réussie, hors production (échecs/personnel/tests), total global.
- Nouvelle section Personnel / Échecs / Tests dans la barre latérale et le menu mobile.
- Nouvelle utilisation : déduit les grammes réellement consommés des bobines et ajoute le temps hors production.
- Déplacement d’un produit provenant d’Excel : retire les unités du stock commercial, transfère le temps, **ne redéduit pas** le filament.
- Déplacement d’une impression du journal : conserve le filament déjà déduit; retire les unités du stock commercial.
- Rétablissement d’une entrée : restaure l’état précédent (et les grammes uniquement si la nouvelle entrée les avait déduits).
- Synchronisation et export JSON de la nouvelle section; compatibilité avec les anciens exports et snapshots cloud.
- Numéro de version actualisé dans l’onglet du navigateur.

## À vérifier avant utilisation
1. Télécharger une sauvegarde JSON complète depuis la v4.5.1.
2. Déployer ensemble index.html, css/style.css, js/app.js, ainsi que conserver js/cloud.js et js/firebase-config.js.
3. Attendre la synchronisation Firebase réussie avant de tester.
4. Pour un produit ancien (dragon), déplacer **une unité à la fois** via le formulaire de la nouvelle section.
5. Ne pas saisir à nouveau une impression ratée déjà déduite du filament : la reclasser.

**Remarque sur le temps** : le temps commercial suit la méthode historique (temps unitaire × quantité). Les nouvelles entrées hors production demandent la durée totale écoulée réelle. Un événement issu d’un lot existant réutilise la durée unitaire du produit.

**Limite** : il n'existe pas encore de test d'intégration sur le compte Firebase réel; vérifier sur une sauvegarde avant tout reclassement important.

La correction d’inventaire v4.5.1 a déjà été appliquée : **ne la réimporte pas** après la mise à jour v4.6.
