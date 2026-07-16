import { useState, useEffect } from 'react'
import { makeQuestion, randomCheer, unlockedDinos, nextDino, DINOS, CORRECT_PER_LEVEL } from './game.js'
import { emptyProfile, loadProfile, saveProfile } from './storage.js'

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile())
  const [screen, setScreen] = useState(profile ? 'home' : 'welcome')

  // שמירה אוטומטית בכל שינוי בפרופיל.
  useEffect(() => {
    if (profile) saveProfile(profile)
  }, [profile])

  if (screen === 'welcome') {
    return <Welcome onStart={(name) => { setProfile(emptyProfile(name)); setScreen('home') }} />
  }
  if (screen === 'play') {
    return <Play profile={profile} setProfile={setProfile} onExit={() => setScreen('home')} />
  }
  return <Home profile={profile} onPlay={() => setScreen('play')} />
}

// ---------------------------------------------------------------------------
// מסך פתיחה — קליטת שם השחקן.
// ---------------------------------------------------------------------------
function Welcome({ onStart }) {
  const [name, setName] = useState('')
  return (
    <div className="screen center">
      <div className="big-dino float">🦕</div>
      <h1>דינו-חשבון</h1>
      <p className="subtitle">פותרים תרגילים, בוקעים דינוזאורים!</p>
      <input
        className="name-input"
        placeholder="איך קוראים לך?"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={12}
      />
      <button className="btn-primary" disabled={!name.trim()} onClick={() => onStart(name.trim())}>
        בוא נתחיל! 🚀
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// מסך הבית — מציג התקדמות, אוסף דינוזאורים, וכפתור משחק.
// ---------------------------------------------------------------------------
function Home({ profile, onPlay }) {
  const unlocked = unlockedDinos(profile.totalCorrect)
  const next = nextDino(profile.totalCorrect)

  return (
    <div className="screen">
      <header className="topbar">
        <span className="hi">שלום, {profile.name}! 👋</span>
        <span className="coins">🪙 {profile.coins}</span>
      </header>

      <div className="stats-row">
        <Stat label="תשובות נכונות" value={profile.totalCorrect} />
        <Stat label="שיא רצף" value={profile.bestStreak} />
      </div>

      <h2 className="collection-title">אוסף הדינוזאורים שלי 🦖</h2>
      <div className="dino-collection">
        {DINOS.map((d, i) => {
          const isUnlocked = i < unlocked.length
          return (
            <div key={i} className={`dino-card ${isUnlocked ? '' : 'locked'}`}>
              <div className="dino-emoji">{isUnlocked ? d.emoji : '🥚'}</div>
              <div className="dino-name">{isUnlocked ? d.name : '???'}</div>
            </div>
          )
        })}
      </div>

      {next && (
        <p className="next-hint">
          עוד <b>{next.remaining}</b> תשובות נכונות ותבקע את <b>{next.dino.name}</b> {next.dino.emoji}
        </p>
      )}

      <button className="btn-primary big-play" onClick={onPlay}>
        שחק! ▶️
      </button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// מסך המשחק — סבב תרגילים, משוב, רצף, ובקיעת דינוזאור חדש.
// ---------------------------------------------------------------------------
function Play({ profile, setProfile, onExit }) {
  const level = Math.floor(profile.totalCorrect / CORRECT_PER_LEVEL) + 1
  const [question, setQuestion] = useState(() => makeQuestion(level))
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct, msg, answer }
  const [locked, setLocked] = useState(false) // נועל כפתורים בזמן משוב
  const [hatched, setHatched] = useState(null) // דינו שבקע כרגע

  function handleAnswer(choice) {
    if (locked) return
    setLocked(true)
    const correct = choice === question.answer

    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      const before = profile.totalCorrect
      const after = before + 1

      // בונוס מטבעות: מטבע אחד + בונוס על רצף.
      const coinGain = 1 + Math.floor(newStreak / 3)

      // בדיקה אם נפתח דינוזאור חדש בעקבות התשובה הזו.
      const justHatched = DINOS.find((d) => d.unlockAt === after)

      setProfile((p) => ({
        ...p,
        totalCorrect: after,
        totalAnswered: p.totalAnswered + 1,
        coins: p.coins + coinGain,
        bestStreak: Math.max(p.bestStreak, newStreak),
      }))

      if (justHatched) {
        setHatched(justHatched)
      } else {
        setFeedback({ correct: true, msg: randomCheer() })
      }
    } else {
      setStreak(0)
      setProfile((p) => ({ ...p, totalAnswered: p.totalAnswered + 1 }))
      setFeedback({ correct: false, msg: 'כמעט!', answer: question.answer })
    }
  }

  function nextQuestion() {
    const lvl = Math.floor(profile.totalCorrect / CORRECT_PER_LEVEL) + 1
    setQuestion(makeQuestion(lvl))
    setFeedback(null)
    setHatched(null)
    setLocked(false)
  }

  // מסך בקיעת דינוזאור — רגע החגיגה הגדול.
  if (hatched) {
    return (
      <div className="screen center hatch">
        <div className="hatch-egg">🥚➡️</div>
        <div className="big-dino pop">{hatched.emoji}</div>
        <h2>בקע דינוזאור חדש!</h2>
        <p className="hatch-name">{hatched.name}</p>
        <button className="btn-primary" onClick={nextQuestion}>יש! ממשיכים ▶️</button>
      </div>
    )
  }

  return (
    <div className="screen play">
      <header className="topbar">
        <button className="btn-back" onClick={onExit}>◀ בית</button>
        <span className="streak">🔥 רצף: {streak}</span>
        <span className="coins">🪙 {profile.coins}</span>
      </header>

      <div className="level-badge">שלב {level}</div>

      <div className="question-box">
        <div className="question-text">{question.text}</div>
      </div>

      <div className="options-grid">
        {question.options.map((opt) => (
          <button
            key={opt}
            className={`option-btn ${
              feedback && opt === question.answer ? 'correct' : ''
            } ${feedback && !feedback.correct && opt === question.answer ? 'reveal' : ''}`}
            onClick={() => handleAnswer(opt)}
            disabled={locked}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'good' : 'bad'}`}>
          <div className="feedback-msg">{feedback.msg}</div>
          {!feedback.correct && (
            <div className="feedback-answer">התשובה הנכונה: <b>{feedback.answer}</b></div>
          )}
          <button className="btn-primary" onClick={nextQuestion}>הבא ▶️</button>
        </div>
      )}
    </div>
  )
}
