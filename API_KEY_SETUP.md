# Configuration de la clé API Google Maps

## Méthode recommandée : Utiliser un fichier .env

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez votre clé API :
   ```
   GOOGLE_MAPS_API_KEY=*****************************
   ```
3. Le fichier `.env` est automatiquement ignoré par git (déjà dans .gitignore)
4. Lors du build (`npm run build`), la clé sera injectée dans un fichier `api-key.js` obfusqué

## Méthode de fallback : Fichier Clé API.txt

Si le fichier `.env` n'existe pas, le build utilisera automatiquement `Clé API.txt` comme fallback.

**⚠️ Important** : Le fichier `Clé API.txt` ne sera PAS copié dans le dossier `dist/` lors du build pour des raisons de sécurité.

## Fichiers concernés

- `app.js` : Charge Google Maps pour la carte principale
- `parcours.html` : Charge Google Maps pour la sélection de circuit

Les deux fichiers utilisent maintenant `window.__GOOGLE_MAPS_API_KEY__` qui est injecté par `api-key.js` (créé lors du build).

## Sécurité

- Le fichier `api-key.js` est obfusqué lors du build
- Le fichier `.env` n'est jamais copié dans `dist/`
- Le fichier `Clé API.txt` n'est jamais copié dans `dist/`
- En développement, vous pouvez toujours utiliser `Clé API.txt` directement (fallback)


