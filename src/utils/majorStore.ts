const STORAGE_KEY = "sbu_email_to_major_session_db";

const KNOWN_MAJOR_MAP: Record<string, string> = {
  bme: "Biomedical Engineering",
  "pre-bme": "Biomedical Engineering",
  "pre bme": "Biomedical Engineering",
  "biomedical engineering": "Biomedical Engineering",
  mec: "Mechanical Engineering",
  "mechanical engineering": "Mechanical Engineering",
  cse: "Computer Science",
  cs: "Computer Science",
  "computer science": "Computer Science",
  "computer science, dual major in business management": "Computer Science",
  "ams / cse": "Applied Mathematics and Statistics",
  ams: "Applied Mathematics and Statistics",
  "data science & business management": "Data Science",
  "civil engineering": "Civil Engineering",
  "civil engineering + applied math & statistics": "Civil Engineering",
  "electrical engineering": "Electrical Engineering",
  "computer engineering": "Computer Engineering",
  "engineering science": "Engineering Science",
  "engineering chemistry": "Engineering Chemistry",
  "technical systems management, specialized in industrial engineering":
    "Technical Systems Management",
  "applied mathematics and statistics": "Applied Mathematics and Statistics",
  biology: "Biology",
  "biology bs": "Biology",
  biochemistry: "Biochemistry",
  neuroscience: "Neuroscience",
  physics: "Physics",
  "environment studies": "Environmental Studies",
  "environmental studies": "Environmental Studies",
  "health science": "Health Science",
  nursing: "Nursing",
  "business management": "Business Management",
  "business administration": "Business Management",
  "business (finance)": "Business Management",
  psychology: "Psychology",
  "psychology and political science": "Psychology",
  "communications and psychology": "Psychology",
  "political science": "Political Science",
  "political science & economics": "Political Science",
  journalism: "Journalism",
};

export const normalizeEmail = (email?: string): string => {
  if (!email) return "";
  return email
    .replace(
      /[\s\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]+/g,
      "",
    )
    .toLowerCase();
};

export const normalizeMajor = (rawMajor?: string): string => {
  if (!rawMajor) return "Unknown";
  const norm = rawMajor
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!norm || norm === "unknown") return "Unknown";

  if (KNOWN_MAJOR_MAP[norm]) return KNOWN_MAJOR_MAP[norm];
  if (norm.includes("bme") || norm.includes("biomedical eng"))
    return "Biomedical Engineering";
  if (norm === "mec" || norm.includes("mechanical eng"))
    return "Mechanical Engineering";
  if (norm === "cse" || norm.includes("computer science"))
    return "Computer Science";

  return rawMajor.trim();
};

// Uses sessionStorage so data persists across route/component changes,
// but automatically clears when the browser tab is fully reloaded or closed.
const loadInitialMap = (): Map<string, string> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
};

export const majorHashMap: Map<string, string> = loadInitialMap();

type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribeToMajorUpdates = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyMajorUpdates = (): void => {
  try {
    const obj = Object.fromEntries(majorHashMap.entries());
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("Failed to persist majorHashMap to sessionStorage:", err);
  }
  listeners.forEach((listener) => listener());
};

export const getMajorByEmail = (email?: string): string | undefined => {
  const clean = normalizeEmail(email);
  return clean ? majorHashMap.get(clean) : undefined;
};
