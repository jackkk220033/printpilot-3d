# JJ3D v4.11.63 — Entretien des imprimantes

Version complète fondée sur v4.11.62, avec Kanban, Finances, Boutique, QR et Sauvegardes conservés.

## Améliorations dans Atelier > Entretien
- Tableau de bord : nombre d'entretiens, échéances en retard, échéances dans les sept prochains jours et date du dernier entretien.
- Journal complet : graissage, nettoyage, calibration, changement de buse, courroies, extrudeur, réparations et diagnostics.
- Enregistrement des coûts, des heures manuelles et des notes.
- Fréquence optionnelle en **jours**. JJ3D calcule le prochain rappel depuis l'entretien le plus récent de chaque type et imprimante.
- Filtre de l'historique par imprimante et export CSV.
- Les anciennes fiches d'entretien restent compatibles, sans conversion destructrice.
- Version 4.11.63 affichée sur la Boutique et les autres pages.

## Limites importantes
- Les rappels sont uniquement affichés **dans le site** (pas de push lorsque le téléphone est fermé).
- Les intervalles en jours sont facultatifs; si aucun n'est défini, aucun rappel n'est créé.
- Les heures réelles d'imprimante restent manuelles : aucun accès direct à Anycubic/Klipper.
- L'entretien est enregistré dans Firestore sous le document Atelier déjà utilisé. Aucun nouveau service ni frais.
- Tester l'enregistrement et l'export dans l'application publiée; seuls les tests statiques ont été effectués ici.
- Sauvegarder les données JSON avant publication.
