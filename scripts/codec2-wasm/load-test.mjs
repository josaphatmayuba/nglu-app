// Valide les criteres d'acceptation de la phase 7 du plan Ultra (voir
// CODEC2_WASM_IMPLEMENTATION_PLAN.md) sur la couche transport : perte de
// paquets, latence/reordonnancement, coupure reseau prolongee. N'ouvre pas de
// navigateur : simule le canal Socket.IO autour du transport binaire reel
// (chat-app/src/ultra/transport.js), qui est du JS pur importable en Node.
import { createCodec2Transport, ULTRA_FRAMES_PER_PACKET } from "../../chat-app/src/ultra/transport.js";

function makeFrame(seed) {
  return new Uint8Array([seed & 0xff, (seed >> 8) & 0xff, seed % 251, (seed * 7) % 251]);
}

/** Canal simule entre deux transports : perte, latence, reordonnancement. */
function createChannel({ lossRate = 0, latencyMs = 0, jitterMs = 0 } = {}) {
  const listeners = new Set();
  let dropped = 0;
  let delivered = 0;
  return {
    connected: true,
    on(event, fn) { if (event === "call:ultra:frame") listeners.add(fn); },
    off(event, fn) { if (event === "call:ultra:frame") listeners.delete(fn); },
    emit(event, data) {
      if (event !== "call:ultra:frame") return;
      if (Math.random() < lossRate) { dropped += 1; return; }
      const delay = latencyMs + (jitterMs > 0 ? Math.random() * jitterMs : 0);
      setTimeout(() => {
        delivered += 1;
        for (const fn of listeners) fn(data);
      }, delay);
    },
    stats: () => ({ dropped, delivered }),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function testInOrderDelivery() {
  const channel = createChannel();
  const received = [];
  const receiver = createCodec2Transport(channel, 1, { onFrame: (frame) => received.push(frame[0]) });
  const sender = createCodec2Transport(channel, 1, {});

  for (let i = 0; i < ULTRA_FRAMES_PER_PACKET * 4; i += 1) sender.sendFrame(makeFrame(i));
  await new Promise((r) => setTimeout(r, 400));

  assert(received.length === ULTRA_FRAMES_PER_PACKET * 4, `expected all frames in order, got ${received.length}`);
  for (let i = 1; i < received.length; i += 1) {
    assert(received[i] > received[i - 1] || received[i] === (received[i - 1] + 1) % 256, "frames out of order");
  }
  sender.close();
  receiver.close();
  console.log("PASS in-order delivery: 100% of frames received in sequence");
}

async function testPacketLoss(lossRate) {
  const channel = createChannel({ lossRate });
  const received = [];
  const receiver = createCodec2Transport(channel, 1, { onFrame: (frame) => received.push(frame[0]) });
  const sender = createCodec2Transport(channel, 1, {});

  // Echantillon large : a 20% de perte par paquet independant, l'ecart-type
  // sur un petit nombre de paquets peut faire largement devier le ratio
  // observe (loi binomiale). 300 paquets ramene cet ecart sous quelques %.
  const totalFrames = ULTRA_FRAMES_PER_PACKET * 300;
  for (let i = 0; i < totalFrames; i += 1) sender.sendFrame(makeFrame(i));
  await new Promise((r) => setTimeout(r, 1200));

  const stats = channel.stats();
  const deliveryRatio = received.length / totalFrames;
  // A ce taux de perte de PAQUETS (pas de trames), on attend une reception
  // proche de (1 - lossRate) des trames, avec une marge statistique.
  assert(deliveryRatio >= 1 - lossRate - 0.08, `delivery ratio ${deliveryRatio} too low for ${lossRate * 100}% packet loss`);
  sender.close();
  receiver.close();
  console.log(`PASS packet loss ${Math.round(lossRate * 100)}%: ${received.length}/${totalFrames} frames delivered (${stats.dropped} packets dropped), no crash`);
}

async function testJitterReordering() {
  // Latence de base + gigue forte : simule des paquets qui arrivent dans le
  // desordre. Le transport doit rejeter les trames en retard sans planter,
  // et ne jamais faire reculer la sequence jouee (cf sequenceDelta).
  const channel = createChannel({ latencyMs: 100, jitterMs: 400 });
  const received = [];
  const receiver = createCodec2Transport(channel, 1, { onFrame: (frame) => received.push(frame[0]) });
  const sender = createCodec2Transport(channel, 1, {});

  for (let i = 0; i < ULTRA_FRAMES_PER_PACKET * 20; i += 1) {
    sender.sendFrame(makeFrame(i));
    await new Promise((r) => setTimeout(r, 5));
  }
  await new Promise((r) => setTimeout(r, 1200)); // laisse la gigue max (500ms) s'ecouler

  assert(received.length > 0, "no frames survived jitter");
  let monotonic = true;
  for (let i = 1; i < received.length; i += 1) {
    const prev = received[i - 1];
    const cur = received[i];
    const wrapped = cur < prev && prev - cur > 128;
    if (cur <= prev && !wrapped) monotonic = false;
  }
  assert(monotonic, "out-of-order frame was played instead of dropped");
  sender.close();
  receiver.close();
  console.log(`PASS jitter/reordering: ${received.length} frames delivered, sequence stayed monotonic (no Codec2 desync)`);
}

async function testExtendedOutage() {
  // Coupure reseau prolongee (aucun paquet ne passe), puis reprise : le
  // transport ne doit ni planter ni bloquer indefiniment sur les trames
  // perdues pendant le trou (cf resynchronisation sur gros delta).
  const channel = createChannel();
  const received = [];
  const receiver = createCodec2Transport(channel, 1, { onFrame: (frame) => received.push(frame[0]) });
  const sender = createCodec2Transport(channel, 1, {});

  for (let i = 0; i < ULTRA_FRAMES_PER_PACKET * 2; i += 1) sender.sendFrame(makeFrame(i));
  await new Promise((r) => setTimeout(r, 300));
  const beforeOutage = received.length;
  assert(beforeOutage > 0, "no frames received before outage");

  channel.connected = false; // coupure : sendFrame silencieusement no-op cote emission
  for (let i = 100; i < 100 + ULTRA_FRAMES_PER_PACKET * 2; i += 1) sender.sendFrame(makeFrame(i));
  await new Promise((r) => setTimeout(r, 300));
  assert(received.length === beforeOutage, "frames leaked during outage");

  channel.connected = true; // reprise reseau
  for (let i = 500; i < 500 + ULTRA_FRAMES_PER_PACKET * 2; i += 1) sender.sendFrame(makeFrame(i));
  await new Promise((r) => setTimeout(r, 300));
  assert(received.length > beforeOutage, "transport did not resume after outage");

  sender.close();
  receiver.close();
  console.log(`PASS extended outage + recovery: ${beforeOutage} frames before outage, ${received.length} after resume, call not stuck`);
}

const scenarios = [
  testInOrderDelivery,
  () => testPacketLoss(0.05),
  () => testPacketLoss(0.10),
  () => testPacketLoss(0.20),
  testJitterReordering,
  testExtendedOutage,
];

for (const scenario of scenarios) {
  await scenario();
}
console.log("Ultra transport load test: all scenarios passed");
