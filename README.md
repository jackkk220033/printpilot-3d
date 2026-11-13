# JJ3D v4.11.60 — QR de tous les produits en téléchargement

Site complet, basé sur v4.11.59. Les vues Kanban, finances, Boutique, impressions et permissions Firebase restent inchangées.

Dans **Atelier → Étiquettes QR**, une nouvelle section montre chaque produit commercial (et variante) avec son QR et un bouton **PNG**. Le bouton **Télécharger tous les QR — ZIP** génère un fichier image pour chaque produit en une seule opération. Les images portent ID, nom et prix, et sont fabriquées localement par le navigateur, sans nouveau service ou abonnement.

Les QR utilisent les liens Boutique existants avec ID du produit : seuls les comptes autorisés peuvent voir la fiche et ses photos. Les photos ne sont pas intégrées au PNG, elles apparaissent sur la fiche après connexion. Les exports ne modifient pas les stocks ni les données Firebase.

Le ZIP est au format standard non compressé (images PNG déjà compressées). Une connexion Internet demeure nécessaire au chargement de la librairie QRCodeJS utilisée par le site. La version Boutique et les onglets passent tous à 4.11.60.

Avant de publier, exportez votre sauvegarde JSON. La syntaxe des scripts a été vérifiée; l’utilisation réelle dans Firebase doit être testée sur vos appareils.
