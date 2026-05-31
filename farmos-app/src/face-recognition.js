// Reconnaissance faciale animale (option 1 — MobileNet + cosinus).
// Tout tourne dans le navigateur :
//   1) loadFaceModel() charge MobileNet (lazy, ~5-15 MB depuis le CDN Google).
//   2) buildFaceIndex(model, animals) calcule un embedding par photo en
//      téléchargeant chaque data URL, et renvoie un index { animals, embeddings }.
//   3) findBestFace(model, frameOrImage, index, threshold) extrait l'embedding
//      du visage courant et renvoie le meilleur match (score cosinus) ou null
//      si on est sous le seuil.
//
// Précision attendue : 50-70 % sur bovins/porcins. C'est volontairement un
// MVP — on garde une UI honnête (affiche le score, propose "non reconnu"
// si on est sous le seuil).

let _modelPromise = null;

export async function loadFaceModel() {
  if (_modelPromise) return _modelPromise;
  _modelPromise = (async () => {
    // Dynamic import : ces deux paquets pèsent lourd, on les charge seulement
    // quand l'utilisateur entre vraiment dans le mode "Reco faciale".
    const tf = await import("@tensorflow/tfjs");
    const mobilenet = await import("@tensorflow-models/mobilenet");
    // version 2 alpha 1.0 = embedding 1024-d, plus précis que v1.
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    return { tf, model };
  })();
  return _modelPromise;
}

// Charge une image (data URL ou URL) en HTMLImageElement complet.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Extrait un embedding 1024-d (vecteur normalisé L2) à partir d'un élément
// <img>, <video> ou <canvas>.
export async function extractEmbedding({ tf, model }, sourceElement) {
  // infer(input, embedding=true) renvoie le tensor du pénultième layer.
  const t = model.infer(sourceElement, true); // shape [1, 1024]
  // Normalisation L2 pour rendre la similarité cosinus = produit scalaire.
  const n = tf.tidy(() => {
    const norm = tf.sqrt(tf.sum(t.square()));
    return t.div(norm.add(1e-8));
  });
  const arr = await n.data();
  t.dispose(); n.dispose();
  return Array.from(arr);
}

// Construit l'index : pour chaque animal, moyenne des embeddings de ses photos.
// Renvoie { animals: [...], embeddings: [Float32Array, ...] }.
export async function buildFaceIndex(modelBundle, animals, onProgress) {
  const out = { animals: [], embeddings: [] };
  let done = 0;
  const total = animals.reduce((s, a) => s + Math.min(a.photos?.length || 0, 3), 0);
  for (const a of animals) {
    const photos = (a.photos || []).slice(0, 3);
    const vectors = [];
    for (const p of photos) {
      try {
        const img = await loadImage(p.dataUrl);
        const vec = await extractEmbedding(modelBundle, img);
        vectors.push(vec);
      } catch (err) {
        // Photo cassée : on ignore, l'animal aura juste moins d'embeddings.
        // console.warn("face-index: skip photo", p.id, err);
      }
      done++;
      if (onProgress) onProgress({ done, total });
    }
    if (vectors.length === 0) continue;
    // Moyenne des vecteurs puis re-normalisation.
    const mean = new Float32Array(vectors[0].length);
    for (const v of vectors) for (let i = 0; i < v.length; i++) mean[i] += v[i];
    for (let i = 0; i < mean.length; i++) mean[i] /= vectors.length;
    let norm = 0;
    for (let i = 0; i < mean.length; i++) norm += mean[i] * mean[i];
    norm = Math.sqrt(norm) + 1e-8;
    for (let i = 0; i < mean.length; i++) mean[i] /= norm;
    out.animals.push(a);
    out.embeddings.push(mean);
  }
  return out;
}

// Similarité cosinus entre 2 vecteurs déjà normalisés = produit scalaire.
function cosine(a, b) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

// Cherche le meilleur match dans l'index. Si le score max est sous threshold,
// renvoie { match: null, score, runnerUp }.
export async function findBestFace(modelBundle, sourceElement, index, threshold = 0.78) {
  if (!index || !index.embeddings.length) return { match: null, score: 0 };
  const q = await extractEmbedding(modelBundle, sourceElement);
  let bestIdx = -1, bestScore = -1, secondScore = -1;
  for (let i = 0; i < index.embeddings.length; i++) {
    const s = cosine(q, index.embeddings[i]);
    if (s > bestScore) { secondScore = bestScore; bestScore = s; bestIdx = i; }
    else if (s > secondScore) { secondScore = s; }
  }
  const passes = bestScore >= threshold;
  return {
    match: passes ? index.animals[bestIdx] : null,
    score: bestScore,
    runnerUp: secondScore,
  };
}
