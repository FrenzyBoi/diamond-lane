document.addEventListener('DOMContentLoaded', () => {
  const diamonds = document.querySelectorAll('.diamond-icon');
  const lanes = document.querySelectorAll('.lane');
  const noteLanes = document.querySelectorAll('.note-lane');
  const scoreDisplay = document.getElementById('score');
  const laneSystem = document.querySelector('.lane-system');
  
  // Audio player for chart music
  let chartAudio = null;

  let degrees = 0;
  
  function rotateDiamonds() {
    degrees += 1;
    diamonds.forEach(diamond => {
      // Store rotation degree as CSS variable for use in animations
      diamond.style.setProperty('--rotation-deg', `${degrees}deg`);
      diamond.style.transform = `rotate(${degrees}deg)`;
    });
    requestAnimationFrame(rotateDiamonds);
  }

  requestAnimationFrame(rotateDiamonds);

  // Handle key events for arrow keys
  document.addEventListener('keydown', (event) => {
    lanes.forEach((lane, index) => {
      if (event.key === lane.dataset.key) {
        lane.querySelector('.diamond-icon').classList.add('brightened');
        noteChart.checkNoteHit(lane.dataset.key, index);
      }
    });
  });

  document.addEventListener('keyup', (event) => {
    lanes.forEach(lane => {
      if (event.key === lane.dataset.key) {
        lane.querySelector('.diamond-icon').classList.remove('brightened');
      }
    });
  });

  // Initialize the note chart system using the version from chart.js
  const noteChart = new NoteChartSystem(noteLanes, scoreDisplay);
  
  // Set up lane system pulsing synchronized with BPM
  let bpmAnimateInterval;
  
  function setupBpmAnimation(bpm) {
    // Clear any existing interval
    if (bpmAnimateInterval) {
      clearInterval(bpmAnimateInterval);
    }
    
    const beatInterval = 60000 / bpm; // milliseconds per beat
    let beatCount = 0;
    
    bpmAnimateInterval = setInterval(() => {
      beatCount++;
      
      // Every 4 beats (first beat of measure), do a stronger pulse
      const isMeasureBeat = beatCount % 4 === 1;
      
      // Pulse the bottom lane system
      laneSystem.classList.remove('lane-system-pulse', 'lane-system-measure-pulse');
      void laneSystem.offsetWidth; // Force reflow to restart animation
      
      if (isMeasureBeat) {
        laneSystem.classList.add('lane-system-measure-pulse');
      } else {
        laneSystem.classList.add('lane-system-pulse');
      }
      
      // Pulse diamonds while preserving continuous rotation
      diamonds.forEach((diamond, index) => {
        // Extract current hue class
        let hueFilter = '';
        if (diamond.classList.contains('pink-hue')) hueFilter = 'hue-rotate(300deg) saturate(1.5)';
        else if (diamond.classList.contains('blue-hue')) hueFilter = 'hue-rotate(210deg) saturate(1.5)';
        else if (diamond.classList.contains('green-hue')) hueFilter = 'hue-rotate(120deg) saturate(1.5)';
        else if (diamond.classList.contains('red-hue')) hueFilter = 'hue-rotate(0deg) saturate(1.5)';
        
        // If the diamond is brightened, apply that style too
        if (diamond.classList.contains('brightened')) {
          hueFilter = 'brightness(1.25) ' + hueFilter;
        }
        
        // Apply animation that preserves rotation and color
        diamond.animate([
          { transform: `rotate(${degrees}deg) scale(1)`, filter: hueFilter },
          { transform: `rotate(${degrees + 15}deg) scale(1.15)`, filter: `brightness(1.3) ${hueFilter}` },
          { transform: `rotate(${degrees + 30}deg) scale(1)`, filter: hueFilter }
        ], {
          duration: 300,
          easing: 'ease-out'
        });
      });
      
    }, beatInterval);
  }

  // Check URL parameters for game mode
  const urlParams = new URLSearchParams(window.location.search);
  const gameMode = urlParams.get('mode');
  const testMode = urlParams.get('test');
  
  // Define default chart path
  let chartPath = 'data/songchart.json';
  
  // Create chart audio player if needed
  function createAudioPlayer(chartData) {
    // Remove any existing audio player
    if (chartAudio) {
      chartAudio.pause();
      chartAudio.remove();
    }
    
    // If chart has audio data, create player
    if (chartData.audioData && chartData.audioFormat) {
      chartAudio = document.createElement('audio');
      chartAudio.id = 'chart-audio';
      chartAudio.style.display = 'none';
      
      // Create data URL from base64
      const audioSrc = `data:audio/${chartData.audioFormat};base64,${chartData.audioData}`;
      chartAudio.src = audioSrc;
      
      // Add audio controls to container
      const audioControls = document.createElement('div');
      audioControls.className = 'audio-controls';
      audioControls.id = 'audio-controls';
      audioControls.style.position = 'fixed';
      audioControls.style.bottom = '10px';
      audioControls.style.right = '10px';
      audioControls.style.zIndex = '100';
      audioControls.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      audioControls.style.padding = '10px';
      audioControls.style.borderRadius = '5px';
      
      audioControls.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="toggle-audio" style="background-color: #5f6bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Pause Music</button>
          <input type="range" id="volume-control" min="0" max="100" value="80" style="width: 100px;">
        </div>
      `;
      
      document.body.appendChild(chartAudio);
      document.body.appendChild(audioControls);
      
      // Set up audio controls
      const toggleButton = document.getElementById('toggle-audio');
      const volumeControl = document.getElementById('volume-control');
      
      toggleButton.addEventListener('click', () => {
        if (chartAudio.paused) {
          chartAudio.play()
            .then(() => {
              toggleButton.textContent = 'Pause Music';
            })
            .catch(err => {
              console.error('Error playing audio:', err);
              toggleButton.textContent = 'Play Music';
            });
        } else {
          chartAudio.pause();
          toggleButton.textContent = 'Play Music';
        }
      });
      
      volumeControl.addEventListener('input', () => {
        chartAudio.volume = volumeControl.value / 100;
      });
      
      // Set initial volume
      chartAudio.volume = volumeControl.value / 100;
      
      // Try playing audio when chart starts
      noteChart.onStart = function() {
        // Auto-play music with the chart
        chartAudio.currentTime = 0;
        
        // Try to autoplay (may be blocked by browser policies)
        chartAudio.play()
          .then(() => {
            toggleButton.textContent = 'Pause Music';
          })
          .catch(err => {
            console.error('Auto-play blocked:', err);
            // Show a notification to user that they need to interact
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '100px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(255, 100, 100, 0.9)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '1000';
            notification.style.textAlign = 'center';
            notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
            notification.innerHTML = 'Click <strong>Play Music</strong> to start the audio!';
            
            document.body.appendChild(notification);
            
            // Remove after 4 seconds
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 4000);
            
            toggleButton.textContent = 'Play Music';
          });
      };
      
      return true;
    } else {
      // No audio data in the chart - clear any existing audio elements
      const audioControls = document.getElementById('audio-controls');
      if (audioControls) {
        audioControls.remove();
      }
      return false;
    }
  }
  
  // Handle different game modes
  if (gameMode === 'freeplay') {
    // Load chart from localStorage for freeplay mode
    const selectedChart = JSON.parse(localStorage.getItem('selectedChart') || 'null');
    
    if (selectedChart) {
      // Use the selected chart directly rather than loading from file
      noteChart.loadChartFromData(selectedChart)
        .then(() => {
          console.log("Freeplay chart loaded:", selectedChart.title);
          setupBpmAnimation(noteChart.bpm);
          
          // Add a title display
          const titleDisplay = document.createElement('div');
          titleDisplay.className = 'title-display';
          titleDisplay.textContent = selectedChart.title;
          titleDisplay.style.position = 'absolute';
          titleDisplay.style.top = '20px';
          titleDisplay.style.left = '50%';
          titleDisplay.style.transform = 'translateX(-50%)';
          titleDisplay.style.color = 'white';
          titleDisplay.style.fontSize = '24px';
          titleDisplay.style.fontFamily = 'Arial, sans-serif';
          titleDisplay.style.zIndex = '10';
          document.querySelector('.container').appendChild(titleDisplay);
          
          // Create audio player if chart has audio data
          createAudioPlayer(selectedChart);
          
          // Start the chart
          noteChart.startNoteGeneration();
          
          // Remove the selected chart from localStorage to prevent it being used again
          localStorage.removeItem('selectedChart');
        })
        .catch(error => {
          console.error("Error loading freeplay chart:", error);
          // Fall back to default chart
          loadDefaultChart();
        });
    } else {
      // If no chart was selected, fall back to default
      loadDefaultChart();
    }
  } else if (testMode === 'true') {
    // Load the chart from localStorage for test mode
    const testChart = JSON.parse(localStorage.getItem('lastEditedChart') || 'null');
    
    if (testChart) {
      noteChart.loadChartFromData(testChart)
        .then(() => {
          console.log("Test chart loaded:", testChart.title);
          setupBpmAnimation(noteChart.bpm);
          
          // Add a title display with test indicator
          const titleDisplay = document.createElement('div');
          titleDisplay.className = 'title-display';
          titleDisplay.textContent = `${testChart.title} (Test Mode)`;
          titleDisplay.style.position = 'absolute';
          titleDisplay.style.top = '20px';
          titleDisplay.style.left = '50%';
          titleDisplay.style.transform = 'translateX(-50%)';
          titleDisplay.style.color = 'white';
          titleDisplay.style.fontSize = '24px';
          titleDisplay.style.fontFamily = 'Arial, sans-serif';
          titleDisplay.style.zIndex = '10';
          document.querySelector('.container').appendChild(titleDisplay);
          
          // Create audio player if chart has audio data
          createAudioPlayer(testChart);
          
          // Add a special button to add this chart to the saved list
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save to Freeplay';
          saveButton.style.position = 'absolute';
          saveButton.style.top = '60px';
          saveButton.style.left = '50%';
          saveButton.style.transform = 'translateX(-50%)';
          saveButton.style.padding = '8px 15px';
          saveButton.style.backgroundColor = 'rgba(0, 255, 170, 0.7)';
          saveButton.style.color = 'white';
          saveButton.style.border = 'none';
          saveButton.style.borderRadius = '5px';
          saveButton.style.cursor = 'pointer';
          saveButton.style.fontFamily = 'Arial, sans-serif';
          saveButton.style.zIndex = '10';
          
          saveButton.addEventListener('click', () => {
            // Add chart to localStorage charts list
            const charts = JSON.parse(localStorage.getItem('chartsList') || '[]');
            
            // Check if chart with same title already exists
            const existingIndex = charts.findIndex(c => c.title === testChart.title);
            if (existingIndex >= 0) {
              charts[existingIndex] = testChart;
            } else {
              charts.push(testChart);
            }
            
            localStorage.setItem('chartsList', JSON.stringify(charts));
            
            alert(`Chart "${testChart.title}" saved to Freeplay mode!`);
            saveButton.disabled = true;
            saveButton.textContent = 'Saved!';
            saveButton.style.backgroundColor = 'rgba(100, 100, 100, 0.7)';
          });
          
          document.querySelector('.container').appendChild(saveButton);
          
          // Start the chart
          noteChart.startNoteGeneration();
        })
        .catch(error => {
          console.error("Error loading test chart:", error);
          // Fall back to default chart
          loadDefaultChart();
        });
    } else {
      // If no test chart was found, fall back to default
      loadDefaultChart();
    }
  } else {
    // Default story mode
    loadDefaultChart();
  }
  
  // Function to load the default chart
  function loadDefaultChart() {
    noteChart.loadChart('data/songchart.json')
    .then(success => {
      if (success) {
        console.log("Chart loaded successfully");
      } else {
        console.warn("Failed to load chart, falling back to random notes");
      }
        setupBpmAnimation(noteChart.bpm);
      noteChart.startNoteGeneration();
    });
  }
});