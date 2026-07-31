import { useEffect, useRef, useState } from 'react'
import './App.css'

const WORD_LENGTH = 5
const ATTEMPT_LIMIT = 5
const DAILY_WORDS = [
  'LAMBA',
  'KALEM',
  'ARABA',
  'BAHAR',
  'ÇİLEK',
  'DEFNE',
  'EKMEK',
  'FİDAN',
  'GÖLGE',
  'HAYAT',
  'KOLYE',
  'MEYVE',
  'SALON',
  'SİMGE',
  'ŞARKI',
  'TARLA',
  'UZMAN',
  'VAKIF',
  'YAĞIZ',
  'ZAMAN',
]

const createEmptyBoard = (wordLength: number) =>
  Array.from({ length: ATTEMPT_LIMIT }, () => Array(wordLength).fill(''))

const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const getDailyWord = (dateKey: string) => {
  const hash = Array.from(dateKey).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return DAILY_WORDS[hash % DAILY_WORDS.length]
}

type LetterStatus = 'correct' | 'present' | 'empty'

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
  const [attempts, setAttempts] = useState<string[][]>(() => createEmptyBoard(WORD_LENGTH))
  const [submittedRows, setSubmittedRows] = useState<boolean[]>(Array(ATTEMPT_LIMIT).fill(false))
  const [currentRow, setCurrentRow] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: ATTEMPT_LIMIT }, () => Array(WORD_LENGTH).fill(null)),
  )
  const confettiRef = useRef<HTMLCanvasElement | null>(null)
  const confettiAnimRef = useRef<number | null>(null)
  const dailyWord = getDailyWord(todayKey)
  const [showVictoryText, setShowVictoryText] = useState(false)
  const CONFETTI_DURATION = 3000

  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setDate(now.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)

    const timeoutId = window.setTimeout(() => {
      setTodayKey(getLocalDateKey())
    }, nextMidnight.getTime() - now.getTime())

    return () => window.clearTimeout(timeoutId)
  }, [todayKey])

  useEffect(() => {
    setAttempts(createEmptyBoard(WORD_LENGTH))
    setSubmittedRows(Array(ATTEMPT_LIMIT).fill(false))
    setCurrentRow(0)
    setIsWon(false)
    inputRefs.current = Array.from({ length: ATTEMPT_LIMIT }, () => Array(WORD_LENGTH).fill(null))
  }, [todayKey])

  const handleGuessChange = (index: number, value: string) => {
    if (isWon || currentRow >= ATTEMPT_LIMIT) {
      return
    }

    const normalized = value
      .replace(/[^A-Za-zÇçĞğİıÖöŞşÜü]/g, '')
      .slice(-1)
      .toUpperCase()

    const nextAttempts = attempts.map((row) => [...row])
    nextAttempts[currentRow][index] = normalized
    setAttempts(nextAttempts)

    if (normalized && index < WORD_LENGTH - 1) {
      inputRefs.current[currentRow][index + 1]?.focus()
    }
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
    if (guessWord.length !== WORD_LENGTH) {
      return
    }

    const nextSubmittedRows = [...submittedRows]
    nextSubmittedRows[currentRow] = true
    setSubmittedRows(nextSubmittedRows)

    if (guessWord.toUpperCase() === dailyWord.toUpperCase()) {
      setIsWon(true)
      return
    }

    setCurrentRow((prev) => prev + 1)
  }

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

  if (!started) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="eyebrow">El chin + Myek + Obur</p>
          <h1>Wordle Türkçe</h1>
          <p className="copy">hadi bakalım, kelimeyi bulabilecek misin?</p>
          <button type="button" onClick={() => setStarted(true)}>
            Oyna
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="game-card">
        <p className="eyebrow">Bugünün tahmini</p>
        <h1>Günlük kelime</h1>
        <p className="copy">
          5 tahmin hakkın var. Kelimenin tamamını yazıp "Tahmin Et" butonuna basınca sadece
          doğru kelime satırı yeşil olur.
        </p>

        <div className="board" aria-label="Tahmin alanı">
          {attempts.map((row, rowIndex) => {
            const rowWord = row.join('')
            const isSubmitted = submittedRows[rowIndex]
            const isCurrentRow = rowIndex === currentRow && !isWon
            const letterStatuses = isSubmitted ? getLetterStatuses(rowWord, dailyWord) : []

            return (
              <div key={rowIndex} className="guess-row">
                {row.map((letter, index) => (
                  <input
                    key={`${rowIndex}-${index}`}
                    ref={(element) => {
                      inputRefs.current[rowIndex][index] = element
                    }}
                    className={`tile-input ${
                      letterStatuses[index] === 'correct'
                        ? 'correct'
                        : letterStatuses[index] === 'present'
                          ? 'present'
                          : ''
                    }`}
                    type="text"
                    maxLength={1}
                    value={letter}
                    onChange={(event) => handleGuessChange(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && isCurrentRow) {
                        submitGuess()
                        return
                      }

                      if (event.key === 'Backspace' && isCurrentRow) {
                        event.preventDefault()

                        const nextAttempts = attempts.map((row) => [...row])

                        if (letter) {
                          nextAttempts[currentRow][index] = ''
                          setAttempts(nextAttempts)
                          return
                        }

                        if (index > 0) {
                          nextAttempts[currentRow][index - 1] = ''
                          setAttempts(nextAttempts)
                          inputRefs.current[currentRow][index - 1]?.focus()
                        }
                      }
                    }}
                    aria-label={`Satır ${rowIndex + 1} Harf ${index + 1}`}
                    disabled={!isCurrentRow}
                  />
                ))}
              </div>
            )
          })}
        </div>

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
    </main>
  )
}

export default App
