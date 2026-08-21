# Piano Lesson Scheduler

A scheduling tool for piano teachers. Works on iPhone, iPad, and Mac as an installable web app (PWA).

---

## How to Run

### Option 1: Open directly
Double-click `index.html` to open in your browser. Some features (offline mode, "Add to Home Screen") require a local server instead.

### Option 2: Local server (recommended)
```bash
cd Scheduling_tool
python3 -m http.server 8080
```
Then open **http://localhost:8080** in Safari or Chrome.

---

## Install on Your Devices

### iPhone / iPad
1. On your Mac, start the server: `python3 -m http.server 8080`
2. Find your Mac's IP: **System Settings → Wi-Fi → Details → IP Address** (e.g. `192.168.1.42`)
3. On your iPhone/iPad (same Wi-Fi), open Safari and go to `http://192.168.1.42:8080`
4. Tap the **Share** button (square with arrow) → **Add to Home Screen**
5. The app now works like a native app — full screen, with its own icon

### Mac
1. Open `http://localhost:8080` in **Chrome**
2. Click the install icon in the address bar (or Menu → "Install Piano Lesson Scheduler")
3. The app appears in your Applications / Dock

### Safari on Mac
Open `http://localhost:8080` in Safari. Bookmark it for quick access.

---

## Features

### Calendar
- **Month view** — see all lessons at a glance with colored dots
- **Week view** — hourly grid showing lesson blocks across the week
- **Day view** — detailed hourly breakdown of a single day
- Tap any day or time slot to quickly create a lesson

### Lessons
- Schedule one-time or recurring lessons (weekly / bi-weekly)
- Set date, time, duration, and rate per lesson
- Track status: **Scheduled**, **Completed**, **Cancelled**, **No Show**
- Add notes for repertoire, assignments, or progress
- Filter by student or status

### Students
- Store name, email, phone, skill level, age group
- Parent/guardian field for minors
- Notes for goals and preferences
- See upcoming lesson count at a glance

### Notifications
- **Toggle on/off** in Settings → Notifications
- Sends a reminder before each lesson (default: 5 min, configurable to 10/15/30 min)
- Works on **Mac** (browser notifications), **iPhone/iPad** (PWA push), and **Apple Watch** (mirrored from iPhone)
- To enable:
  1. Go to the **Settings** tab
  2. Turn on the **Lesson Reminders** toggle
  3. Allow notification permission when prompted
  4. Choose your preferred reminder time
- To disable: simply toggle the switch off

### Schedule Conflict Prevention
- The app **blocks double-booking** — you cannot save a lesson that overlaps with an existing one
- Conflicts are checked for both one-time and recurring lessons
- Cancelled lessons are excluded from conflict checks

### Settings
- Set your name, default lesson duration, and hourly rate
- Configure working hours and working days
- **Export** all data as a JSON file (backup)
- **Import** data from a JSON backup
- **Clear** all data

---

## Data Storage

All data is saved in your browser's **localStorage**. This means:
- Data persists between sessions on the same device/browser
- Each device keeps its own copy
- Use **Export/Import** in Settings to transfer data between devices

---

## File Structure

```
Scheduling_tool/
├── index.html      ← Main app page
├── style.css       ← Responsive styles (mobile + desktop)
├── app.js          ← Application logic
├── manifest.json   ← PWA manifest (enables "Add to Home Screen")
├── sw.js           ← Service worker (offline caching)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md       ← This file
```
