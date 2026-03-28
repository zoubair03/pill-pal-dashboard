const { WebSocketServer } = require('ws');

// --- CONSTANTS MATCHING ESP32 ---
const PORT = 81;
const NUM_SLOTS = 22;
const SESSIONS = ["Morning", "Midday", "Night"];

// --- INTERNAL STATE MATCHING ESP32 ---
let state = {
  currentSlot: 0,
  dispensing: false,
  wifi: true,
  ip: "127.0.0.1 (SIMULATED)",
  schedule: [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 20, minute: 0 }
  ],
  dispensed: Array(7).fill(0).map(() => [false, false, false]), // 7x3 Grid
  lastDispensedHour: -1,
  lastDispensedDay: -1
};

const wss = new WebSocketServer({ port: PORT });
console.log(`🚀 PillPal ESP32 Simulator running on ws://localhost:${PORT}`);

// --- HELPER: CALCULATE NEXT DOSE (Mirrors C++ broadcastStatus) ---
function getNextDoseInfo() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  let nextMins = -1;
  let nextSession = -1;

  for (let s = 0; s < 3; s++) {
    let sm = state.schedule[s].hour * 60 + state.schedule[s].minute;
    if (sm > nowMinutes) {
      nextMins = sm;
      nextSession = s;
      break;
    }
  }

  if (nextMins === -1) {
    nextMins = state.schedule[0].hour * 60 + state.schedule[0].minute;
    nextSession = 0;
  }

  const minutesUntilNext = (nextMins > nowMinutes) 
    ? (nextMins - nowMinutes) 
    : (nextMins + 24 * 60 - nowMinutes);

  return { nextMins, nextSession, minutesUntilNext };
}

// --- CORE: BROADCAST STATUS ---
function broadcastStatus() {
  const now = new Date();
  const { nextMins, nextSession, minutesUntilNext } = getNextDoseInfo();

  const payload = {
    type: "status",
    currentSlot: state.currentSlot,
    dispensing: state.dispensing,
    wifi: state.wifi,
    ip: state.ip,
    time: now.toLocaleTimeString('en-GB'),
    wday: now.getDay(), // 0=Sun, 1=Mon...
    hour: now.getHours(),
    minute: now.getMinutes(),
    nextDoseMinutes: nextMins,
    nextSession: nextSession,
    minutesUntilNext: minutesUntilNext,
    dispensed: state.dispensed,
    schedule: state.schedule
  };

  const json = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(json);
  });
}

// --- CORE: DISPENSE LOGIC ---
async function dispense(targetSlot, dayIndex, sessionIndex) {
  state.dispensing = true;
  console.log(`⚙️ Motor spinning to slot ${targetSlot}...`);
  broadcastStatus();

  // Simulate motor travel time (100ms per slot like C++ delay)
  const steps = Math.abs(targetSlot - state.currentSlot);
  await new Promise(resolve => setTimeout(resolve, steps * 100 + 500));

  state.currentSlot = targetSlot;

  if (dayIndex >= 0 && dayIndex < 7) {
    state.dispensed[dayIndex][sessionIndex] = true;
    
    // Send Alert Event
    const alert = JSON.stringify({
      type: "dispensed",
      slot: targetSlot,
      day: dayIndex,
      session: sessionIndex
    });
    wss.clients.forEach(c => c.send(alert));
    console.log(`✅ Dispensed: Day ${dayIndex}, Session ${sessionIndex}`);
  }

  state.dispensing = false;
  broadcastStatus();
}

// --- WEBSOCKET EVENT HANDLER ---
wss.on('connection', (ws) => {
  console.log("📱 Dashboard connected to Simulator");
  broadcastStatus();

  ws.on('message', (message) => {
    const cmd = JSON.parse(message);
    
    switch (cmd.action) {
      case "ping":
        broadcastStatus();
        break;

      case "dispense":
        const slot = 1 + (cmd.day * 3) + cmd.session;
        dispense(slot, cmd.day, cmd.session);
        break;

      case "reset":
        state.dispensed = Array(7).fill(0).map(() => [false, false, false]);
        console.log("♻️ Grid Reset. Returning to home.");
        dispense(0, -1, -1);
        break;

      case "setschedule":
        state.schedule = cmd.schedule;
        console.log("📅 Schedule Updated:", state.schedule);
        state.lastDispensedHour = -1;
        broadcastStatus();
        break;
    }
  });
});

// --- SIMULATION LOOPS ---
// 1. Broadcast status every 10 seconds (Matches ESP32 loop)
setInterval(broadcastStatus, 10000);

// 2. Check schedule every 30 seconds (Auto-dispense simulation)
setInterval(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentWday = now.getDay();
  const dayIndex = currentWday === 0 ? 6 : currentWday - 1;

  state.schedule.forEach((s, index) => {
    if (s.hour === currentHour && s.minute === currentMin) {
      if (!(state.lastDispensedHour === currentHour && state.lastDispensedDay === currentWday)) {
        console.log("⏰ AUTO-DISPENSE TRIGGERED");
        const target = 1 + (dayIndex * 3) + index;
        dispense(target, dayIndex, index);
        state.lastDispensedHour = currentHour;
        state.lastDispensedDay = currentWday;
      }
    }
  });
}, 30000);