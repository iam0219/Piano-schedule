// Piano Lesson Scheduler — PWA App
(function () {
  'use strict';

  // ── Data layer (localStorage) ──
  const DB_KEY = 'piano_scheduler';

  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || defaultData();
    } catch { return defaultData(); }
  }

  function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(data)); }

  function defaultData() {
    return {
      students: [],
      lessons: [],
      settings: {
        teacherName: '',
        defaultDuration: 60,
        defaultRate: 50,
        workStart: '09:00',
        workEnd: '21:00',
        workingDays: [1, 2, 3, 4, 5],
        notificationsEnabled: false,
        notifyMinutes: 5,
      },
    };
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  let data = loadData();

  // ── State ──
  let currentDate = new Date();
  let selectedDate = null;
  let calendarView = 'month'; // month | week | day

  // ── DOM refs ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Tab navigation ──
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.view').forEach((v) => v.classList.remove('active'));
      $('#' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'lessons') renderLessons();
      if (btn.dataset.tab === 'students') renderStudents();
      if (btn.dataset.tab === 'settings') loadSettings();
      if (btn.dataset.tab === 'calendar') renderCalendar();
    });
  });

  // ── Calendar navigation ──
  $('#prev-month').addEventListener('click', () => {
    if (calendarView === 'month') currentDate.setMonth(currentDate.getMonth() - 1);
    else if (calendarView === 'week') currentDate.setDate(currentDate.getDate() - 7);
    else currentDate.setDate(currentDate.getDate() - 1);
    renderCalendar();
  });

  $('#next-month').addEventListener('click', () => {
    if (calendarView === 'month') currentDate.setMonth(currentDate.getMonth() + 1);
    else if (calendarView === 'week') currentDate.setDate(currentDate.getDate() + 7);
    else currentDate.setDate(currentDate.getDate() + 1);
    renderCalendar();
  });

  $$('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      calendarView = btn.dataset.view;
      renderCalendar();
    });
  });

  // ── Render calendar ──
  function renderCalendar() {
    const grid = $('#calendar-grid');
    grid.innerHTML = '';
    grid.className = '';

    if (calendarView === 'month') renderMonthView(grid);
    else if (calendarView === 'week') renderWeekView(grid);
    else renderDayView(grid);

    updateMonthLabel();
  }

  function updateMonthLabel() {
    const opts = calendarView === 'day'
      ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { month: 'long', year: 'numeric' };
    $('#current-month').textContent = currentDate.toLocaleDateString('en-US', opts);
  }

  function renderMonthView(grid) {
    grid.className = 'calendar-month';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'calendar-day-header';
      el.textContent = d;
      grid.appendChild(el);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Previous month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      grid.appendChild(createDayCell(new Date(year, month - 1, prevDays - i), true));
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const cell = createDayCell(date, false);
      if (date.toDateString() === today.toDateString()) cell.classList.add('today');
      if (selectedDate && date.toDateString() === selectedDate.toDateString()) cell.classList.add('selected');
      grid.appendChild(cell);
    }

    // Next month padding
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      grid.appendChild(createDayCell(new Date(year, month + 1, d), true));
    }
  }

  function createDayCell(date, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day' + (isOtherMonth ? ' other-month' : '');
    const num = document.createElement('span');
    num.className = 'day-number';
    num.textContent = date.getDate();
    cell.appendChild(num);

    const lessons = getLessonsForDate(date);
    if (lessons.length > 0) {
      const dots = document.createElement('div');
      dots.className = 'lesson-dots';
      lessons.slice(0, 4).forEach((l) => {
        const dot = document.createElement('div');
        dot.className = 'lesson-dot ' + l.status;
        dots.appendChild(dot);
      });
      cell.appendChild(dots);
    }

    cell.addEventListener('click', () => {
      selectedDate = new Date(date);
      renderCalendar();
      showDayDetail(date);
    });

    return cell;
  }

  function showDayDetail(date) {
    const panel = $('#day-detail');
    panel.classList.remove('hidden');
    $('#day-detail-title').textContent = date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const container = $('#day-lessons');
    const lessons = getLessonsForDate(date);
    if (lessons.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No lessons</p>
        <button class="primary-btn" onclick="document.getElementById('add-lesson-btn').click()">+ Add Lesson</button></div>`;
      return;
    }

    container.innerHTML = '';
    lessons
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach((l) => {
        const student = data.students.find((s) => s.id === l.studentId);
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.innerHTML = `
          <div class="lesson-color-bar ${l.status}"></div>
          <div class="lesson-info">
            <h4>${student ? escapeHtml(student.name) : 'Unknown'}</h4>
            <p>${formatTime(l.time)} · ${l.duration} min</p>
          </div>
          <span class="lesson-status ${l.status}">${l.status}</span>`;
        card.addEventListener('click', () => openLessonModal(l));
        container.appendChild(card);
      });
  }

  function renderWeekView(grid) {
    grid.className = 'calendar-week';
    const startOfWeek = getStartOfWeek(currentDate);

    // Empty top-left corner
    grid.appendChild(Object.assign(document.createElement('div'), { className: 'week-time-label' }));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + d);
      const header = document.createElement('div');
      header.className = 'week-day-header';
      header.textContent = `${dayNames[d]} ${dayDate.getDate()}`;
      grid.appendChild(header);
    }

    const startH = parseInt(data.settings.workStart) || 9;
    const endH = parseInt(data.settings.workEnd) || 21;

    for (let h = startH; h <= endH; h++) {
      const label = document.createElement('div');
      label.className = 'week-time-label';
      label.textContent = formatHour(h);
      grid.appendChild(label);

      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(dayDate.getDate() + d);
        const cell = document.createElement('div');
        cell.className = 'week-cell';

        const lessons = getLessonsForDate(dayDate).filter((l) => {
          const lh = parseInt(l.time.split(':')[0]);
          return lh === h;
        });

        lessons.forEach((l) => {
          const student = data.students.find((s) => s.id === l.studentId);
          const block = document.createElement('div');
          block.className = 'week-lesson-block';
          block.textContent = student ? student.name : '?';
          block.style.height = (l.duration / 60 * 48) + 'px';
          block.addEventListener('click', (e) => { e.stopPropagation(); openLessonModal(l); });
          cell.appendChild(block);
        });

        cell.addEventListener('click', () => {
          const dateStr = toDateStr(dayDate);
          const timeStr = String(h).padStart(2, '0') + ':00';
          openLessonModal(null, dateStr, timeStr);
        });
        grid.appendChild(cell);
      }
    }
  }

  function renderDayView(grid) {
    grid.className = 'calendar-day-view';
    const startH = parseInt(data.settings.workStart) || 9;
    const endH = parseInt(data.settings.workEnd) || 21;
    const lessons = getLessonsForDate(currentDate);

    for (let h = startH; h <= endH; h++) {
      const row = document.createElement('div');
      row.className = 'day-hour-row';

      const label = document.createElement('div');
      label.className = 'day-time-label';
      label.textContent = formatHour(h);
      row.appendChild(label);

      const cell = document.createElement('div');
      cell.className = 'day-hour-cell';

      const hourLessons = lessons.filter((l) => parseInt(l.time.split(':')[0]) === h);
      hourLessons.forEach((l) => {
        const student = data.students.find((s) => s.id === l.studentId);
        const block = document.createElement('div');
        block.className = 'day-lesson-block';
        block.innerHTML = `<div class="lesson-time">${formatTime(l.time)} · ${l.duration} min</div>
          <div class="lesson-name">${student ? escapeHtml(student.name) : 'Unknown'}</div>`;
        block.addEventListener('click', (e) => { e.stopPropagation(); openLessonModal(l); });
        cell.appendChild(block);
      });

      cell.addEventListener('click', () => {
        openLessonModal(null, toDateStr(currentDate), String(h).padStart(2, '0') + ':00');
      });

      row.appendChild(cell);
      grid.appendChild(row);
    }
  }

  // ── Lessons ──
  function renderLessons() {
    populateStudentDropdowns();
    const container = $('#lessons-list');
    let lessons = [...data.lessons].sort((a, b) => {
      const da = a.date + a.time;
      const db = b.date + b.time;
      return db.localeCompare(da);
    });

    const filterStudent = $('#filter-student').value;
    const filterStatus = $('#filter-status').value;
    if (filterStudent) lessons = lessons.filter((l) => l.studentId === filterStudent);
    if (filterStatus) lessons = lessons.filter((l) => l.status === filterStatus);

    if (lessons.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <p>No lessons found</p>
        <p class="subtitle">Tap + to schedule a lesson</p></div>`;
      return;
    }

    container.innerHTML = '';
    lessons.forEach((l) => {
      const student = data.students.find((s) => s.id === l.studentId);
      const card = document.createElement('div');
      card.className = 'lesson-card';
      const dateObj = parseDate(l.date);
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      card.innerHTML = `
        <div class="lesson-color-bar ${l.status}"></div>
        <div class="lesson-info">
          <h4>${student ? escapeHtml(student.name) : 'Unknown'}</h4>
          <p>${dateStr} · ${formatTime(l.time)} · ${l.duration} min · $${l.rate}</p>
        </div>
        <span class="lesson-status ${l.status}">${l.status}</span>`;
      card.addEventListener('click', () => openLessonModal(l));
      container.appendChild(card);
    });
  }

  $('#filter-student').addEventListener('change', renderLessons);
  $('#filter-status').addEventListener('change', renderLessons);

  // ── Students ──
  function renderStudents() {
    const container = $('#students-list');
    if (data.students.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <p>No students yet</p>
        <p class="subtitle">Tap + to add your first student</p></div>`;
      return;
    }

    container.innerHTML = '';
    data.students
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((s) => {
        const count = data.lessons.filter((l) => l.studentId === s.id && l.status === 'scheduled').length;
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
          <div class="student-avatar">${escapeHtml(s.name.charAt(0).toUpperCase())}</div>
          <div class="student-info">
            <h4>${escapeHtml(s.name)}</h4>
            <p>${s.level} · ${count} upcoming</p>
          </div>
          <span class="student-level">${escapeHtml(s.level)}</span>`;
        card.addEventListener('click', () => openStudentModal(s));
        container.appendChild(card);
      });
  }

  // ── Lesson Modal ──
  function openLessonModal(lesson, prefillDate, prefillTime) {
    populateStudentDropdowns();
    const modal = $('#lesson-modal');
    const form = $('#lesson-form');
    form.reset();

    if (lesson) {
      $('#lesson-modal-title').textContent = 'Edit Lesson';
      $('#lesson-id').value = lesson.id;
      $('#lesson-student').value = lesson.studentId;
      $('#lesson-date').value = lesson.date;
      $('#lesson-time').value = lesson.time;
      $('#lesson-duration').value = lesson.duration;
      $('#lesson-rate').value = lesson.rate;
      $('#lesson-status').value = lesson.status;
      $('#lesson-recurrence').value = lesson.recurrence || 'none';
      $('#lesson-notes').value = lesson.notes || '';
      $('#delete-lesson-btn').classList.remove('hidden');
    } else {
      $('#lesson-modal-title').textContent = 'New Lesson';
      $('#lesson-id').value = '';
      $('#lesson-date').value = prefillDate || toDateStr(selectedDate || new Date());
      $('#lesson-time').value = prefillTime || '';
      $('#lesson-duration').value = data.settings.defaultDuration;
      $('#lesson-rate').value = data.settings.defaultRate;
      $('#lesson-status').value = 'scheduled';
      $('#lesson-recurrence').value = 'none';
      $('#delete-lesson-btn').classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  $('#add-lesson-btn').addEventListener('click', () => openLessonModal(null));

  function hasConflict(lessonData, excludeId) {
    const [h, m] = lessonData.time.split(':').map(Number);
    const start = h * 60 + m;
    const end = start + lessonData.duration;

    return data.lessons.find((l) => {
      if (l.id === excludeId) return false;
      if (l.date !== lessonData.date) return false;
      if (l.status === 'cancelled') return false;
      const [lh, lm] = l.time.split(':').map(Number);
      const lStart = lh * 60 + lm;
      const lEnd = lStart + l.duration;
      return start < lEnd && end > lStart;
    });
  }

  $('#lesson-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#lesson-id').value;
    const lessonData = {
      id: id || uid(),
      studentId: $('#lesson-student').value,
      date: $('#lesson-date').value,
      time: $('#lesson-time').value,
      duration: parseInt($('#lesson-duration').value),
      rate: parseFloat($('#lesson-rate').value) || 0,
      status: $('#lesson-status').value,
      recurrence: $('#lesson-recurrence').value,
      notes: $('#lesson-notes').value.trim(),
    };

    // Check for conflicts
    if (lessonData.status !== 'cancelled') {
      const conflict = hasConflict(lessonData, id || null);
      if (conflict) {
        const cStudent = data.students.find((s) => s.id === conflict.studentId);
        const cName = cStudent ? cStudent.name : 'another lesson';
        alert(`Schedule conflict! Overlaps with ${cName} at ${formatTime(conflict.time)} on ${conflict.date}.`);
        return;
      }
    }

    if (id) {
      const idx = data.lessons.findIndex((l) => l.id === id);
      if (idx !== -1) data.lessons[idx] = lessonData;
    } else {
      // Check recurring conflicts before committing
      if (lessonData.recurrence !== 'none') {
        const weeks = lessonData.recurrence === 'weekly' ? 1 : 2;
        const baseDate = parseDate(lessonData.date);
        for (let i = 1; i <= 12; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setDate(nextDate.getDate() + weeks * 7 * i);
          const recurring = { ...lessonData, date: toDateStr(nextDate) };
          const conflict = hasConflict(recurring, null);
          if (conflict) {
            const cStudent = data.students.find((s) => s.id === conflict.studentId);
            const cName = cStudent ? cStudent.name : 'another lesson';
            alert(`Recurring conflict on ${recurring.date}: overlaps with ${cName} at ${formatTime(conflict.time)}.`);
            return;
          }
        }
      }

      data.lessons.push(lessonData);
      if (lessonData.recurrence !== 'none') {
        const weeks = lessonData.recurrence === 'weekly' ? 1 : 2;
        const baseDate = parseDate(lessonData.date);
        for (let i = 1; i <= 12; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setDate(nextDate.getDate() + weeks * 7 * i);
          data.lessons.push({
            ...lessonData,
            id: uid(),
            date: toDateStr(nextDate),
          });
        }
      }
    }

    saveData();
    closeLessonModal();
    renderCalendar();
    renderLessons();
  });

  $('#delete-lesson-btn').addEventListener('click', () => {
    const id = $('#lesson-id').value;
    if (id && confirm('Delete this lesson?')) {
      data.lessons = data.lessons.filter((l) => l.id !== id);
      saveData();
      closeLessonModal();
      renderCalendar();
      renderLessons();
    }
  });

  function closeLessonModal() {
    $('#lesson-modal').classList.add('hidden');
  }

  // ── Student Modal ──
  function openStudentModal(student) {
    const modal = $('#student-modal');
    const form = $('#student-form');
    form.reset();

    if (student) {
      $('#student-modal-title').textContent = 'Edit Student';
      $('#student-id').value = student.id;
      $('#student-name').value = student.name;
      $('#student-email').value = student.email || '';
      $('#student-phone').value = student.phone || '';
      $('#student-level').value = student.level || 'beginner';
      $('#student-age').value = student.age || 'adult';
      $('#student-parent').value = student.parent || '';
      $('#student-notes').value = student.notes || '';
      $('#delete-student-btn').classList.remove('hidden');
    } else {
      $('#student-modal-title').textContent = 'New Student';
      $('#student-id').value = '';
      $('#delete-student-btn').classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  $('#add-student-btn').addEventListener('click', () => openStudentModal(null));

  $('#student-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#student-id').value;
    const studentData = {
      id: id || uid(),
      name: $('#student-name').value.trim(),
      email: $('#student-email').value.trim(),
      phone: $('#student-phone').value.trim(),
      level: $('#student-level').value,
      age: $('#student-age').value,
      parent: $('#student-parent').value.trim(),
      notes: $('#student-notes').value.trim(),
    };

    if (id) {
      const idx = data.students.findIndex((s) => s.id === id);
      if (idx !== -1) data.students[idx] = studentData;
    } else {
      data.students.push(studentData);
    }

    saveData();
    closeStudentModal();
    renderStudents();
    populateStudentDropdowns();
  });

  $('#delete-student-btn').addEventListener('click', () => {
    const id = $('#student-id').value;
    if (id && confirm('Delete this student and all their lessons?')) {
      data.students = data.students.filter((s) => s.id !== id);
      data.lessons = data.lessons.filter((l) => l.studentId !== id);
      saveData();
      closeStudentModal();
      renderStudents();
      renderLessons();
      renderCalendar();
    }
  });

  function closeStudentModal() {
    $('#student-modal').classList.add('hidden');
  }

  // Close modals on overlay click
  $$('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', () => {
      overlay.parentElement.classList.add('hidden');
    });
  });

  $$('.close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });

  // ── Settings ──
  function loadSettings() {
    const s = data.settings;
    $('#teacher-name').value = s.teacherName || '';
    $('#default-duration').value = s.defaultDuration || 60;
    $('#default-rate').value = s.defaultRate || 50;
    $('#work-start').value = s.workStart || '09:00';
    $('#work-end').value = s.workEnd || '21:00';
    $('#notify-toggle').checked = !!s.notificationsEnabled;
    $('#notify-minutes').value = s.notifyMinutes || 5;
    $('#notify-status').textContent = s.notificationsEnabled ? 'Notifications enabled ✓' : '';
    $$('.day-checkboxes input').forEach((cb) => {
      cb.checked = (s.workingDays || []).includes(parseInt(cb.value));
    });
  }

  // Auto-save settings on change
  ['teacher-name', 'default-duration', 'default-rate', 'work-start', 'work-end'].forEach((id) => {
    $('#' + id).addEventListener('change', saveSettings);
  });
  $$('.day-checkboxes input').forEach((cb) => cb.addEventListener('change', saveSettings));

  function saveSettings() {
    data.settings.teacherName = $('#teacher-name').value.trim();
    data.settings.defaultDuration = parseInt($('#default-duration').value);
    data.settings.defaultRate = parseFloat($('#default-rate').value) || 0;
    data.settings.workStart = $('#work-start').value;
    data.settings.workEnd = $('#work-end').value;
    data.settings.workingDays = [...$$('.day-checkboxes input:checked')].map((cb) => parseInt(cb.value));
    saveData();
  }

  // Export / Import
  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piano_schedule_${toDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.students && imported.lessons) {
          data = imported;
          saveData();
          renderCalendar();
          renderLessons();
          renderStudents();
          loadSettings();
          alert('Data imported successfully!');
        } else {
          alert('Invalid data file.');
        }
      } catch { alert('Failed to parse file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#clear-btn').addEventListener('click', () => {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      data = defaultData();
      saveData();
      renderCalendar();
      renderLessons();
      renderStudents();
      loadSettings();
    }
  });

  // ── Helpers ──
  function getLessonsForDate(date) {
    const ds = toDateStr(date);
    return data.lessons.filter((l) => l.date === ds);
  }

  function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  function formatHour(h) {
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1} ${suffix}`;
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function populateStudentDropdowns() {
    const sorted = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
    const options = sorted.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

    $('#lesson-student').innerHTML = '<option value="">Select student...</option>' + options;
    $('#filter-student').innerHTML = '<option value="">All Students</option>' + options;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Notifications ──
  let notifyInterval = null;

  $('#notify-toggle').addEventListener('change', async () => {
    const toggle = $('#notify-toggle');
    if (toggle.checked) {
      if (!('Notification' in window)) {
        toggle.checked = false;
        $('#notify-status').textContent = 'Notifications not supported in this browser.';
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toggle.checked = false;
        $('#notify-status').textContent = 'Permission denied. Enable in browser/system settings.';
        return;
      }
      data.settings.notificationsEnabled = true;
      $('#notify-status').textContent = 'Notifications enabled ✓';
    } else {
      data.settings.notificationsEnabled = false;
      $('#notify-status').textContent = '';
    }
    saveData();
    startNotificationChecker();
  });

  $('#notify-minutes').addEventListener('change', () => {
    data.settings.notifyMinutes = parseInt($('#notify-minutes').value);
    saveData();
  });

  function startNotificationChecker() {
    if (notifyInterval) clearInterval(notifyInterval);
    if (!data.settings.notificationsEnabled) return;
    notifyInterval = setInterval(checkUpcomingLessons, 30000);
    checkUpcomingLessons();
  }

  const notifiedLessons = new Set();

  function checkUpcomingLessons() {
    if (!data.settings.notificationsEnabled) return;
    const now = new Date();
    const ahead = data.settings.notifyMinutes || 5;

    data.lessons.forEach((l) => {
      if (l.status !== 'scheduled') return;
      if (notifiedLessons.has(l.id)) return;

      const [y, m, d] = l.date.split('-').map(Number);
      const [hh, mm] = l.time.split(':').map(Number);
      const lessonTime = new Date(y, m - 1, d, hh, mm);
      const diff = (lessonTime - now) / 60000;

      if (diff > 0 && diff <= ahead) {
        const student = data.students.find((s) => s.id === l.studentId);
        const name = student ? student.name : 'a student';
        sendNotification(
          `Lesson in ${Math.ceil(diff)} min`,
          `${name} — ${formatTime(l.time)} (${l.duration} min)`
        );
        notifiedLessons.add(l.id);
      }
    });
  }

  function sendNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    // Use standalone PWA detection — service worker notifications needed only on mobile PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isStandalone && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts)).catch(() => {});
    } else {
      new Notification(title, opts);
    }
  }

  $('#notify-test-btn').addEventListener('click', async () => {
    const status = $('#notify-status');
    // Step 1: API support
    if (!('Notification' in window)) {
      status.textContent = '✗ Notification API not available in this browser.';
      return;
    }
    status.textContent = '✓ Notification API available. Requesting permission...';

    // Step 2: Permission
    const perm = await Notification.requestPermission();
    if (perm === 'denied') {
      status.textContent = '✗ Permission DENIED. Go to: Chrome → Settings → Privacy → Notifications → allow localhost. Also check: Mac System Settings → Notifications → Google Chrome → Allow.';
      return;
    }
    if (perm === 'default') {
      status.textContent = '✗ Permission dismissed. Click the test button again and choose "Allow" in the popup.';
      return;
    }
    status.textContent = '✓ Permission granted. Sending test...';

    // Step 3: Send
    try {
      const n = new Notification('🎹 Test Notification', {
        body: 'Notifications are working! You will be reminded before lessons.',
        icon: 'icons/icon-192.png',
      });
      n.onclick = () => { window.focus(); n.close(); };
      status.textContent = '✓ Notification sent! If you don\'t see it, check: Mac System Settings → Notifications → Google Chrome → Allow Notifications must be ON.';
    } catch (err) {
      status.textContent = '✗ Failed: ' + err.message;
    }
  });

  // ── Init ──
  renderCalendar();
  populateStudentDropdowns();
  startNotificationChecker();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
