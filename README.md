# JJ3D v4.11.72 — Gestion PRO : 7 améliorations

**Fichier complet** à décompresser et publier sur GitHub Pages. Même numéro de version sur toutes les pages, y compris Boutique. Aucun abonnement requis.

## Nouvelle section Outils & statistiques → Gestion PRO
1. **Calculateur de prix** : coût filament + électricité + accessoires, marge cible et commission Boutique. Prix conseillé en simulation, paramètres enregistrables.
2. **Planning** : plages d'impression manuelles par machine avec avertissement de chevauchement et échéances issues des commandes personnalisées.
3. **Variantes** : regroupement visuel des fiches produits portant le même nom; stocks, prix et IDs individuels préservés.
4. **Contrôle qualité** : journal des inspections liées aux impressions avec résultat, date, coûts additionnels et notes.
5. **Liste d'achats** : suggestions pour bobines ≤200 g et hardware sous seuil; progression À acheter → Commandé → Reçu.
6. **Promotions** : simulation et enregistrement des rabais, dates et prix proposés, sans appliquer automatiquement le rabais aux ventes.
7. **Journal d'activité** : enregistrer les changements du module et les modifications significatives des tableaux produits, ventes, factures, clients et commandes après mise à jour. Export CSV.

## Sécurité des données
- Les données Gestion PRO sont rangées dans `extras.proTools`, synchronisées via le workspace JJ3D/Firebase existant, et incluses dans les sauvegardes JSON.
- **Aucune déduction de stock ni changement de facture** sur un simple calcul de prix, une inspection ou un rabais proposé.
- Les fonctionnalités de planification et de promotions ne déclenchent **pas** automatiquement de travail sur l'imprimante, de vente ou d'affichage public des rabais.
- Le journal est applicatif et non une preuve d'audit infalsifiable. Les autres modules Firebase, notamment Atelier+ et Boutique, ne sont pas encore entièrement instrumentés.
- Exporter un JSON avant la publication; vérifier la synchronisation Firebase puis tester d'abord avec des données non critiques.

## Vérifications
Tests syntaxiques JavaScript et intégrité du ZIP. Pas de tests live sur le compte Firebase ni sur smartphone.


## v4.11.72 — Boutique PRO
- Accueil Boutique : stock catalogue publié, nombre de produits, prochaines productions et bons à recevoir, nouveautés et raccourcis.
- Caisse Boutique : panier multi-articles, recherche par nom/ID, photos, quantités et total indicatif.
- Depuis les fiches produit / QR : ajouter à la caisse sans saisir le nom.
- Envoi de chaque ligne du panier comme demande de vente existante Firestore : pas de déduction automatique ni double caisse. En cas de succès partiel, seules les lignes non envoyées restent pour nouvelle tentative.
- Historique des déclarations envoyées affiché **localement et uniquement sur le même appareil**; les validations officielles restent dans l'Atelier, les règles Firestore n'autorisant pas la Boutique à consulter le registre des demandes.
- Réception des bons existante conservée : les envois ne se transforment pas en ventes.
- Numéro de version synchronisé sur Atelier, Boutique, autres pages.
- Sauvegarder les données JSON avant publication.
- Réception : bouton « Tout reçu » qui préremplit les quantités dans le formulaire existant; la validation administrateur demeure obligatoire.
