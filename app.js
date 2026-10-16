(() => {
  'use strict';
  const DATA = window.LESSON_DATA_1_78_NO_KANJI || {};
  const $ = (id) => document.getElementById(id);
  const selected = new Set();
  let deck = [];
  let queue = [];
  let known = new Set();
  let activeCard = null;
  let isFlipped = false;

  const lessonNumbers = Array.from({ length: 78 }, (_, i) => i + 1).filter(n => Array.isArray(DATA[String(n)]));
  const uniqueCards = (lessons) => {
    const seen = new Set();
    const cards = [];
    lessons.forEach(lesson => {
      (DATA[String(lesson)] || []).forEach((entry, index) => {
        const key = String(entry.jp || '') + '\u0000' + String(entry.en || '');
        if (seen.has(key)) return;
        seen.add(key);
        cards.push({
          id: String(lesson) + '-' + index + '-' + cards.length,
          lesson,
          jp: String(entry.jp == null ? '' : entry.jp),
          en: String(entry.en == null ? '' : entry.en),
          sequence: cards.length + 1,
          retries: 0
        });
      });
    });
    return cards;
  };

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
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-option' + (selected.has(n) ? ' selected' : '');
      button.setAttribute('aria-pressed', selected.has(n) ? 'true' : 'false');
      const title = document.createElement('strong');
      title.textContent = 'L' + n;
      const count = document.createElement('small');
      count.textContent = (DATA[String(n)] || []).length + ' cards';
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
    ['setup-screen', 'review-screen', 'complete-screen'].forEach(screenId => {
      $(screenId).hidden = screenId !== id;
    });
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
    queue = deck.slice();
    known = new Set();
    activeCard = null;
    isFlipped = false;
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
    $('card-jp').textContent = activeCard.jp || '—';
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
    updateProgress();
    if (queue.length === 0) showCompletion();
    else renderCurrentCard();
  }

  function markUnknown() {
    if (!activeCard || !queue.length) return;
    const card = queue.shift();
    card.retries += 1;
    queue.push(card);
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