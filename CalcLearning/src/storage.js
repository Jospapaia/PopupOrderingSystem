// ==========================================================================
// storage.js — שכבת שמירת ההתקדמות.
//
// כרגע שומר מקומית ב-localStorage. מבנה ה-profile תוכנן כך שיתמפה ישירות
// לשרת (Hetzner) בעתיד: כדי לעבור למרובה-משתתפים, מחליפים רק את הפונקציות
// loadProfile/saveProfile בקריאות fetch ל-API — שאר המשחק לא משתנה.
// ==========================================================================

const KEY = 'dino-math:profile'

// פרופיל התחלתי לשחקן חדש.
export function emptyProfile(name = '') {
  return {
    name,
    totalCorrect: 0, // סה"כ תשובות נכונות (קובע אילו דינוזאורים נפתחו)
    totalAnswered: 0, // סה"כ תרגילים שנענו
    bestStreak: 0, // הרצף הטוב ביותר של תשובות נכונות
    coins: 0, // מטבעות שנאספו
    createdAt: new Date().toISOString(),
  }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return { ...emptyProfile(), ...JSON.parse(raw) }
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // אם השמירה נכשלת (מצב פרטי וכו') — לא מפילים את המשחק.
  }
}
