const WORD_NUMS: Record<string, number> = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,
  eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,
  eighty:80,ninety:90,hundred:100,
};

function wordsToNumber(str: string): string | null {
  const digits = str.replace(/[^0-9]/g, "");
  if (digits) return digits;
  const words = str.toLowerCase().split(/[\s-]+/);
  let total = 0, current = 0, found = false;
  for (const w of words) {
    if (WORD_NUMS[w] !== undefined) {
      found = true;
      const n = WORD_NUMS[w];
      if (n === 100) current = (current || 1) * 100;
      else current += n;
    }
  }
  total += current;
  return found ? String(total) : null;
}

const TASK_ALIASES: Record<string, string[]> = {
  cleaning: ["clean","cleaned","cleaning","wash","washed","washing","scrub","scrubbed","wiped","wiping","mopped","swept","tidied"],
  repair: ["repair","repaired","repairing","fix","fixed","fixing","mend","mended","patched","replaced","replacing"],
  inspection: ["inspect","inspected","inspecting","inspection","check","checked","checking","examine","examined","look over","looked over","survey","surveyed"],
  maintenance: ["maintain","maintained","maintenance","service","serviced","servicing","upkeep","tuned"],
  fueling: ["fuel","fueled","fueling","gas","gassed","fill up","filled up","top off","topped off","refuel"],
  "pump-out": ["pump","pumped","pumping","pump out","pumped out","pumpout"],
  docking: ["dock","docked","docking","tie up","tied up","moor","moored","berth","berthed"],
  undocking: ["undock","undocked","untie","untied","cast off"],
  electrical: ["electric","electrical","wiring","wire","wired","outlet","breaker","battery","shore power"],
  plumbing: ["plumb","plumbing","pipe","drain","drained","faucet","leak","leaked","water line"],
  painting: ["paint","painted","painting","touch up","stain","stained","varnish","varnished"],
  winterizing: ["winterize","winterized","winterizing","prep for winter"],
  "de-icing": ["de-ice","de-iced","de-icing","deice","deiced","ice removal","salt","salted"],
  trash: ["trash","garbage","dump","dumped","haul","hauled","dispose","disposed","pickup","pick up","picked up"],
  landscaping: ["landscape","landscaped","landscaping","mow","mowed","trim","trimmed","weed","weeded","plant","planted"],
  "pressure washing": ["pressure wash","pressure washed","pressure washing","power wash","power washed"],
  detailing: ["detail","detailed","detailing","polish","polished","buff","buffed","wax","waxed"],
  general: ["general","misc","miscellaneous","other"],
};

export interface ParsedMemo {
  slipNumber: string | null;
  taskType: string | null;
  notes: string;
}

export function parseTranscript(text: string): ParsedMemo {
  if (!text) return { slipNumber: null, taskType: null, notes: "" };
  const lo = text.toLowerCase();

  // Slip number — digit patterns
  let slipNumber: string | null = null;
  const digitPatterns = [
    /slip\s*(?:number|num|no\.?|#)?\s*(\d{1,4}[a-z]?)/i,
    /(?:^|\s)#(\d{1,4}[a-z]?)\b/i,
    /slot\s*(\d{1,4}[a-z]?)/i,
    /dock\s*(\d{1,4}[a-z]?)/i,
  ];
  for (const p of digitPatterns) {
    const m = text.match(p);
    if (m) { slipNumber = m[1].toUpperCase(); break; }
  }

  // Slip number — word-number fallback
  if (!slipNumber) {
    const wordPattern = /slip\s*(?:number|num|no\.?)?\s+([\w\s-]{2,30}?)(?:\.|,|$|\band\b|\bi\b|\bwe\b|\bthen\b|\bcleaned|\brepair|\binspect)/i;
    const m = text.match(wordPattern);
    if (m) {
      const num = wordsToNumber(m[1]);
      if (num && num !== "0") slipNumber = num;
    }
  }

  // Task type — fuzzy match
  let taskType: string | null = null;
  let bestPos = Infinity;
  for (const [tt, aliases] of Object.entries(TASK_ALIASES)) {
    for (const alias of aliases) {
      const idx = lo.indexOf(alias);
      if (idx !== -1 && idx < bestPos) {
        const before = idx > 0 ? lo[idx - 1] : " ";
        const after = idx + alias.length < lo.length ? lo[idx + alias.length] : " ";
        if ((/[\s,.]/.test(before) || idx === 0) && (/[\s,.]/.test(after) || idx + alias.length === lo.length)) {
          taskType = tt;
          bestPos = idx;
        }
      }
    }
  }

  return { slipNumber, taskType, notes: text };
}
