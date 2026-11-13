# JJ3D v4.11.62 — Corbeille locale et sauvegardes renforcées

Version complète basée sur v4.11.61. Les modules Kanban, Finances, Boutique et QR sont conservés.

## Nouveautés
- Dans **Sauvegardes** : liste des éléments récupérables, bouton **Récupérer**, suppression définitive, vider et exporter la corbeille.
- Suppression récupérable pour **commandes personnalisées enregistrées dans JJ3D**, **bobines**, **accessoires hardware** et **entrées Personnel/Échecs/Tests**.
- Récupération ciblée qui refuse d'écraser un élément existant portant le même ID.
- Le JSON complet inclut désormais `localTrash` en archive de référence.
- Avant de restaurer un état complet, un JSON de sécurité des données actuelles est automatiquement téléchargé (vérifier les téléchargements).
- Toutes les pages, y compris Boutique, portent la version 4.11.62.

## Limites importantes
- **La corbeille est locale au navigateur** (localStorage). Elle n'est pas synchronisée entre appareils. Le JSON exporté contient la corbeille à titre d'archive mais sa réimportation n'est pas automatisée.
- Les suppressions réalisées directement dans le portail Boutique, les demandes/commandes de Firestore, les factures et les produits ne sont pas encore couvertes par cette corbeille. Les factures ne sont pas effacées par la suppression locale d'une commande personnalisée.
- Les photos Cloud/IndexedDB sont stockées séparément et ne sont pas incluses dans la sauvegarde JSON.
- La restauration complète reste risquée car elle peut écraser des modifications récentes ou synchroniser d'anciens états : utiliser de préférence « Récupérer ».
- Les tests sont limités aux vérifications statiques (syntaxe JS, présence des assets). Aucun test d'écriture réelle sur Firebase n'a été effectué.

**Avant de publier**, exporter une sauvegarde JSON depuis le site actuel. La publication GitHub Pages remplace les fichiers du site mais ne devrait pas modifier les enregistrements Firebase directement.
