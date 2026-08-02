import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  AVAILABLE_WORD_LENGTHS,
  DAILY_WORDS_BY_LENGTH,
  DEFAULT_WORD_LENGTH,
  type WordLength,
} from './data/words'

const ATTEMPT_LIMIT = 5

const createEmptyBoard = (wordLength: number) =>
  Array.from({ length: ATTEMPT_LIMIT }, () => Array(wordLength).fill(''))

const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const getDailyWord = (dateKey: string, wordLength: WordLength) => {
  const hash = Array.from(dateKey).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const words = DAILY_WORDS_BY_LENGTH[wordLength]
  return words[hash % words.length]
}

const getNextLocalMidnight = (date = new Date()) => {
  const nextMidnight = new Date(date)
  nextMidnight.setDate(date.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)
  return nextMidnight
}

const formatCountdown = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

type LetterStatus = 'correct' | 'present' | 'empty'

type LeaderboardEntry = {
  name: string
  finishedAt: string
  attemptsUsed: number
}

const getLeaderboardStorageKey = (dateKey: string, wordLength: WordLength) =>
  `wordle-leaderboard-${dateKey}-${wordLength}`

const loadLeaderboard = (dateKey: string, wordLength: WordLength) => {
  try {
    const rawValue = window.localStorage.getItem(getLeaderboardStorageKey(dateKey, wordLength))
    return rawValue ? (JSON.parse(rawValue) as LeaderboardEntry[]) : []
  } catch {
    return []
  }
}

const saveLeaderboard = (dateKey: string, wordLength: WordLength, entries: LeaderboardEntry[]) => {
  try {
    window.localStorage.setItem(getLeaderboardStorageKey(dateKey, wordLength), JSON.stringify(entries))
  } catch {
    // ignore storage errors
  }
}

const getLetterStatuses = (guess: string, target: string): LetterStatus[] => {
  const guessLetters = guess.toUpperCase().split('')
  const targetLetters = target.toUpperCase().split('')
  const targetCounts = new Map<string, number>()

  targetLetters.forEach((letter) => {
    targetCounts.set(letter, (targetCounts.get(letter) ?? 0) + 1)
  })

  const statuses: LetterStatus[] = Array.from({ length: targetLetters.length }, () => 'empty')

  guessLetters.forEach((letter, index) => {
    if (letter === targetLetters[index]) {
      statuses[index] = 'correct'
      targetCounts.set(letter, (targetCounts.get(letter) ?? 0) - 1)
    }
  })

  guessLetters.forEach((letter, index) => {
    if (statuses[index] === 'correct') {
      return
    }

    const remainingCount = targetCounts.get(letter) ?? 0
    if (remainingCount > 0) {
      statuses[index] = 'present'
      targetCounts.set(letter, remainingCount - 1)
    }
  })

  return statuses
}

