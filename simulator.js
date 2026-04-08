const http = require('http');

console.log("=========================================");
console.log("   PillPal True Hardware Simulator       ");
console.log("=========================================");

const NEXT_JS_API = "localhost";
const NEXT_JS_PORT = 3000;
const MAC_ADDRESS = "A1:B2:C3:D4:E5:F6"; 

// ── Schedule (Local Fallback exactly like ESP32) ─────────────────────────
const schedule = [
  { hour: 9, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 20, minute: 0 }
];

let currentSlot = 0;
let lastDispensedHour = -1;
let lastDispensedDay = -1;
let dispensed = Array(7).fill(null).map(() => [false, false, false]);

// Stepper Logic Helpers (Simulated)
const getDayIndex = (day) => day === 0 ? 6 : (day - 1);
const getTargetSlot = (dayIndex, sessionIndex) => 1 + (dayIndex * 3) + sessionIndex;

const pingHeartbeat = () => {
  const req = http.request({
    hostname: NEXT_JS_API,
    port: NEXT_JS_PORT,
    path: '/api/ping',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let responseData = '';
    res.on('data', (chunk) => responseData += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        // 1. Sync schedule from cloud
        if (result.schedule && Array.isArray(result.schedule) && result.schedule.length === 3) {
           for (let i=0; i<3; i++) {
             schedule[i].hour = result.schedule[i].hour;
             schedule[i].minute = result.schedule[i].minute;
           }
        }
        
        // 2. Sync reset command
        if (result.success && result.current_slot === 0 && currentSlot !== 0) {
           console.log("\n[Cloud] Remote REST Command: Reset Motor to Slot 0!");
           dispensed = Array(7).fill(null).map(() => [false, false, false]);
           lastDispensedHour = -1; lastDispensedDay = -1;
           currentSlot = 0;
        }
      } catch(e) {}
    });
  });
  req.on('error', () => {}); 
  req.write(JSON.stringify({ mac_address: MAC_ADDRESS }));
  req.end();
};

const dispense = (targetSlot, dayIndex = -1, sessionIndex = -1) => {
  if (dayIndex !== -1) dispensed[dayIndex][sessionIndex] = true;
  
  const stepsNeeded = (targetSlot - currentSlot + 22) % 22;
  console.log(`[Dispenser] Moving ${stepsNeeded} slot(s) → slot ${targetSlot}`);
  currentSlot = targetSlot;
  
  const payload = JSON.stringify({ mac_address: MAC_ADDRESS, slot_number: targetSlot });
  const req = http.request({
    hostname: NEXT_JS_API,
    port: NEXT_JS_PORT,
    path: '/api/dispense',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length }
  }, (res) => {
    let responseData = '';
    res.on('data', (chunk) => responseData += chunk);
    res.on('end', () => {
      let result = {};
      try { result = JSON.parse(responseData); } catch(e){}
      if (res.statusCode === 200) console.log(`[Cloud] Dispense Logged in Supabase: Slot ${targetSlot}`);
      else console.error(`[Cloud] API Error (${res.statusCode}):`, result.error || responseData);
    });
  });
  req.on('error', () => console.error(`[Cloud] Failed to connect to Next.js API. Is it running on port 3000?`));
  req.write(payload);
  req.end();
};

// ── Main Event Loop (matches ESP32 loop()) ────────────────────────────────
setInterval(() => {
  pingHeartbeat();
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentWday = now.getDay();
  
  for (let s = 0; s < 3; s++) {
    if (currentHour === schedule[s].hour && currentMinute === schedule[s].minute) {
      if (!(lastDispensedHour === currentHour && lastDispensedDay === currentWday)) {
        const dayIndex = getDayIndex(currentWday);
        const targetSlot = getTargetSlot(dayIndex, s);
        
        console.log(`\n[Schedule] Auto-dispense TRIGGER: day=${dayIndex} session=${s} slot=${targetSlot}`);
        dispense(targetSlot, dayIndex, s);
        
        lastDispensedHour = currentHour;
        lastDispensedDay = currentWday;
      }
      break;
    }
  }
}, 5000); // Heartbeat loop runs every 5 seconds

// ── Allow manual testing from terminal ────────────────────────────────
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
readline.on('line', (input) => {
  if (input.trim() === 'reset') {
    dispensed = Array(7).fill(null).map(() => [false, false, false]);
    lastDispensedHour = -1; lastDispensedDay = -1;
    currentSlot = 0;
    console.log("[System] Simulator reset. Back to slot 0.");
  } else {
    const slot = parseInt(input.trim());
    if (!isNaN(slot) && slot >= 0 && slot <= 21) dispense(slot);
    else console.log("Type 0-21 to dispense, or 'reset' to clear.");
  }
});

console.log(`✅ Simulator running true RTC schedule checks (${schedule.map(s => `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`).join(', ')})`);
console.log(`✅ Type 'reset' to rewind motor, or 0-21 to trigger a direct slot POST.\n`);