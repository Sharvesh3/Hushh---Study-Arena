/**
 * app.js — Kai Exam Buddy
 * Author: Dev
 * Started:      ~9:30 AM
 * Last updated: ~5:00 PM
 *
 * Handles:
 *  - Screen routing (SPA-style show/hide)
 *  - Upload drag-and-drop
 *  - Quiz option selection
 *  - Loading panel simulation
 *  - Leaderboard tab toggle
 *  - Quiz countdown timer
 *
 * Note: No framework, keeping this vanilla JS for now.
 * Will migrate to React once the API is ready.
 */

'use strict';

/* ============================================================
   Constants
============================================================ */

// Order matches the nav buttons and ribbon buttons in the HTML
var SCREENS = ['dashboard', 'upload', 'quiz', 'results', 'classroom', 'leaderboard', 'auth'];

// How long to show the loading panel before moving to quiz (ms)
var LOADING_DURATION = 2600;


/* ============================================================
   Screen Router
   Simple show/hide based on a string ID.
   Each screen has a corresponding <main id="screen-{id}">
============================================================ */

function showScreen(id) {
  // Hide all screens first
  SCREENS.forEach(function (name) {
    var el = document.getElementById('screen-' + name);
    if (el) {
      el.classList.remove('is-active');
    }
  });

  // Show the requested screen
  var target = document.getElementById('screen-' + id);
  if (target) {
    target.classList.add('is-active');
  }

  // Sync nav buttons (topbar)
  var navButtons = document.querySelectorAll('.topbar__nav-btn');
  navButtons.forEach(function (btn, index) {
    btn.classList.toggle('is-active', SCREENS[index] === id);
  });

  // Sync ribbon buttons
  var ribbonButtons = document.querySelectorAll('.screen-ribbon__btn');
  ribbonButtons.forEach(function (btn, index) {
    btn.classList.toggle('is-active', SCREENS[index] === id);
  });
}


/* ============================================================
   Upload Screen
============================================================ */

/**
 * Handle file drop on the upload zone.
 * Prevents default browser behavior (opening the file),
 * removes the drag-over style, then triggers the loading flow.
 */
function handleFileDrop(event) {
  event.preventDefault();
  var zone = document.getElementById('dropZone');
  if (zone) {
    zone.classList.remove('is-drag-over');
  }
  triggerLoading();
}

/**
 * Select a generation type option (Summary+Quiz, Quiz Only, etc.)
 * Removes is-selected from all options, applies it to the clicked one.
 */
function selectGenOption(clickedEl) {
  var allOptions = document.querySelectorAll('.gen-option');
  allOptions.forEach(function (opt) {
    opt.classList.remove('is-selected');
  });
  clickedEl.classList.add('is-selected');
}

/**
 * Show the loading panel, then navigate to the quiz screen
 * after LOADING_DURATION ms to simulate AI processing.
 */
function triggerLoading() {
  var panel = document.getElementById('loadingPanel');
  if (!panel) return;

  panel.style.display = 'block';

  setTimeout(function () {
    panel.style.display = 'none';
    showScreen('quiz');
  }, LOADING_DURATION);
}


/* ============================================================
   Quiz Screen
============================================================ */

/**
 * Select a quiz answer option.
 * Clears all .is-selected within the same .quiz-options container,
 * then marks the clicked option.
 */
function pickOption(clickedEl) {
  var container = clickedEl.closest('.quiz-options');
  if (!container) return;

  container.querySelectorAll('.quiz-option').forEach(function (opt) {
    opt.classList.remove('is-selected');
  });

  clickedEl.classList.add('is-selected');
}


/* ============================================================
   Leaderboard Screen
============================================================ */

/**
 * Toggle between Classroom and Global leaderboard views.
 * @param {string} view - 'classroom' or 'global'
 */
function toggleLeaderboard(view) {
  var showClassroom = (view === 'classroom');

  var classroomPanel = document.getElementById('lbClassroom');
  var globalPanel    = document.getElementById('lbGlobal');
  var btnClassroom   = document.getElementById('btnClassroom');
  var btnGlobal      = document.getElementById('btnGlobal');

  if (classroomPanel) classroomPanel.style.display = showClassroom ? 'block' : 'none';
  if (globalPanel)    globalPanel.style.display    = showClassroom ? 'none' : 'block';

  if (btnClassroom) btnClassroom.classList.toggle('is-active',  showClassroom);
  if (btnGlobal)    btnGlobal.classList.toggle('is-active', !showClassroom);
}


/* ============================================================
   Quiz Countdown Timer
   Starts at 12:43 (763 seconds) and counts down every second.
   Updates the #timerDisplay element if it exists in the DOM.
============================================================ */

var quizSeconds = 763;

function tickTimer() {
  if (quizSeconds > 0) {
    quizSeconds--;
  }

  var minutes = Math.floor(quizSeconds / 60);
  var seconds = quizSeconds % 60;

  // Zero-pad both values
  var display = pad(minutes) + ':' + pad(seconds);

  var timerEl = document.getElementById('timerDisplay');
  if (timerEl) {
    timerEl.textContent = display;
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Kick off the timer
setInterval(tickTimer, 1000);


/* ============================================================
   Init
   Any setup that needs to run once the DOM is ready.
============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  // Dashboard is the default screen on load — already set via HTML class,
  // but calling showScreen ensures nav buttons are in sync too.
  showScreen('dashboard');
});
