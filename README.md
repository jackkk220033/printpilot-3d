# PrintPilot v4.5 — rapprochement inventaire 5 novembre 2026

Cette version corrige le calcul de temps de fabrication équivalent (temps par unité × quantité) et ajoute un importeur sécurisé de correction du catalogue, dans **Impressions → Appliquer correction d’inventaire**.

1. Faites d’abord **Exporter une sauvegarde** depuis Impressions.
2. Publiez index.html, js/app.js et css/style.css ensemble sur GitHub Pages (et conservez le reste du site).
3. Ouvrez Impressions et cliquez **Appliquer correction d’inventaire**.
4. Sélectionnez le fichier `correction-inventaire.json` de ce paquet.
5. Vérifiez l’aperçu des changements et confirmez.
6. Vérifiez la synchronisation Firebase et les chiffres (stock : 2 254 $, production : 860:57 h, 248 unités, 101 variantes).

Le correctif refuse si votre catalogue, journal des impressions ou journal des ventes ont évolué depuis la sauvegarde du 5 novembre. Les bobines, le journal des impressions, les ventes, le hardware et les photos ne sont pas remplacés. Aucun filament n’est déduit.

Le temps affiché est **équivalent par unité**, pas le temps d’occupation réel de l’imprimante.
