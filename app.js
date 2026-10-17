(() => {
  'use strict';
  const DATA = window.LESSON_DATA_1_78 || {};
  const $ = (id) => document.getElementById(id);
  const selected = new Set();
  let deck = [];
  let queue = [];
  let known = new Set();
  let activeCard = null;
  let isFlipped = false;
  let sessionStartedAt = 0;
  let sessionRecorded = false;
  const STORAGE_KEY = 'japanese-vocabulary-progress-v1';
  const readProgress = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { mastered: new Set(Array.isArray(saved.mastered) ? saved.mastered : []), sessions: Array.isArray(saved.sessions) ? saved.sessions : [] };
    } catch (_) { return { mastered: new Set(), sessions: [] }; }
  };
  const savedProgress = readProgress();
  const mastered = savedProgress.mastered;
  let sessions = savedProgress.sessions;

  const lessonNumbers = Array.from({ length: 78 }, (_, i) => i + 1).filter(n => Array.isArray(DATA[String(n)]));
  const uniqueCards = (lessons) => {
    const cards = [];
    lessons.forEach(lesson => {
      (DATA[String(lesson)] || []).forEach((entry, index) => {
        cards.push({
          id: String(lesson) + '-' + index,
          lesson,
          jp: String(entry.jp == null ? '' : entry.jp),
          furi: String(entry.furi == null ? '' : entry.furi),
          kanji: String(entry.kanji == null ? '' : entry.kanji),
          en: String(entry.en == null ? '' : entry.en),
          sequence: cards.length + 1,
          retries: 0
        });
      });
    });
    return cards;
  };

  function shuffleQueue(cards) {
    // Fisher–Yates shuffle: randomize the first pass and each retry queue.
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mastered: [...mastered], sessions: sessions.slice(-100) })); } catch (_) { /* Private browsing or full storage: current session still works. */ }
  }

  function renderProgress() {
    const allCards = uniqueCards(lessonNumbers);
    const masteredCount = allCards.reduce((sum, card) => sum + (mastered.has(card.id) ? 1 : 0), 0);
    const percent = allCards.length ? Math.round(masteredCount / allCards.length * 100) : 0;
    $('overall-mastered').textContent = masteredCount + ' / ' + allCards.length;
    $('overall-fill').style.width = percent + '%';
    $('overall-percent').textContent = percent + '% complete';
    $('sessions-total').textContent = sessions.length;
    $('overall-remaining').textContent = allCards.length - masteredCount;
    const list = $('progress-lesson-list');
    list.innerHTML = '';
    lessonNumbers.forEach(lesson => {
      const cards = uniqueCards([lesson]);
      const total = cards.length;
      const count = cards.reduce((sum, card) => sum + (mastered.has(card.id) ? 1 : 0), 0);
      const pct = total ? Math.round(count / total * 100) : 0;
      const row = document.createElement('div');
      row.className = 'progress-lesson-row';
      const top = document.createElement('div'); top.className = 'progress-lesson-top';
      const name = document.createElement('strong'); name.textContent = 'Lesson ' + lesson;
      const numbers = document.createElement('span'); numbers.textContent = count + ' / ' + total + ' · ' + pct + '%';
      top.append(name, numbers);
      const track = document.createElement('div'); track.className = 'lesson-progress-track';
      const fill = document.createElement('span'); fill.style.width = pct + '%'; track.appendChild(fill);
      row.append(top, track); list.appendChild(row);
    });
    const history = $('session-history'); history.innerHTML = '';
    const recent = sessions.slice(-8).reverse();
    if (!recent.length) {
      const empty = document.createElement('p'); empty.className = 'history-empty'; empty.textContent = 'No completed sessions yet. Finish a review to see it here.'; history.appendChild(empty);
    } else {
      recent.forEach(session => {
        const row = document.createElement('div'); row.className = 'history-row';
        const main = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = session.lessons.length === 78 ? 'All 78 lessons' : session.lessons.length === 1 ? 'Lesson ' + session.lessons[0] : session.lessons.length + ' lessons';
        const date = document.createElement('small');
        const parsed = new Date(session.date);
        date.textContent = (Number.isNaN(parsed.getTime()) ? 'Completed session' : parsed.toLocaleString()) + ' · ' + Math.max(1, Math.round((session.duration || 0) / 60000)) + ' min';
        main.append(title, date);
        const score = document.createElement('span'); score.className = 'history-score'; score.textContent = session.known + ' / ' + session.total + ' known';
        row.append(main, score); history.appendChild(row);
      });
    }
  }

  function renderLessonGrid() {
    const query = $('lesson-search').value.trim().toLowerCase();
    const visible = lessonNumbers.filter(n => !query || ('lesson ' + n).includes(query) || String(n).includes(query));
    const grid = $('lesson-grid');
    grid.innerHTML = '';
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-search';
      empty.textContent = 'No lessons match your search.';
      grid.appendChild(empty);
      return;
    }
    visible.forEach(n => {
      const lessonCards = uniqueCards([n]);
      const total = lessonCards.length;
      const learnedCount = lessonCards.reduce((sum, card) => sum + (mastered.has(card.id) ? 1 : 0), 0);
      const isLearned = total > 0 && learnedCount === total;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-option' + (isLearned ? ' learned' : '') + (selected.has(n) ? ' selected' : '');
      button.setAttribute('aria-pressed', selected.has(n) ? 'true' : 'false');
      button.setAttribute('aria-label', 'Lesson ' + n + (isLearned ? ', learned' : ', ' + learnedCount + ' of ' + total + ' cards learned'));
      const title = document.createElement('strong');
      title.textContent = 'L' + n;
      const count = document.createElement('small');
      count.textContent = isLearned ? 'Learned ✓' : (learnedCount ? learnedCount + '/' + total + ' learned' : total + ' cards');
      const check = document.createElement('span');
      check.className = 'checkmark';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      button.append(title, count, check);
      button.addEventListener('click', () => {
        if (selected.has(n)) selected.delete(n);
        else selected.add(n);
        renderLessonGrid();
        updateSelectionSummary();
      });
      grid.appendChild(button);
    });
  }

  function updateSelectionSummary() {
    const lessons = [...selected].sort((a,b) => a-b);
    const count = uniqueCards(lessons).length;
    $('selected-count').textContent = lessons.length;
    $('word-count').textContent = count + (count === 1 ? ' card' : ' cards');
    $('start-review').disabled = lessons.length === 0 || count === 0;
    $('setup-error').hidden = true;
  }

  function showScreen(id) {
    ['setup-screen', 'progress-screen', 'review-screen', 'complete-screen'].forEach(screenId => {
      $(screenId).hidden = screenId !== id;
    });
    if (id === 'progress-screen') renderProgress();
    if (id === 'setup-screen') renderLessonGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startReview() {
    const lessons = [...selected].sort((a,b) => a-b);
    deck = uniqueCards(lessons);
    if (!deck.length) {
      $('setup-error').textContent = 'There are no vocabulary cards in the selected lessons.';
      $('setup-error').hidden = false;
      return;
    }
    queue = shuffleQueue(deck.slice());
    known = new Set();
    activeCard = null;
    isFlipped = false;
    sessionStartedAt = Date.now();
    sessionRecorded = false;
    $('review-lessons-label').textContent = lessons.length === 78 ? 'All 78 lessons' : lessons.length === 1 ? 'Lesson ' + lessons[0] : lessons.length + ' lessons selected';
    showScreen('review-screen');
    renderCurrentCard();
    updateProgress();
  }

  function renderCurrentCard() {
    if (!queue.length) {
      showCompletion();
      return;
    }
    activeCard = queue[0];
    isFlipped = false;
    $('flashcard').classList.remove('is-flipped');
    $('flashcard').setAttribute('aria-label', 'Reveal English meaning for ' + activeCard.jp);
    $('card-jp').hidden = false;
    $('card-en').hidden = true;
    // Prefer the explicit kanji field; fall back to a kanji-bearing jp value.
    // This keeps the reading unchanged and shows the written form on its own line.
    const hasKanji = (value) => /[\u3400-\u4DBF\u4E00-\u9FFF々〆ヵヶ]/u.test(String(value || ''));
    const storedKanji = String(activeCard.kanji || '').trim();
    const jpForm = String(activeCard.jp || '').trim();
    const reading = String(activeCard.furi || '').trim();
    const kanjiForm = hasKanji(storedKanji) ? storedKanji : (hasKanji(jpForm) && jpForm !== reading ? jpForm : '');
    $('card-kanji').textContent = kanjiForm;
    $('card-kanji').hidden = !kanjiForm;
    $('card-jp').textContent = activeCard.furi || activeCard.jp || '—';
    $('card-en').textContent = activeCard.en || 'No English meaning listed';
    $('card-lesson').textContent = 'LESSON ' + activeCard.lesson;
    $('card-side').textContent = 'JAPANESE';
    $('card-hint').innerHTML = '<span aria-hidden="true">↻</span> Tap to reveal meaning';
    $('card-number').textContent = 'CARD ' + activeCard.sequence + ' / ' + deck.length;
    $('dont-know').disabled = false;
    $('know').disabled = false;
  }

  function flipCard() {
    if (!activeCard || !queue.length) return;
    isFlipped = !isFlipped;
    $('card-jp').hidden = isFlipped;
    $('card-kanji').hidden = isFlipped || !$('card-kanji').textContent;
    $('card-en').hidden = !isFlipped;
    $('card-side').textContent = isFlipped ? 'ENGLISH MEANING' : 'JAPANESE';
    $('card-hint').innerHTML = isFlipped ? '<span aria-hidden="true">↻</span> Tap to see Japanese' : '<span aria-hidden="true">↻</span> Tap to reveal meaning';
    $('flashcard').classList.toggle('is-flipped', isFlipped);
    $('flashcard').setAttribute('aria-label', isFlipped ? 'Show Japanese word' : 'Reveal English meaning');
  }

  function markKnown() {
    if (!activeCard || !queue.length) return;
    const card = queue.shift();
    known.add(card.id);
    mastered.add(card.id);
    saveProgress();
    renderLessonGrid();
    updateProgress();
    if (queue.length === 0) showCompletion();
    else renderCurrentCard();
  }

  function markUnknown() {
    if (!activeCard || !queue.length) return;
    const card = queue.shift();
    card.retries += 1;
    mastered.delete(card.id);
    saveProgress();
    renderLessonGrid();
    // Reinsert at a random position, so a missed card is not always next.
    const insertAt = Math.floor(Math.random() * (queue.length + 1));
    queue.splice(insertAt, 0, card);
    renderCurrentCard();
    updateProgress();
  }

  function updateProgress() {
    const total = deck.length || 1;
    const percent = Math.round(known.size / total * 100);
    $('progress-percent').textContent = percent + '%';
    $('progress-fill').style.width = percent + '%';
    $('progress-track').setAttribute('aria-valuenow', String(percent));
    $('remaining-count').textContent = queue.length;
    $('known-count').textContent = known.size;
    $('retry-count').textContent = queue.filter(card => card.retries > 0).length;
  }

  function showCompletion() {
    if (!sessionRecorded && deck.length) {
      sessions.push({ date: new Date().toISOString(), lessons: [...selected].sort((a,b) => a-b), known: known.size, total: deck.length, duration: Date.now() - sessionStartedAt });
      sessions = sessions.slice(-100);
      sessionRecorded = true;
      saveProgress();
    }
    $('final-known').textContent = known.size;
    $('final-lessons').textContent = selected.size;
    showScreen('complete-screen');
  }

  $('lesson-search').addEventListener('input', renderLessonGrid);
  $('select-all').addEventListener('click', () => {
    lessonNumbers.forEach(n => selected.add(n));
    renderLessonGrid();
    updateSelectionSummary();
  });
  $('clear-all').addEventListener('click', () => {
    selected.clear();
    renderLessonGrid();
    updateSelectionSummary();
  });
  document.querySelectorAll('[data-range]').forEach(button => {
    button.addEventListener('click', () => {
      const [start, end] = button.dataset.range.split('-').map(Number);
      selected.clear();
      lessonNumbers.filter(n => n >= start && n <= end).forEach(n => selected.add(n));
      renderLessonGrid();
      updateSelectionSummary();
    });
  });
  $('start-review').addEventListener('click', startReview);
  $('show-progress').addEventListener('click', () => showScreen('progress-screen'));
  $('progress-back').addEventListener('click', () => showScreen('setup-screen'));
  $('flashcard').addEventListener('click', flipCard);
  $('know').addEventListener('click', markKnown);
  $('dont-know').addEventListener('click', markUnknown);
  $('back-to-lessons').addEventListener('click', () => showScreen('setup-screen'));
  $('review-again').addEventListener('click', startReview);
  $('choose-new-lessons').addEventListener('click', () => showScreen('setup-screen'));
  document.addEventListener('keydown', event => {
    if (!$('review-screen').hidden) {
      if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
        event.preventDefault();
        flipCard();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        markKnown();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        markUnknown();
      }
    }
  });

  if (!lessonNumbers.length) {
    $('setup-error').textContent = 'Vocabulary data could not be loaded. Please refresh the page.';
    $('setup-error').hidden = false;
    $('start-review').disabled = true;
  }
  renderLessonGrid();
  updateSelectionSummary();
})();