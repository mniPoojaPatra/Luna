import DB from './db.js';
import Auth from './auth.js';
import ThemeManager from './theme.js';
import Camera from './camera.js';

const App = {
  activeView: 'view-login',
  currentDateOffset: 0, // calendar month navigator
  breathingTimer: null,
  activeCameraVideo: null,
  selectedMood: 'cozy',
  tempPhotoData: null, // holds base64 photo for current editor
  editingEntryId: null, // holds ID if editing an existing entry

  init() {
    // Check if session exists
    const loggedInUser = DB.getActiveUser();
    if (loggedInUser) {
      this.loginSuccess(loggedInUser);
    } else {
      this.showView('view-login');
    }

    // Initialize Auth bindings
    Auth.init((username) => this.loginSuccess(username));

    // Bind navigation and general events
    this.bindGlobalEvents();
  },

  showView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
      if (view.id === viewId) {
        view.classList.add('active');
        view.style.display = (view.id === 'view-login') ? 'flex' : 'block';
      } else {
        view.classList.remove('active');
        view.style.display = 'none';
      }
    });

    // Update active nav link
    document.querySelectorAll('.nav-links li').forEach(li => {
      const a = li.querySelector('a');
      if (a && a.getAttribute('data-target') === viewId) {
        li.classList.add('active');
      } else {
        li.classList.remove('active');
      }
    });

    this.activeView = viewId;
  },

  loginSuccess(username) {
    // Show navigation header
    document.getElementById('app-header').style.display = 'flex';
    
    // Set greeting
    const hour = new Date().getHours();
    let timeGreeting = 'dreamer';
    if (hour < 12) timeGreeting = 'morning riser';
    else if (hour < 17) timeGreeting = 'afternoon spirit';
    else timeGreeting = 'evening dreamer';
    
    document.getElementById('dashboard-welcome').textContent = `good ${timeGreeting}, ${username}`;

    // Apply saved theme & audio setup
    ThemeManager.init();

    // Load widgets state
    this.loadDeskWidgets();

    // Render workspace areas
    this.renderChecklist();
    this.renderMemoryWall();
    this.renderCalendar();

    // Switch view
    this.showView('view-dashboard');
  },

  logout() {
    DB.logout();
    ThemeManager.reset();
    
    // Clear camera
    Camera.stop();
    this.activeCameraVideo = null;
    this.tempPhotoData = null;
    
    // Hide header & show login
    document.getElementById('app-header').style.display = 'none';
    this.showView('view-login');
  },

  bindGlobalEvents() {
    // Navigation routing
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        this.showView(target);
        
        // Refresh memory wall or calendar when navigating
        if (target === 'view-memory-wall') {
          this.renderMemoryWall();
        } else if (target === 'view-calendar') {
          this.renderCalendar();
        }
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Write Memory desk shortcut
    document.getElementById('btn-quick-journal').addEventListener('click', () => {
      this.openJournalEditor();
    });

    // Zoom Toggle on memory wall
    const zoomBtn = document.getElementById('btn-toggle-zoom');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        const grid = document.getElementById('memory-peg-board');
        const textSpan = document.getElementById('zoom-btn-text');
        if (grid.classList.contains('zoomed-out')) {
          grid.classList.remove('zoomed-out');
          textSpan.textContent = '🔍 Zoom Out';
        } else {
          grid.classList.add('zoomed-out');
          textSpan.textContent = '🔍 Zoom In';
        }
      });
    }

    // Modal close triggers
    document.getElementById('btn-close-editor').addEventListener('click', () => this.closeJournalEditor());
    document.getElementById('btn-cancel-journal').addEventListener('click', () => this.closeJournalEditor());
    document.getElementById('btn-close-viewer').addEventListener('click', () => this.closeJournalViewer());

    // Breathing guide controls
    const breatheBtn = document.getElementById('btn-breathe-control');
    if (breatheBtn) {
      breatheBtn.addEventListener('click', () => this.toggleBreathingGuide());
    }

    // Initialize date changes inside editor
    const dateInput = document.getElementById('journal-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this.updateEditorStampDate(e.target.value);
      });
    }
  },

  /* ==================== DESK INTERACTIVE WIDGETS ==================== */
  loadDeskWidgets() {
    // 1. Lamp
    const isLampOn = DB.getLampState();
    if (isLampOn) {
      document.body.classList.add('lamp-on');
    } else {
      document.body.classList.remove('lamp-on');
    }
    
    const lampWidget = document.getElementById('desk-lamp-widget');
    const handleLampToggle = () => {
      const activeState = document.body.classList.toggle('lamp-on');
      DB.setLampState(activeState);
    };
    if (lampWidget) {
      lampWidget.onclick = handleLampToggle;
      lampWidget.style.cursor = 'pointer';
    }

    // Track mouse coordinates for realistic spotlight glow displacement
    document.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('lamp-on')) {
        const lamp = document.getElementById('desk-lamp-widget');
        if (lamp) {
          const rect = lamp.getBoundingClientRect();
          const bulbX = rect.left + rect.width / 2;
          const bulbY = rect.top + 70; // approximate bulb position
          
          document.documentElement.style.setProperty('--lamp-x', `${bulbX}px`);
          document.documentElement.style.setProperty('--lamp-y', `${bulbY}px`);
        }
      }
    });

    // 2. Interactive Retro Monitor Widget (Click to cycle states)
    const monitorWidget = document.getElementById('desk-monitor-widget');
    if (monitorWidget) {
      const screenDefault = document.getElementById('screen-default');
      const screenMessage = document.getElementById('screen-message');
      const screenPhoto = document.getElementById('screen-photo');
      const messageText = document.getElementById('monitor-cute-message');
      const memoryImg = document.getElementById('monitor-memory-img');
      const memoryDate = document.getElementById('monitor-memory-date');
      const powerLed = monitorWidget.querySelector('.power-led');

      const cuteMessages = [
        "You are doing great, dreamer! ✦",
        "Take a deep breath. 🌸",
        "Everything is going to be okay. 🌙",
        "Rest your mind tonight. ☕",
        "You are enough. ✨",
        "Soft thoughts only. ☁️",
        "Smile, you did your best. 💛",
        "Tomorrow is a fresh page. 🌱"
      ];

      let monitorState = 0; // 0: Default, 1: Message, 2: Recent Photo Memory

      const updateMonitorDisplay = () => {
        // Hide all screens
        if (screenDefault) screenDefault.style.display = 'none';
        if (screenMessage) screenMessage.style.display = 'none';
        if (screenPhoto) screenPhoto.style.display = 'none';

        if (monitorState === 0) {
          // State 0: LUNA OS Default
          if (screenDefault) screenDefault.style.display = 'flex';
          if (powerLed) {
            powerLed.style.background = '#81c784'; // green
            powerLed.style.boxShadow = '0 0 5px #81c784';
          }
        } else if (monitorState === 1) {
          // State 1: Cute message
          const randomMsg = cuteMessages[Math.floor(Math.random() * cuteMessages.length)];
          if (messageText) messageText.textContent = randomMsg;
          if (screenMessage) screenMessage.style.display = 'flex';
          if (powerLed) {
            powerLed.style.background = '#ffb74d'; // orange/amber
            powerLed.style.boxShadow = '0 0 5px #ffb74d';
          }
        } else if (monitorState === 2) {
          // State 2: Recent Photo Memory
          const entries = DB.getEntries();
          // Find the most recent entry that has an image
          const recentPhotoEntry = entries.find(e => e.img);

          if (recentPhotoEntry && memoryImg) {
            memoryImg.src = recentPhotoEntry.img;
            
            // Format short date
            if (memoryDate) {
              const date = new Date(recentPhotoEntry.date);
              const options = { month: 'short', day: 'numeric' };
              memoryDate.textContent = date.toLocaleDateString('en-US', options);
            }
            if (screenPhoto) screenPhoto.style.display = 'flex';
          } else {
            // Fallback if no memories contain photos
            if (messageText) messageText.textContent = "No photo memories yet! click write to add. 📷";
            if (screenMessage) screenMessage.style.display = 'flex';
          }
          if (powerLed) {
            powerLed.style.background = '#64b5f6'; // blue
            powerLed.style.boxShadow = '0 0 5px #64b5f6';
          }
        }
      };

      monitorWidget.onclick = () => {
        monitorState = (monitorState + 1) % 3;
        updateMonitorDisplay();
        
        // Add a small button-tap physical rotation effect
        monitorWidget.classList.add('rustle');
        setTimeout(() => monitorWidget.classList.remove('rustle'), 300);
      };

      // Initialize
      updateMonitorDisplay();
    }

    // 3. Sticky Note Custom Quotes - Central
    const stickyText = document.getElementById('sticky-text-display');
    const savedQuote = DB.getStickyQuote();
    if (stickyText) {
      stickyText.textContent = savedQuote;
      stickyText.parentElement.onclick = () => this.editStickyQuote('center');
    }

    // Left Sticky Note
    const stickyTextLeft = document.getElementById('sticky-left-text-display');
    const savedQuoteLeft = DB.getLeftStickyQuote();
    if (stickyTextLeft) {
      stickyTextLeft.textContent = savedQuoteLeft;
      stickyTextLeft.parentElement.onclick = () => this.editStickyQuote('left');
    }

    // Right Sticky Note
    const stickyTextRight = document.getElementById('sticky-right-text-display');
    const savedQuoteRight = DB.getRightStickyQuote();
    if (stickyTextRight) {
      stickyTextRight.textContent = savedQuoteRight;
      stickyTextRight.parentElement.onclick = () => this.editStickyQuote('right');
    }

    // 4. Checklist Todo Form
    const todoForm = document.getElementById('todo-form');
    if (todoForm) {
      todoForm.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        if (text) {
          const checklist = DB.getChecklist();
          checklist.push({
            id: Date.now().toString(),
            text: text,
            completed: false
          });
          DB.saveChecklist(checklist);
          input.value = '';
          this.renderChecklist();
        }
      };
    }
  },

  editStickyQuote(position = 'center') {
    let stickyId = 'dashboard-sticky';
    let textDisplayId = 'sticky-text-display';
    let defaultVal = 'Cherish yourself, because you are worth it.';
    let getMethod = () => DB.getStickyQuote();
    let setMethod = (val) => DB.setStickyQuote(val);

    if (position === 'left') {
      stickyId = 'dashboard-sticky-left';
      textDisplayId = 'sticky-left-text-display';
      defaultVal = 'be gentle with yourself 🌸';
      getMethod = () => DB.getLeftStickyQuote();
      setMethod = (val) => DB.setLeftStickyQuote(val);
    } else if (position === 'right') {
      stickyId = 'dashboard-sticky-right';
      textDisplayId = 'sticky-right-text-display';
      defaultVal = 'grow at your own pace 🌱';
      getMethod = () => DB.getRightStickyQuote();
      setMethod = (val) => DB.setRightStickyQuote(val);
    }

    const sticky = document.getElementById(stickyId);
    const textDisplay = document.getElementById(textDisplayId);
    if (!sticky || !textDisplay || sticky.querySelector('textarea')) return;

    const oldText = textDisplay.textContent;
    sticky.innerHTML = '';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-editor';
    textarea.value = oldText;
    textarea.maxLength = 60;
    sticky.appendChild(textarea);
    textarea.focus();

    const saveQuote = () => {
      const newText = textarea.value.trim() || defaultVal;
      setMethod(newText);
      sticky.innerHTML = '';
      
      const newDisplay = document.createElement('span');
      newDisplay.id = textDisplayId;
      newDisplay.textContent = newText;
      sticky.appendChild(newDisplay);
      
      // Rebind click
      sticky.onclick = () => this.editStickyQuote(position);
    };

    textarea.onblur = saveQuote;
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        textarea.blur();
      }
    };
  },

  renderChecklist() {
    const list = document.getElementById('todo-list');
    const countDisplay = document.getElementById('notebook-count');
    if (!list) return;

    list.innerHTML = '';
    const checklist = DB.getChecklist();
    let completedCount = 0;

    checklist.forEach(item => {
      if (item.completed) completedCount++;

      const li = document.createElement('li');
      li.className = `notebook-item ${item.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="item-left">
          <input type="checkbox" id="chk-${item.id}" ${item.completed ? 'checked' : ''}>
          <span class="item-text" id="lbl-${item.id}">${item.text}</span>
        </div>
        <button class="btn-delete-task" data-id="${item.id}" title="Delete Task">✕</button>
      `;

      // Checkbox event
      const chk = li.querySelector('input');
      chk.addEventListener('change', () => {
        item.completed = chk.checked;
        DB.saveChecklist(checklist);
        this.renderChecklist();
      });

      // Label click toggles
      const label = li.querySelector('.item-text');
      label.addEventListener('click', () => {
        chk.checked = !chk.checked;
        item.completed = chk.checked;
        DB.saveChecklist(checklist);
        this.renderChecklist();
      });

      // Delete button event
      const delBtn = li.querySelector('.btn-delete-task');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filtered = checklist.filter(t => t.id !== item.id);
        DB.saveChecklist(filtered);
        this.renderChecklist();
      });

      list.appendChild(li);
    });

    if (countDisplay) {
      countDisplay.textContent = `${completedCount} completed`;
    }
  },

  /* ==================== JOURNAL EDITOR ==================== */
  openJournalEditor(dateString = null, entryId = null) {
    const modal = document.getElementById('modal-journal-editor');
    const dateInput = document.getElementById('journal-date');
    
    // Clear state
    this.tempPhotoData = null;
    this.editingEntryId = entryId;
    
    // Set date defaults
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = dateString || today;
    this.updateEditorStampDate(dateInput.value);

    // Setup mood selectors
    this.selectedMood = 'cozy';
    const editorStampCard = document.getElementById('editor-stamp-card');
    if (editorStampCard) {
      editorStampCard.style.setProperty('--mood-border-color', `var(--mood-cozy)`);
    }
    document.querySelectorAll('.mood-option').forEach(opt => {
      opt.classList.remove('active');
      if (opt.getAttribute('data-mood') === 'cozy') {
        opt.classList.add('active');
      }
      
      // Bind click
      opt.onclick = () => {
        document.querySelectorAll('.mood-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.selectedMood = opt.getAttribute('data-mood');
        if (editorStampCard) {
          editorStampCard.style.setProperty('--mood-border-color', `var(--mood-${this.selectedMood})`);
        }
      };
    });

    // Setup stamp attachment choices
    const mediaBox = document.getElementById('stamp-capture-box');
    mediaBox.innerHTML = `
      <div class="stamp-media-placeholder" id="stamp-media-placeholder">
        <i>📸</i>
        <span>Add a daily photo<br><small>Click to upload or capture</small></span>
      </div>
    `;
    
    // Trigger choices menu on media box click
    mediaBox.onclick = () => this.openMediaChoiceMenu();

    // Reset reflection textareas
    document.getElementById('reflection-good').value = '';
    document.getElementById('reflection-upset').value = '';
    document.getElementById('reflection-improve').value = '';
    document.getElementById('journal-diary').value = '';

    // If editing existing, pre-fill values
    if (entryId) {
      const entries = DB.getEntries();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        dateInput.value = entry.date;
        this.updateEditorStampDate(entry.date);
        
        // Select mood
        this.selectedMood = entry.mood;
        if (editorStampCard) {
          editorStampCard.style.setProperty('--mood-border-color', `var(--mood-${entry.mood})`);
        }
        document.querySelectorAll('.mood-option').forEach(opt => {
          opt.classList.remove('active');
          if (opt.getAttribute('data-mood') === entry.mood) {
            opt.classList.add('active');
          }
        });

        // Set image if existing
        if (entry.img) {
          this.tempPhotoData = entry.img;
          mediaBox.innerHTML = `<img src="${entry.img}" alt="Journal Stamp image">`;
        }

        // Fill textareas
        document.getElementById('reflection-good').value = entry.good;
        document.getElementById('reflection-upset').value = entry.upset;
        document.getElementById('reflection-improve').value = entry.improve;
        document.getElementById('journal-diary').value = entry.text;
      }
    }

    modal.classList.add('show');
    
    // Save button event handler (clean overwrite)
    const saveBtn = document.getElementById('btn-save-journal');
    saveBtn.onclick = () => this.saveJournalEntry();
  },

  closeJournalEditor() {
    const modal = document.getElementById('modal-journal-editor');
    modal.classList.remove('show');
    
    // Stop camera if running
    Camera.stop();
    this.activeCameraVideo = null;
    document.getElementById('camera-controls-row').style.display = 'none';
  },

  updateEditorStampDate(dateVal) {
    const stampDate = document.getElementById('stamp-card-date');
    if (stampDate && dateVal) {
      const date = new Date(dateVal);
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      stampDate.textContent = date.toLocaleDateString('en-US', options);
    }
  },

  openMediaChoiceMenu() {
    // If video stream is already running, click shouldn't open menu again
    if (this.activeCameraVideo) return;

    const modal = document.getElementById('modal-media-choice');
    modal.classList.add('show');

    // Camera action
    document.getElementById('btn-choice-camera').onclick = () => {
      modal.classList.remove('show');
      this.startLiveCamera();
    };

    // File upload action
    document.getElementById('btn-choice-upload').onclick = () => {
      modal.classList.remove('show');
      document.getElementById('journal-photo-uploader').click();
    };

    // File uploader handler
    document.getElementById('journal-photo-uploader').onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.tempPhotoData = event.target.result;
          const mediaBox = document.getElementById('stamp-capture-box');
          mediaBox.innerHTML = `<img src="${this.tempPhotoData}" alt="Uploaded image">`;
        };
        reader.readAsDataURL(file);
      }
    };

    document.getElementById('btn-close-media-choice').onclick = () => {
      modal.classList.remove('show');
    };
  },

  async startLiveCamera() {
    const mediaBox = document.getElementById('stamp-capture-box');
    mediaBox.innerHTML = '<video id="editor-video-feed" autoplay playsinline></video>';
    
    const videoEl = document.getElementById('editor-video-feed');
    const cameraRes = await Camera.start(videoEl);
    
    if (cameraRes.success) {
      this.activeCameraVideo = videoEl;
      document.getElementById('camera-controls-row').style.display = 'flex';
      
      // Bind capturing buttons
      document.getElementById('btn-snap-photo').onclick = () => this.snapLivePhoto();
      document.getElementById('btn-cancel-camera').onclick = () => {
        Camera.stop();
        this.activeCameraVideo = null;
        document.getElementById('camera-controls-row').style.display = 'none';
        
        // Reset media box
        mediaBox.innerHTML = `
          <div class="stamp-media-placeholder" id="stamp-media-placeholder">
            <i>📸</i>
            <span>Add a daily photo<br><small>Click to upload or capture</small></span>
          </div>
        `;
      };
    } else {
      alert(cameraRes.message);
      mediaBox.innerHTML = `
        <div class="stamp-media-placeholder" id="stamp-media-placeholder">
          <i>📸</i>
          <span>Add a daily photo<br><small>Click to upload or capture</small></span>
        </div>
      `;
    }
  },

  snapLivePhoto() {
    if (!this.activeCameraVideo) return;
    
    // Add flash animation effect
    const mediaBox = document.getElementById('stamp-capture-box');
    mediaBox.classList.add('camera-flash');
    setTimeout(() => mediaBox.classList.remove('camera-flash'), 300);

    const snapshot = Camera.capture(this.activeCameraVideo);
    if (snapshot) {
      this.tempPhotoData = snapshot;
      
      // Stop camera stream
      Camera.stop();
      this.activeCameraVideo = null;
      document.getElementById('camera-controls-row').style.display = 'none';
      
      // Replace video with image
      mediaBox.innerHTML = `<img src="${this.tempPhotoData}" alt="Captured Image">`;
    }
  },

  saveJournalEntry() {
    const dateVal = document.getElementById('journal-date').value;
    const thoughts = document.getElementById('journal-diary').value.trim();
    const goodVal = document.getElementById('reflection-good').value.trim();
    const upsetVal = document.getElementById('reflection-upset').value.trim();
    const improveVal = document.getElementById('reflection-improve').value.trim();

    if (!dateVal) {
      alert('Please select a date.');
      return;
    }

    const entryData = {
      id: this.editingEntryId, // carry over ID if editing
      date: dateVal,
      mood: this.selectedMood,
      img: this.tempPhotoData,
      text: thoughts,
      good: goodVal,
      upset: upsetVal,
      improve: improveVal
    };

    DB.saveEntry(entryData);
    this.closeJournalEditor();
    
    // Refresh panels
    this.renderMemoryWall();
    this.renderCalendar();
  },

  /* ==================== MEMORY WALL pegboard grid ==================== */
  renderMemoryWall() {
    const board = document.getElementById('memory-peg-board');
    if (!board) return;

    board.innerHTML = '';
    const entries = DB.getEntries();

    if (entries.length === 0) {
      board.innerHTML = `
        <div class="memory-wall-empty-state">
          <span style="font-size: 3rem; display: block; margin-bottom: 10px;">📓</span>
          <h3>Your scrapbook is empty</h3>
          <p>Go to the desk to write your first memory and lock it in time.</p>
        </div>
      `;
      return;
    }

    // Sort entries descending (newest first)
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group entries by Year and then by Month
    const groups = {};
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    sortedEntries.forEach(entry => {
      const date = new Date(entry.date);
      const year = date.getFullYear().toString();
      const month = monthNames[date.getMonth()];

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(entry);
    });

    const sortedYears = Object.keys(groups).sort((a, b) => b - a);

    sortedYears.forEach(year => {
      const yearSection = document.createElement('div');
      yearSection.className = 'memory-year-section';

      const yearHeader = document.createElement('h2');
      yearHeader.className = 'memory-year-header';
      yearHeader.textContent = year;
      yearSection.appendChild(yearHeader);

      const monthsInYear = groups[year];
      const sortedMonths = Object.keys(monthsInYear).sort((a, b) => {
        return monthNames.indexOf(b) - monthNames.indexOf(a);
      });

      sortedMonths.forEach(month => {
        const monthSection = document.createElement('div');
        monthSection.className = 'memory-month-section';

        const monthHeader = document.createElement('h3');
        monthHeader.className = 'memory-month-header';
        monthHeader.textContent = month;
        monthSection.appendChild(monthHeader);

        const grid = document.createElement('div');
        grid.className = 'memory-grid';

        monthsInYear[month].forEach(entry => {
          const cell = document.createElement('div');
          cell.className = 'memory-cell';

          cell.innerHTML = `
            <div class="peg-hook"></div>
            <div class="hanging-string"></div>
            <div class="wooden-clip"></div>
            <div class="hanging-card-wrapper" style="--mood-color: var(--mood-${entry.mood}); --mood-border-color: var(--mood-${entry.mood});">
              <div class="hanging-card" data-id="${entry.id}">
                <svg class="card-string" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M50,0 L0,100 M50,0 L100,100" stroke="var(--mood-color)" stroke-width="1.5" fill="none" />
                </svg>
                <div class="hanging-card-img-box">
                  ${entry.img 
                    ? `<img src="${entry.img}" alt="Memory photo">` 
                    : `<div class="mood-solid-bg">🏷️</div>`}
                </div>
                <div class="hanging-card-date">${this.formatShortDate(entry.date)}</div>
              </div>
            </div>
          `;

          cell.querySelector('.hanging-card').onclick = () => this.openJournalViewer(entry.id);

          grid.appendChild(cell);
        });

        monthSection.appendChild(grid);
        yearSection.appendChild(monthSection);
      });

      board.appendChild(yearSection);
    });
  },

  formatShortDate(dateString) {
    const parts = dateString.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${month} ${day}`;
  },

  /* ==================== JOURNAL VIEWER DETAILED VIEW ==================== */
  openJournalViewer(entryId) {
    const modal = document.getElementById('modal-journal-viewer');
    const entries = DB.getEntries();
    const entry = entries.find(e => e.id === entryId);

    if (!entry) return;

    // Set header details
    const viewerDate = document.getElementById('viewer-date');
    const viewerMood = document.getElementById('viewer-mood');
    
    const d = new Date(entry.date);
    viewerDate.textContent = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    viewerMood.textContent = entry.mood;
    viewerMood.className = 'view-modal-mood-badge';
    viewerMood.style.backgroundColor = `var(--mood-${entry.mood})`;

    // Stamp display
    const viewerImgBox = document.getElementById('viewer-image-container');
    if (entry.img) {
      viewerImgBox.innerHTML = `<img src="${entry.img}" alt="Journal entry Stamp">`;
    } else {
      viewerImgBox.innerHTML = `
        <div style="width:100%; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center; background:#eae6db; color:#8c8172; border-radius:2px; font-size:2.5rem; border:1px solid rgba(0,0,0,0.06);">
          🏷️
        </div>
      `;
    }
    document.getElementById('viewer-stamp-date').textContent = this.formatShortDate(entry.date);

    // Thoughts
    document.getElementById('viewer-diary-text').textContent = entry.text || 'No thoughts recorded for this day.';

    // Reflections
    const setupReflectionBox = (boxId, textId, textVal) => {
      const box = document.getElementById(boxId);
      const text = document.getElementById(textId);
      if (textVal) {
        text.textContent = textVal;
        box.style.display = 'block';
      } else {
        box.style.display = 'none';
      }
    };

    setupReflectionBox('viewer-prompt-good-box', 'viewer-prompt-good', entry.good);
    setupReflectionBox('viewer-prompt-upset-box', 'viewer-prompt-upset', entry.upset);
    setupReflectionBox('viewer-prompt-improve-box', 'viewer-prompt-improve', entry.improve);

    // Action button wiring
    document.getElementById('btn-edit-memory').onclick = () => {
      this.closeJournalViewer();
      this.openJournalEditor(entry.date, entry.id);
    };

    document.getElementById('btn-delete-memory').onclick = () => {
      if (confirm('Are you sure you want to delete this memory? It will be lost like dust in the twilight.')) {
        DB.deleteEntry(entry.id);
        this.closeJournalViewer();
        this.renderMemoryWall();
        this.renderCalendar();
      }
    };

    modal.classList.add('show');
  },

  closeJournalViewer() {
    const modal = document.getElementById('modal-journal-viewer');
    modal.classList.remove('show');
  },

  /* ==================== CALENDAR RENDERING & STATISTICS ==================== */
  renderCalendar() {
    const grid = document.getElementById('calendar-days-grid');
    const headerTitle = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = '';
    const entries = DB.getEntries();

    // Month offset logic
    const current = new Date();
    current.setMonth(current.getMonth() + this.currentDateOffset);
    
    const year = current.getFullYear();
    const month = current.getMonth(); // 0-indexed

    // Format header Title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    headerTitle.textContent = `${monthNames[month]} ${year}`;

    // First day of month (e.g. 0 = Sunday)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Navigation buttons wiring (bind once)
    const prevBtn = document.getElementById('btn-calendar-prev');
    const nextBtn = document.getElementById('btn-calendar-next');
    prevBtn.onclick = () => { this.currentDateOffset--; this.renderCalendar(); };
    nextBtn.onclick = () => { this.currentDateOffset++; this.renderCalendar(); };

    // 1. Fill leading empty cells (prev month days)
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell empty-cell';
      cell.textContent = '';
      grid.appendChild(cell);
    }

    // 2. Fill active days
    const todayStr = new Date().toISOString().split('T')[0];
    
    for (let day = 1; day <= totalDays; day++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === cellDateStr);

      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      cell.textContent = day;

      if (cellDateStr === todayStr) {
        cell.classList.add('today-cell');
      }

      if (entry) {
        cell.classList.add('has-entry');
        cell.style.setProperty('--mood-color', `var(--mood-${entry.mood})`);
        
        // Tooltip description
        cell.title = `${this.formatShortDate(cellDateStr)}: ${entry.mood} mood`;
        cell.onclick = () => this.openJournalViewer(entry.id);
      } else {
        cell.title = `Write a memory for ${this.formatShortDate(cellDateStr)}`;
        cell.onclick = () => this.openJournalEditor(cellDateStr);
      }

      grid.appendChild(cell);
    }

    // Update Statistics on calendar page
    this.renderStatistics(entries);
  },

  renderStatistics(entries) {
    // Total journals count
    document.getElementById('stat-total-entries').textContent = entries.length;

    // Current Streak calculation
    let streakCount = 0;
    if (entries.length > 0) {
      // Get unique sorted dates in descending order (YYYY-MM-DD)
      const dates = [...new Set(entries.map(e => e.date))].sort((a, b) => new Date(b) - new Date(a));
      
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Streak exists if there is an entry today or yesterday
      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
        let checkDate = new Date(dates[0]); // Start with most recent entry
        streakCount = 1;
        
        for (let i = 1; i < dates.length; i++) {
          const nextDate = new Date(dates[i]);
          const diffTime = Math.abs(checkDate - nextDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streakCount++;
            checkDate = nextDate;
          } else if (diffDays > 1) {
            // Gap found, stop counting
            break;
          }
        }
      }
    }
    document.getElementById('stat-streak').textContent = streakCount;

    // Mood Breakdown percentages
    const moodCounts = { joyful: 0, cozy: 0, blue: 0, stormy: 0, loving: 0 };
    entries.forEach(e => {
      if (moodCounts[e.mood] !== undefined) {
        moodCounts[e.mood]++;
      }
    });

    const total = entries.length || 1;
    const barsContainer = document.getElementById('mood-breakdown-bars');
    if (barsContainer) {
      barsContainer.innerHTML = '';
      
      Object.keys(moodCounts).forEach(mood => {
        const count = moodCounts[mood];
        const percent = Math.round((count / entries.length) * 100) || 0;
        
        const row = document.createElement('div');
        row.className = 'mood-dist-item';
        row.innerHTML = `
          <span class="mood-bar-label">${mood}</span>
          <div class="mood-bar-wrapper">
            <div class="mood-bar-fill" style="background:var(--mood-${mood}); width:${percent}%;"></div>
          </div>
          <span class="mood-bar-percent">${percent}%</span>
        `;
        barsContainer.appendChild(row);
      });
    }
  },

  /* ==================== SELF-CARE BREATHING BALLOON ==================== */
  toggleBreathingGuide() {
    const box = document.querySelector('.breathing-box');
    const btn = document.getElementById('btn-breathe-control');
    const circle = document.getElementById('breath-circle');
    const instruction = document.getElementById('breath-instruction');
    
    if (box.classList.contains('active')) {
      // Stop breathing
      box.classList.remove('active');
      btn.querySelector('span').textContent = 'Start Breathing';
      circle.textContent = 'Breathe';
      instruction.textContent = 'breathe with me';
      
      if (this.breathingTimer) {
        clearInterval(this.breathingTimer);
        this.breathingTimer = null;
      }
    } else {
      // Start breathing
      box.classList.add('active');
      btn.querySelector('span').textContent = 'Stop Breathing';
      
      let counter = 0;
      const breatheCycle = () => {
        // 10s cycles:
        // 0s - 4s: Inhale
        // 4s - 6s: Hold
        // 6s - 10s: Exhale
        const sec = counter % 10;
        if (sec < 4) {
          circle.textContent = 'Inhale';
          instruction.textContent = 'feel the cool air filling your chest...';
        } else if (sec < 6) {
          circle.textContent = 'Hold';
          instruction.textContent = 'let the warmth settle inside...';
        } else {
          circle.textContent = 'Exhale';
          instruction.textContent = 'let go of today\'s storms...';
        }
        counter++;
      };

      breatheCycle();
      this.breathingTimer = setInterval(breatheCycle, 1000);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

export default App;
