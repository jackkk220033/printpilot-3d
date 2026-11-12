# JJ3D v4.11.49 — Récupération sécurisée des commandes

## Récupérer la commande de Lucie
1. Publier ce dossier complet sur Firebase Hosting.
2. Rafraîchir JJ3D et ouvrir **Commandes personnalisées**.
3. La section **🛟 Commandes à récupérer** liste les factures qui portent une référence de commande disparue.
4. Cliquer sur **Récupérer cette commande** en face de Lucie Gascon / JJ3D-2026-0003, puis confirmer.
5. Vérifier les informations de la fiche, la facture et l'impression en pause.

Le bouton ne crée aucune nouvelle facture ni aucune tâche d'impression. Il réutilise l'identifiant `customOrderId` de la facture lorsqu'il est disponible. Si cet identifiant manque, le rapprochement de la tâche Atelier devra être vérifié séparément. Les détails de commande non présents sur la facture ne peuvent pas être garantis (photos, dimensions, etc.).

**Important :** avant récupération, exporter les données complètes en JSON depuis **Sauvegardes de sécurité**. La synchronisation cloud doit être active et sans conflit. La suppression directe exige désormais de taper `SUPPRIMER` et garde une copie locale de la dernière commande supprimée.

Cette version ne règle **pas encore** les notifications push en arrière-plan. Aucun changement Firestore Rules requis pour cette réparation.

## v4.11.49 — captures d’écran sans enregistrement
Dans Commandes personnalisées, ouvre une commande, fais Win+Shift+S, clique « Coller une capture ici (Ctrl + V) » sous le produit (ou la couleur), puis Ctrl+V. Vérifie l’aperçu et enregistre la commande. La capture suit la sauvegarde photo existante. Aucune modification de règles Firestore nécessaire pour cette fonction.
