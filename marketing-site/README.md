# ONGD NGOLU — Site vitrine

Site statique vitrine pour l'ONGD NGOLU. Présente la mission (souveraineté alimentaire, soutien aux orphelinats, logiciel de gestion).

## Stack
- HTML statique (un seul fichier `index.html`)
- Tailwind CSS via CDN (pas de build)
- Lucide icons via CDN
- Google Fonts (Inter + Playfair Display)

## Voir en local
Ouvrir simplement `index.html` dans un navigateur, ou lancer un serveur statique :
```bash
cd marketing-site
python -m http.server 8000
# → http://localhost:8000
```

## Voir en dev (déployé)
- URL : https://dev.ongdngolu.org/site/
- Servi par le nginx prod via un bind mount des fichiers de cette branche
- Le `develop` push déploie automatiquement les changements

## Structure
```
marketing-site/
├── index.html          # Toute la page
├── assets/
│   └── logo.png        # Logo ONGD NGOLU (rond bleu/jaune)
└── README.md
```

## Sections
1. **Hero** — Titre fort + CTA (don, mission)
2. **Mission** — 3 cartes (Alimentaire, Humanitaire, Numérique)
3. **Agriculture & Élevage** — 4 piliers (Produits locaux, Poulet, Porc, Bœuf)
4. **Impact Social** — Soutien aux orphelinats (nourriture, soins, éducation)
5. **Technologie** — Logiciel de gestion + mockup dashboard
6. **Don** — CTA avec montants suggérés
7. **Footer** — Contact, navigation, lien vers l'ERP

## Liens
- **Se connecter** → https://ongdngolu.org (ERP existant)
- **Faire un don** → ancre `#don` puis `mailto:don@ongdngolu.org` (à brancher sur une vraie passerelle de paiement plus tard)

## Couleurs
- Primary blue : `#1e3a8a` (logo)
- Accent yellow : `#f59e0b` (bétail / dons)
- Growth green : `#16a34a` (agriculture)
- Slate neutrals pour le texte
