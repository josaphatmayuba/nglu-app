# Plan d'implementation - Audio Codec2 WASM

## Objectif

Ajouter un mode audio de secours capable de maintenir deux voix simultanees
sur une connexion proche de 1 kbit/s par direction.

Le mode WebRTC/Opus reste le mode normal. Le mode Codec2 est active lorsque la
connexion tombe durablement sous 8 kbit/s.

Contraintes acceptees :

- voix tres compressee, de type radio/talkie-walkie ;
- delai de lecture d'environ 1 a 3 secondes ;
- deux flux simultanes, un dans chaque direction ;
- bascule automatique et retour vers WebRTC lorsque le reseau revient.

## Etat d'avancement

- [x] Contrat initial du mode Ultra documente.
- [x] Codec2 700C compile en WebAssembly.
- [x] Wrapper C et adaptateur JavaScript lazy-loades.
- [x] Smoke test encode/decode valide.
- [x] Capture AudioWorklet et lecture tamponnee.
- [ ] Transport binaire full-duplex.
- [ ] Bascule automatique depuis WebRTC.

Codec2 est un codec vocal open source en C99, sous licence LGPL 2.1. Le projet
officiel documente notamment le mode 700C a environ 700 bit/s :
[depot officiel Codec2](https://github.com/drowe67/codec2).

## Architecture cible

```text
Micro A -> AudioWorklet -> Codec2 WASM -> flux binaire -> serveur -> B
Micro B -> AudioWorklet -> Codec2 WASM -> flux binaire -> serveur -> A
```

Le serveur ne decode pas l'audio. Il authentifie l'appel, verifie le `callId`
et relaie les trames binaires entre les deux participants.

## Phase 1 - Contrat du mode Ultra

Definir les seuils et les etats :

- `WEBRTC` : mode normal ;
- `PREPARING_ULTRA` : les deux participants preparent le codec ;
- `ULTRA` : deux flux Codec2 actifs ;
- `RETURNING_TO_WEBRTC` : retour apres stabilisation du reseau.

Regles initiales proposees :

- entrer en Ultra sous 8 kbit/s ou apres deux fenetres de perte elevee ;
- revenir vers WebRTC au-dessus de 16 kbit/s pendant au moins 10 secondes ;
- ne jamais changer de mode pendant qu'une trame est en cours d'envoi ;
- conserver l'appel actif pendant une perte temporaire.

## Phase 2 - Codec2 en WebAssembly

1. Ajouter Codec2 comme source externe ou sous-module.
2. Compiler `libcodec2` en `.wasm` avec Emscripten.
3. Exposer une API minimale :

```text
encode(Int16Array samples) -> Uint8Array frame
decode(Uint8Array frame) -> Int16Array samples
```

4. Tester les modes 700C et 450/700 selon le debit disponible.
5. Comparer la qualite, la charge CPU et la taille des trames.
6. Conserver les notices de licence et verifier les obligations LGPL avant
   distribution.

Le fichier WASM doit etre charge uniquement lorsque le mode Ultra est requis,
afin de ne pas alourdir le chargement normal du chat.

## Phase 3 - Capture et lecture audio

Creer un `AudioWorkletProcessor` qui :

- capture le micro en mono ;
- convertit le signal vers 8 kHz ;
- decoupe l'audio en trames d'environ une seconde ;
- transmet les echantillons au codec WASM hors du thread principal ;
- detecte les silences et evite d'envoyer des donnees inutiles.

Le decodeur doit alimenter un tampon de lecture de 1 a 3 secondes. Si une
trame manque, il utilise la derniere trame valide ou un silence court au lieu
de couper l'appel.

## Phase 4 - Transport full-duplex

Chaque direction possede son flux independant. Une trame contient :

```text
version | callId | direction | sequence | timestamp | codecMode | payload
```

Le transport doit fournir :

- donnees binaires, jamais du JSON audio ;
- numero de sequence par direction ;
- accuse de reception leger ;
- reprise apres reconnexion ;
- abandon des trames trop anciennes ;
- protection contre les doublons et les trames hors ordre.

Premiere option : utiliser les evenements binaires Socket.IO deja presents.
Si leur overhead est trop eleve, ajouter un endpoint WebSocket binaire dedie.

Pour une conversation temps reel, une trame trop ancienne ne doit pas etre
retransmise indefiniment : la priorite est la continuite de la conversation,
pas la livraison parfaite de chaque echantillon.

## Phase 5 - Bascule automatique

Ajouter un negociateur de mode dans `useCall` :

1. mesurer perte, gigue, latence et debit disponible ;
2. annoncer `ultra:prepare` a l'autre participant ;
3. attendre la confirmation des deux cotes ;
4. demarrer les deux encodeurs ;
5. arreter l'envoi RTP WebRTC sans liberer le micro ;
6. activer les flux Codec2 ;
7. revenir vers WebRTC uniquement apres stabilisation confirmee.

La bascule doit etre coordonnee. Un participant ne doit jamais encoder en
Codec2 pendant que l'autre attend encore de l'Opus.

## Phase 6 - Interface utilisateur

Afficher dans la barre d'appel :

- `Connexion normale` ;
- `Mode economie extreme` ;
- `Voix compressee` ;
- `Tampon audio : 2 s` ;
- `Reconnexion en cours`.

Ajouter un bouton manuel `Mode economie extreme` pour faciliter les tests et
permettre de forcer le mode Ultra sans attendre la detection reseau.

## Phase 7 - Tests et criteres d'acceptation

Tester les deux directions simultanement avec :

- 1 kbit/s emission et reception ;
- perte de paquets de 5 %, 10 % et 20 % ;
- latence de 500 ms a 2 secondes ;
- coupure reseau de 5 a 15 secondes ;
- reconnexion d'un participant ;
- passage WebRTC -> Ultra ;
- retour Ultra -> WebRTC.

Le mode sera valide si :

- les deux voix restent audibles a 1 kbit/s par direction ;
- l'appel ne se termine pas sur une perte temporaire ;
- le debit moyen utile reste compatible avec la limite ;
- les trames manquantes provoquent une breve degradation, pas une coupure ;
- le retour vers WebRTC ne perd pas l'appel.

## Ordre de livraison

1. Prototype local encode/decode Codec2 WASM.
2. Capture et lecture AudioWorklet.
3. Transport binaire entre deux onglets.
4. Test full-duplex a 1 kbit/s.
5. Integration dans `useCall`.
6. Bascule automatique et interface.
7. Tests de regression WebRTC.
8. Activation d'abord sur dev avec un feature flag.

Le mode WebRTC actuel ne doit pas etre supprime avant que le prototype Ultra
ait passe les tests full-duplex a 1 kbit/s.
