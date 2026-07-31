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
  const dailyWord = getDailyWord(todayKey)

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
      </section>
    </main>
  )
}

export default App
