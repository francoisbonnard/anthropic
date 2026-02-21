# Anthropic Ecosystem — Visualisation 3D

Visualisation interactive 3D de l'écosystème Anthropic (MCP, Claude, Cowork, partenaires) avec React, Three.js et Vite.

**Production :** [https://zer0day.io/anthropic](https://zer0day.io/anthropic)

## Développement

```bash
npm install
npm run dev
```

## Déploiement (build + FTP)

Le script `npm run deploy` effectue automatiquement :

1. **Build** — génère le dossier `dist/` optimisé pour la production
2. **Upload FTP** — envoie le contenu vers l'hébergement OVH

### Configuration FTP

1. Copier le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```

2. Remplir les variables dans `.env` :
   ```
   FTP_HOST=ftp.votreserveur.ovh.net
   FTP_USER=votre_identifiant_ftp
   FTP_PASSWORD=votre_mot_de_passe_ftp
   FTP_REMOTE_PATH=/anthropic/
   FTP_PORT=21
   ```

   - **FTP_HOST** : adresse du serveur FTP OVH (ex. `ftp.cluster0XX.hosting.ovh.net`)
   - **FTP_USER** : identifiant FTP fourni par OVH
   - **FTP_PASSWORD** : mot de passe FTP
   - **FTP_REMOTE_PATH** : chemin distant. Sur OVH, utiliser `/home/zerdayt/www/anthropic/` (le dossier `www` est la racine web)
   - **FTP_PORT** : port FTP (21 par défaut)

3. Lancer le déploiement :
   ```bash
   npm run deploy
   ```

Le fichier `.env` est ignoré par Git pour ne pas exposer les identifiants.

### Dépannage : "Timeout while waiting for handshake"

Si SFTP échoue avec un timeout :

1. **Algorithms** — Le script inclut des algorithmes compatibles OVH. Si le problème persiste, essayez le FTP classique en désactivant SFTP dans `.env` :
   ```
   FTP_SFTP=false
   FTP_HOST=ftp.cluster130.hosting.ovh.net
   FTP_PORT=21
   ```

2. **Réseau** — Certains FAI ou réseaux d'entreprise bloquent les ports 21 (FTP) et 22 (SFTP). Tester depuis un autre réseau (ex. partage de connexion mobile).

3. **Gestionnaire de fichiers OVH** — En dernier recours, utiliser le gestionnaire de fichiers dans l'espace client OVH pour uploader manuellement le contenu de `dist/` dans le dossier `anthropic/`.

### Structure côté serveur

Le contenu de `dist/` est uploadé dans le dossier `anthropic/` à la racine du site. Structure finale :

```
/ (racine web zer0day.io)
  anthropic/
    index.html
    assets/
    vite.svg
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualiser le build (http://localhost:4173/anthropic/) |
| `npm run deploy` | Build + upload FTP |
| `npm run lint` | Vérification ESLint |

## Stack

- React 19
- Three.js / @react-three/fiber / @react-three/drei
- Vite 7
