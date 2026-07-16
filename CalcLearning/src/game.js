// ==========================================================================
// game.js — כל הלוגיקה הלימודית של "דינו-חשבון".
// מופרד מרכיבי התצוגה כדי שיהיה קל להוסיף נושאים (שברים, גיאומטריה) בהמשך.
// ==========================================================================

// אוסף הדינוזאורים. כל עלייה בשלב "בוקעת" דינוזאור חדש מהביצה.
// כל דינו דורש כמות תשובות נכונות מצטברת כדי להיפתח.
export const DINOS = [
  { emoji: '🦕', name: 'ברכי הברכיוזאור', unlockAt: 0 },
  { emoji: '🦖', name: 'רקסי הטירנוזאור', unlockAt: 5 },
  { emoji: '🐊', name: 'סנפי הספינוזאור', unlockAt: 12 },
  { emoji: '🦎', name: 'ולוסי הרפטור', unlockAt: 20 },
  { emoji: '🐉', name: 'דרקי הדרקון', unlockAt: 30 },
  { emoji: '🦕', name: 'ארוך-הצוואר', unlockAt: 42 },
  { emoji: '🦖', name: 'מלך הדינוזאורים', unlockAt: 55 },
]

// כמה תשובות נכונות צריך כדי לעלות שלב.
export const CORRECT_PER_LEVEL = 5

// בוחר את לוח הכפל שמותר בהתאם לשלב — קל בהתחלה, מאתגר בהמשך.
function tablesForLevel(level) {
  if (level <= 1) return [2, 5, 10]
  if (level <= 2) return [2, 3, 4, 5, 10]
  if (level <= 4) return [2, 3, 4, 5, 6, 7, 10]
  return [2, 3, 4, 5, 6, 7, 8, 9, 10]
}

// מספר שלם אקראי בין min ל-max (כולל).
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)]
}

// מייצר תרגיל בודד (כפל או חילוק) המתאים לשלב הנוכחי.
// מחזיר: { text, answer, options } — options הן 4 תשובות לבחירה.
export function makeQuestion(level) {
  const tables = tablesForLevel(level)
  const a = pick(tables)
  const b = randInt(2, 10)
  const product = a * b

  // חילוק מוצג כפעולה ההפוכה של כפל — כך שהתוצאה תמיד יפה (בלי שארית).
  const isDivision = Math.random() < 0.45

  let text, answer
  if (isDivision) {
    text = `${product} ÷ ${a} = ?`
    answer = b
  } else {
    text = `${a} × ${b} = ?`
    answer = product
  }

  return { text, answer, options: buildOptions(answer) }
}

// בונה 4 אפשרויות: התשובה הנכונה + 3 מסיחים קרובים והגיוניים.
function buildOptions(answer) {
  const options = new Set([answer])
  let guard = 0
  while (options.size < 4 && guard < 50) {
    guard++
    const delta = pick([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10])
    const candidate = answer + delta
    if (candidate > 0) options.add(candidate)
  }
  // ערבוב סדר האפשרויות.
  return [...options].sort(() => Math.random() - 0.5)
}

// משפטי עידוד אקראיים לתשובה נכונה — שומרים על אנרגיה חיובית.
const CHEERS = ['מדהים! 🎉', 'כל הכבוד! 💪', 'סופר! ⭐', 'וואו! 🔥', 'נכון מאוד! 🦖', 'אלוף! 🏆']
export function randomCheer() {
  return pick(CHEERS)
}

// מחזיר את כל הדינוזאורים שנפתחו עד למספר תשובות נכונות מסוים.
export function unlockedDinos(totalCorrect) {
  return DINOS.filter((d) => totalCorrect >= d.unlockAt)
}

// בהינתן מספר התשובות הנכונות — מהו הדינו הבא שעוד נעול, וכמה חסר אליו.
export function nextDino(totalCorrect) {
  const next = DINOS.find((d) => totalCorrect < d.unlockAt)
  if (!next) return null
  return { dino: next, remaining: next.unlockAt - totalCorrect }
}