function App() {
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey())
  const [started, setStarted] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [draftPlayerName, setDraftPlayerName] = useState('')
  const [draftWordLength, setDraftWordLength] = useState<WordLength>(DEFAULT_WORD_LENGTH)
  const [wordLength, setWordLength] = useState<WordLength>(DEFAULT_WORD_LENGTH)
  const [attempts, setAttempts] = useState<string[][]>(() => createEmptyBoard(DEFAULT_WORD_LENGTH))
  const [submittedRows, setSubmittedRows] = useState<boolean[]>(Array(ATTEMPT_LIMIT).fill(false))
  const [currentRow, setCurrentRow] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    loadLeaderboard(getLocalDateKey(), DEFAULT_WORD_LENGTH),
  )
  const currentInputRef = useRef<HTMLInputElement | null>(null)
  const confettiRef = useRef<HTMLCanvasElement | null>(null)
  const confettiAnimRef = useRef<number | null>(null)
  const dailyWord = getDailyWord(todayKey, wordLength)
  const [showVictoryText, setShowVictoryText] = useState(false)
  const CONFETTI_DURATION = 3000

  useEffect(() => {
    const now = new Date()
    const nextMidnight = getNextLocalMidnight(now)

    const timeoutId = window.setTimeout(() => {
      setTodayKey(getLocalDateKey())
    }, nextMidnight.getTime() - now.getTime())

    return () => window.clearTimeout(timeoutId)
  }, [todayKey])

  useEffect(() => {
    setAttempts(createEmptyBoard(wordLength))
    setSubmittedRows(Array(ATTEMPT_LIMIT).fill(false))
    setCurrentRow(0)
    setIsWon(false)
    setLeaderboard(loadLeaderboard(todayKey, wordLength))
  }, [todayKey, wordLength])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!started || isWon || currentRow >= ATTEMPT_LIMIT) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      currentInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [currentRow, isWon, started, todayKey, wordLength])

  const startGame = () => {
    const trimmedName = draftPlayerName.trim()
    if (!trimmedName) {
      return
    }

    setWordLength(draftWordLength)
    setPlayerName(trimmedName)
    setAttempts(createEmptyBoard(draftWordLength))
    setSubmittedRows(Array(ATTEMPT_LIMIT).fill(false))
    setCurrentRow(0)
    setIsWon(false)
    setLeaderboard(loadLeaderboard(todayKey, draftWordLength))
    setStarted(true)
  }

  const handleGuessChange = (value: string) => {
    if (isWon || currentRow >= ATTEMPT_LIMIT) {
      return
    }

    const normalized = value
      .replace(/[^A-Za-zÇçĞğİıÖöŞşÜü]/g, '')
      .slice(0, wordLength)
      .toUpperCase()

    const nextAttempts = attempts.map((row) => [...row])
    nextAttempts[currentRow] = Array.from({ length: wordLength }, (_, index) => normalized[index] ?? '')
    setAttempts(nextAttempts)
  }

  useEffect(() => {
    if (isWon) {
      setShowVictoryText(true)
      launchConfetti(CONFETTI_DURATION)
      window.setTimeout(() => setShowVictoryText(false), CONFETTI_DURATION)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWon])

  useEffect(() => {
    if (!isWon) return
    // ensure the victory text hides when restarting or switching day
    return () => setShowVictoryText(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey])

  const submitGuess = () => {
    if (isWon || currentRow >= ATTEMPT_LIMIT) {
      return
    }

    const guessWord = attempts[currentRow].join('')
    if (guessWord.length !== wordLength) {
      return
    }

    const nextSubmittedRows = [...submittedRows]
    nextSubmittedRows[currentRow] = true
    setSubmittedRows(nextSubmittedRows)

    if (guessWord.toUpperCase() === dailyWord.toUpperCase()) {
      const winnerName = playerName.trim() || 'Anonim'
      const updatedLeaderboard = [
        ...leaderboard,
        {
          name: winnerName,
          finishedAt: new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          attemptsUsed: currentRow + 1,
        },
      ]

      setLeaderboard(updatedLeaderboard)
      saveLeaderboard(todayKey, wordLength, updatedLeaderboard)
      setIsWon(true)
      return
    }

    setCurrentRow((prev) => prev + 1)
  }

  const showRefreshTimer = isWon || currentRow >= ATTEMPT_LIMIT
  const countdownText = formatCountdown(getNextLocalMidnight(now).getTime() - now.getTime())
  const sortedLeaderboard = [...leaderboard]

  sortedLeaderboard.sort((left, right) => left.attemptsUsed - right.attemptsUsed)

  const launchConfetti = (duration = 3000) => {
    const canvas = confettiRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = canvas.clientWidth)
    let height = (canvas.height = canvas.clientHeight)

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6']

    type Particle = {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      rotation: number
      spin: number
    }

    const particles: Particle[] = []
    const count = 120
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI / 2
      const speed = 2 + Math.random() * 6
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 4 + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
      })
    }

    let start: number | null = null

    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start

      ctx.clearRect(0, 0, width, height)

      // update and draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += 0.07 // gravity
        p.vx *= 0.999
        p.vy *= 0.999
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.spin

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()

        // remove if offscreen
        if (p.y > height + 50 || p.x < -50 || p.x > width + 50) {
          particles.splice(i, 1)
        }
      }

      if (elapsed < duration && particles.length > 0) {
        confettiAnimRef.current = window.requestAnimationFrame(step)
      } else {
        ctx.clearRect(0, 0, width, height)
        if (confettiAnimRef.current) {
          window.cancelAnimationFrame(confettiAnimRef.current)
          confettiAnimRef.current = null
        }
      }
    }

    // handle resize
    const handleResize = () => {
      width = canvas.width = canvas.clientWidth
      height = canvas.height = canvas.clientHeight
    }

    window.addEventListener('resize', handleResize)
    confettiAnimRef.current = window.requestAnimationFrame(step)

    // cleanup after duration + short buffer
    setTimeout(() => {
      window.removeEventListener('resize', handleResize)
      if (confettiAnimRef.current) {
        window.cancelAnimationFrame(confettiAnimRef.current)
        confettiAnimRef.current = null
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }, duration + 500)
  }
    const today = new Date();
  const displayDate = today.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  if (!started) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="eyebrow">{displayDate} </p>
          <h1>Wordle Türkçe</h1>
          <p className="copy">hadi bakalım, kelimeyi bulabilecek misin?</p>
          <div className="length-picker" role="group" aria-label="Kelime uzunluğu seçimi">
            {AVAILABLE_WORD_LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                className={`length-option ${draftWordLength === length ? 'active' : ''}`}
                onClick={() => setDraftWordLength(length)}
              >
                {length} harf
              </button>
            ))}
          </div>
          <label className="name-field">
            <span>Önce adını yaz</span>
            <input
              type="text"
              value={draftPlayerName}
              onChange={(event) => setDraftPlayerName(event.target.value)}
              placeholder="Adın"
              autoComplete="nickname"
              autoCapitalize="words"
              maxLength={20}
            />
          </label>
          <button type="button" onClick={startGame} disabled={!draftPlayerName.trim()}>
            Oyna
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <div className="game-layout">
        <section className="game-card">
          <p className="eyebrow">Bugünün tahmini</p>
          <h1>{wordLength} harfli kelime</h1>
          <p className="copy">
            {wordLength} tahminli oyun modundasın. Kelimenin tamamını yazıp "Tahmin Et" butonuna
            basınca sadece doğru kelime satırı yeşil olur.
          </p>

          <div className="board" aria-label="Tahmin alanı">
            {attempts.map((row, rowIndex) => {
              const rowWord = row.join('')
              const isSubmitted = submittedRows[rowIndex]
              const isCurrentRow = rowIndex === currentRow && !isWon
              const letterStatuses = isSubmitted ? getLetterStatuses(rowWord, dailyWord) : []

              return (
                <div
                  key={rowIndex}
                  className={`guess-row ${isCurrentRow ? 'active' : ''}`}
                  style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}
                >
                  {row.map((letter, index) => (
                    <div
                      key={`${rowIndex}-${index}`}
                      className={`tile-cell ${
                        letterStatuses[index] === 'correct'
                          ? 'correct'
                          : letterStatuses[index] === 'present'
                            ? 'present'
                            : ''
                      }`}
                    >
                      {letter}
                    </div>
                  ))}

                  {isCurrentRow && (
                    <input
                      ref={currentInputRef}
                      className="row-input"
                      type="text"
                      value={rowWord}
                      onChange={(event) => handleGuessChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          submitGuess()
                        }
                      }}
                      onPaste={(event) => {
                        event.preventDefault()
                        const pastedText = event.clipboardData.getData('text')
                        handleGuessChange(pastedText)
                      }}
                      maxLength={wordLength}
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={`Satır ${rowIndex + 1} tahmin girişi`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {showRefreshTimer && (
            <div className="refresh-timer" aria-live="polite">
              <span className="refresh-label">Yeni kelimeye kalan süre</span>
              <strong className="refresh-value">{countdownText}</strong>
              <span className="refresh-note">Saat 00:00&apos;da kelime otomatik yenilenir.</span>
            </div>
          )}

          <p className="copy attempts-left">Kalan hak: {Math.max(ATTEMPT_LIMIT - currentRow, 0)}</p>

          <button type="button" onClick={submitGuess} disabled={isWon || currentRow >= ATTEMPT_LIMIT}>
            Tahmin Et
          </button>

          {isWon && <p className="copy result">Tebrikler, doğru kelimeyi buldun.</p>}
          {!isWon && currentRow >= ATTEMPT_LIMIT && (
            <p className="copy result">Hakların bitti. Bugünün kelimesi: {dailyWord.toUpperCase()}</p>
          )}

          <button type="button" className="secondary" onClick={() => setStarted(false)}>
            Geri dön
          </button>
          <canvas ref={confettiRef} className="confetti-canvas" />
          <div className={`victory-message ${showVictoryText ? 'visible' : ''}`} aria-hidden={!showVictoryText}>
            DOĞRU KELİME
          </div>
        </section>

        <aside className="leaderboard-card" aria-label="Kazananlar listesi">
          <p className="eyebrow">Leaderboard</p>
          <h2>{wordLength} harfli doğru yapanlar</h2>
          {sortedLeaderboard.length > 0 ? (
            <ol className="leaderboard-list">
              {sortedLeaderboard.map((entry, index) => (
                <li key={`${entry.name}-${entry.finishedAt}-${index}`} className="leaderboard-item">
                  <span className="leaderboard-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-meta">
                    {entry.attemptsUsed} hak · {entry.finishedAt}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="copy leaderboard-empty">Henüz kimse doğru kelimeyi bulmadı.</p>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
