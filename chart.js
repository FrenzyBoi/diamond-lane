class NoteChartSystem {
  constructor(noteLanes, scoreDisplay) {
    this.noteLanes = noteLanes;
    this.scoreDisplay = scoreDisplay;
    this.score = 0;
    this.activeNotes = [];
    this.hitZone = { top: window.innerHeight - 150, bottom: window.innerHeight };
    this.songChart = null;
    this.startTime = 0;
    this.isPlaying = false;
    this.lastUpdate = performance.now();
    this.lastBeatTime = 0;
    this.beatCount = 0;
    
    // Default BPM - will be overridden by song data
    this.bpm = 120;
    
    // Beat visualization
    this.beatVisualsActive = false;
    
    // Timing thresholds for hit accuracy
    this.timingThresholds = {
      perfect: 20, // ±20px from center is perfect
      good: 50,    // ±50px from center is good
      ok: 80       // ±80px from center is ok, beyond is early/late
    };
    
    // Callback for when chart starts playing
    this.onStart = null;
  }

  async loadChart(chartUrl) {
    try {
      const response = await fetch(chartUrl);
      this.songChart = await response.json();
      console.log("Loaded chart:", this.songChart.title);
      
      // Update BPM from song data
      if (this.songChart.bpm) {
        this.bpm = this.songChart.bpm;
      }
      
      return true;
    } catch (error) {
      console.error("Error loading chart:", error);
      return false;
    }
  }

  async loadChartFromData(chartData) {
    try {
      // Validate the chart data
      if (!chartData.title || !chartData.bpm || !Array.isArray(chartData.notes)) {
        throw new Error("Invalid chart data format");
      }
      
      this.songChart = chartData;
      
      // Update BPM from chart data
      if (this.songChart.bpm) {
        this.bpm = this.songChart.bpm;
      }
      
      return true;
    } catch (error) {
      console.error("Error loading chart from data:", error);
      return false;
    }
  }

  startChart() {
    if (!this.songChart) {
      console.error("No chart loaded");
      return;
    }
    
    this.isPlaying = true;
    this.startTime = performance.now() / 1000;
    this.lastBeatTime = this.startTime;
    
    // Start beat visualizations
    this.beatVisualsActive = true;
    this.createBeatPulseElements();
    this.updateBeatVisuals();
    
    this.updateChart();
  }

  createBeatPulseElements() {
    // Create beat indicators for each lane
    this.noteLanes.forEach((lane, index) => {
      const beatIndicator = document.createElement('div');
      beatIndicator.className = 'beat-indicator';
      
      // Add class for appropriate color based on lane
      if (index === 0) beatIndicator.classList.add('pink-pulse');
      else if (index === 1) beatIndicator.classList.add('blue-pulse');
      else if (index === 2) beatIndicator.classList.add('green-pulse');
      else if (index === 3) beatIndicator.classList.add('red-pulse');
      
      lane.appendChild(beatIndicator);
    });
  }

  updateBeatVisuals() {
    if (!this.beatVisualsActive) return;
    
    const currentTime = performance.now() / 1000;
    const beatInterval = 60 / this.bpm; // seconds per beat
    
    // Check if it's time for a new beat
    if (currentTime - this.lastBeatTime >= beatInterval) {
      this.lastBeatTime = currentTime;
      this.beatCount++;
      
      // Every 4 beats, do a stronger pulse (first beat of measure)
      const isMeasureBeat = this.beatCount % 4 === 1;
      
      // Trigger visual beat effects
      this.triggerBeatEffects(isMeasureBeat);
    }
    
    requestAnimationFrame(() => this.updateBeatVisuals());
  }

  triggerBeatEffects(isMeasureBeat) {
    // Pulse the lane indicators
    document.querySelectorAll('.beat-indicator').forEach(indicator => {
      // Remove previous animation classes
      indicator.classList.remove('beat-pulse', 'measure-pulse');
      
      // Force a reflow to restart the animation
      void indicator.offsetWidth;
      
      // Add the appropriate animation class
      if (isMeasureBeat) {
        indicator.classList.add('measure-pulse');
      } else {
        indicator.classList.add('beat-pulse');
      }
    });
    
    // Pulse the hit zone indicators on the beat
    document.querySelectorAll('.hit-zone-indicator').forEach(zone => {
      zone.classList.remove('hit-zone-pulse');
      void zone.offsetWidth; // Force a reflow
      zone.classList.add('hit-zone-pulse');
    });
    
    // Pulse active falling notes
    this.activeNotes.forEach(note => {
      if (!note.hit && !note.missed) {
        // Remove existing pulse animation
        note.element.classList.remove('note-pulse');
        void note.element.offsetWidth; // Force a reflow
        
        // Apply the animation class
        note.element.classList.add('note-pulse');
      }
    });
  }

  updateChart() {
    if (!this.isPlaying) return;
    
    const currentTime = (performance.now() / 1000) - this.startTime;
    
    // Spawn notes based on their time
    this.songChart.notes.forEach(note => {
      if (note.time <= currentTime && !note.spawned) {
        this.createNoteFromChart(note);
        note.spawned = true;
      }
    });
    
    this.updateNotes();
    requestAnimationFrame(() => this.updateChart());
  }

  createNoteFromChart(noteData) {
    const laneIndex = noteData.lane;
    const noteLane = this.noteLanes[laneIndex];
    const key = noteLane.dataset.key;

    const note = document.createElement('div');
    note.className = 'falling-note';

    // Set background image
    note.style.backgroundImage = `url('assets/images/note.png')`;

    // Add appropriate hue class
    if (laneIndex === 0) note.classList.add('pink-hue');
    else if (laneIndex === 1) note.classList.add('blue-hue');
    else if (laneIndex === 2) note.classList.add('green-hue');
    else if (laneIndex === 3) note.classList.add('red-hue');

    note.style.top = '-60px';
    note.style.left = '10px'; // Center in lane
    note.dataset.key = key;

    noteLane.appendChild(note);

    this.activeNotes.push({
      element: note,
      lane: laneIndex,
      position: -60,
      speed: noteData.speed || 4,
      hit: false,
      missed: false
    });
  }

  createNote() {
    const laneIndex = Math.floor(Math.random() * 4);
    const noteLane = this.noteLanes[laneIndex];
    const key = noteLane.dataset.key;

    const note = document.createElement('div');
    note.className = 'falling-note';

    // Set background image
    note.style.backgroundImage = `url('assets/images/note.png')`;

    // Add appropriate hue class
    if (laneIndex === 0) note.classList.add('pink-hue');
    else if (laneIndex === 1) note.classList.add('blue-hue');
    else if (laneIndex === 2) note.classList.add('green-hue');
    else if (laneIndex === 3) note.classList.add('red-hue');

    note.style.top = '-60px';
    note.style.left = '10px'; // Center in lane
    note.dataset.key = key;

    noteLane.appendChild(note);

    this.activeNotes.push({
      element: note,
      lane: laneIndex,
      position: -60,
      speed: 3 + Math.random() * 2,
      hit: false,
      missed: false
    });
  }

  checkNoteHit(key, laneIndex) {
    const notesToHit = this.activeNotes.filter(note => 
      note.element.dataset.key === key &&
      note.lane === laneIndex &&
      !note.hit &&
      !note.missed &&
      note.position >= this.hitZone.top &&
      note.position <= this.hitZone.bottom
    );

    if (notesToHit.length > 0) {
      // Sort by closest to the hit zone center
      notesToHit.sort((a, b) => {
        const centerPosition = (this.hitZone.top + this.hitZone.bottom) / 2;
        return Math.abs(a.position - centerPosition) - Math.abs(b.position - centerPosition);
      });

      const hitNote = notesToHit[0];
      hitNote.hit = true;

      // Calculate timing accuracy relative to the hit zone center
      const centerPosition = (this.hitZone.top + this.hitZone.bottom) / 2;
      const distance = Math.abs(hitNote.position - centerPosition);

      let timingRating, timingClass, scoreValue;

      if (distance <= this.timingThresholds.perfect) {
        timingRating = "PERFECT!";
        timingClass = "timing-perfect";
        scoreValue = 20;
      } else if (distance <= this.timingThresholds.good) {
        timingRating = "GOOD!";
        timingClass = "timing-good";
        scoreValue = 10;
      } else if (distance <= this.timingThresholds.ok) {
        timingRating = "OK";
        timingClass = "timing-ok";
        scoreValue = 5;
      } else {
        timingRating = "EARLY!";
        timingClass = "timing-early";
        scoreValue = 2;
        if (hitNote.position > centerPosition) {
          timingRating = "LATE!";
        }
      }

      // Create hit effect
      const hitEffect = document.createElement('div');
      hitEffect.className = 'hit-effect';
      hitEffect.style.top = `${hitNote.position}px`;
      hitEffect.style.left = '0';
      this.noteLanes[hitNote.lane].appendChild(hitEffect);

      // Create timing message at the center of the hit zone
      const timingMessage = document.createElement('div');
      timingMessage.className = `timing-message ${timingClass}`;
      timingMessage.textContent = timingRating;
      timingMessage.style.top = `${centerPosition - 20}px`;
      timingMessage.style.left = '0';
      this.noteLanes[hitNote.lane].appendChild(timingMessage);

      // Remove effects after animation completes
      setTimeout(() => {
        hitEffect.remove();
        timingMessage.remove();
      }, 800);

      // Remove the hit note and update score
      hitNote.element.remove();
      this.activeNotes = this.activeNotes.filter(note => note !== hitNote);
      this.score += scoreValue;
      this.scoreDisplay.textContent = this.score;
    }
  }

  updateNotes() {
    const now = performance.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;
    
    this.activeNotes.forEach(note => {
      // Update position based on time, not frames
      note.position += note.speed * deltaTime * 60; // Normalize to 60fps
      note.element.style.top = `${note.position}px`;

      // Check if note is past the bottom of the screen
      if (note.position > window.innerHeight && !note.hit && !note.missed) {
        note.missed = true;
        note.element.remove();

        // Deduct points for missed notes
        this.score = Math.max(0, this.score - 5);
        this.scoreDisplay.textContent = this.score;

        // Remove from active notes
        this.activeNotes = this.activeNotes.filter(n => n !== note);
      }
    });

    requestAnimationFrame(() => this.updateNotes());
  }

  startNoteGeneration() {
    // Either use the chart or fallback to random generation
    if (this.songChart) {
      this.startChart();
    } else {
      // For random mode, still set up BPM visuals
      this.beatVisualsActive = true;
      this.createBeatPulseElements();
      this.updateBeatVisuals();
      
      setInterval(() => this.createNote(), 1500);
      this.updateNotes();
    }
    
    // Call the onStart callback if defined
    if (typeof this.onStart === 'function') {
      this.onStart();
    }
  }
}