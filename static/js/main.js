// Global variables
let mediaRecorder;
let audioChunks = [];
let recordingTimeout;
let timerInterval;
let startTime;
let selectedDuration = 10;
let currentAudioBlob = null;
let currentMode = 'record'; // 'record' or 'upload'

// DOM Elements
const recordModeBtn = document.getElementById('recordModeBtn');
const uploadModeBtn = document.getElementById('uploadModeBtn');
const recordMode = document.getElementById('recordMode');
const uploadMode = document.getElementById('uploadMode');
const recordBtn = document.getElementById('recordBtn');
const durationSelect = document.getElementById('duration');
const timer = document.getElementById('timer');
const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
const recordedAudio = document.getElementById('recordedAudio');
const uploadArea = document.getElementById('uploadArea');
const audioFileInput = document.getElementById('audioFileInput');
const uploadedAudioPlayer = document.getElementById('uploadedAudioPlayer');
const uploadedAudio = document.getElementById('uploadedAudio');
const uploadedFileName = document.getElementById('uploadedFileName');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const resultsList = document.getElementById('resultsList');
const noResults = document.getElementById('noResults');
const analysisSection = document.getElementById('analysisSection');
const analysisGrid = document.getElementById('analysisGrid');

// Match Section Elements
const recordMatchSection = document.getElementById('recordMatchSection');
const findMatchesBtn = document.getElementById('findMatchesBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const uploadMatchSection = document.getElementById('uploadMatchSection');
const uploadFindMatchesBtn = document.getElementById('uploadFindMatchesBtn');
const uploadTryAgainBtn = document.getElementById('uploadTryAgainBtn');
const recordStatus = document.getElementById('recordStatus');
const uploadStatus = document.getElementById('uploadStatus');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    showWelcomeMessage();
    
    // Check if Web Audio API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus('record', 'Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.', 'error');
        recordBtn.disabled = true;
    }
});

// Event Listeners
function initializeEventListeners() {
    // Mode toggle
    recordModeBtn.addEventListener('click', () => switchMode('record'));
    uploadModeBtn.addEventListener('click', () => switchMode('upload'));

    // Duration selector
    durationSelect.addEventListener('change', (e) => {
        selectedDuration = parseInt(e.target.value);
    });

    // Record button
    recordBtn.addEventListener('click', toggleRecording);

    // Upload area
    uploadArea.addEventListener('click', () => audioFileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // File input
    audioFileInput.addEventListener('change', handleFileSelect);

    // Match buttons
    findMatchesBtn.addEventListener('click', () => processCurrentAudio('record'));
    tryAgainBtn.addEventListener('click', resetRecordMode);
    uploadFindMatchesBtn.addEventListener('click', () => processCurrentAudio('upload'));
    uploadTryAgainBtn.addEventListener('click', resetUploadMode);
}

// Show welcome message
function showWelcomeMessage() {
    console.log('HumSearch initialized. Ready to find songs!');
}

// Mode Switching
function switchMode(mode) {
    currentMode = mode;
    
    if (mode === 'record') {
        recordModeBtn.classList.add('active');
        uploadModeBtn.classList.remove('active');
        recordMode.classList.add('active');
        uploadMode.classList.remove('active');
        resetUploadMode();
    } else {
        uploadModeBtn.classList.add('active');
        recordModeBtn.classList.remove('active');
        uploadMode.classList.add('active');
        recordMode.classList.remove('active');
        resetRecordMode();
    }
    hideResults();
    hideAnalysis();
    hideMatchSection();
}

// Recording Functions
async function toggleRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 22050,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });

        // Use webm format which is widely supported
        const options = { 
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        };
        
        // Fallback to default if the specified mimeType is not supported
        let mediaRecorderOptions = options;
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.warn('Preferred mimeType not supported, using default');
            mediaRecorderOptions = {};
        }
        
        mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            try {
                currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Show audio player immediately
                const audioUrl = URL.createObjectURL(currentAudioBlob);
                recordedAudio.src = audioUrl;
                recordedAudioPlayer.classList.remove('hidden');
                
                // Show match section
                showMatchSection('record');
                
                // Show success message
                showStatus('record', 'Recording completed! Click "Find Matching Songs" to search.', 'success');
                
            } catch (error) {
                console.error('Error processing recording:', error);
                showStatus('record', 'Error processing recording. Please try again.', 'error');
            }
            
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(100); // Collect data every 100ms
        updateRecordButton(true);
        startTimer();

        recordingTimeout = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            }
        }, selectedDuration * 1000);

    } catch (error) {
        console.error('Error accessing microphone:', error);
        showStatus('record', 'Unable to access microphone. Please check your permissions.', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearTimeout(recordingTimeout);
        clearInterval(timerInterval);
        updateRecordButton(false);
    }
}

function updateRecordButton(isRecording) {
    if (isRecording) {
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            <span>Stop Recording</span>
        `;
    } else {
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"/>
            </svg>
            <span>Start Recording</span>
        `;
    }
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = selectedDuration - elapsed;

        if (remaining <= 0) {
            timer.textContent = '00:00';
            clearInterval(timerInterval);
        } else {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 100);
}

// Upload Functions
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('audio/')) {
        showStatus('upload', 'Please upload a valid audio file (MP3, WAV, OGG, M4A)', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showStatus('upload', 'File size must be less than 10MB', 'error');
        return;
    }

    currentAudioBlob = file;
    const audioUrl = URL.createObjectURL(file);
    uploadedAudio.src = audioUrl;
    uploadedFileName.textContent = file.name;
    uploadedAudioPlayer.classList.remove('hidden');
    
    // Show match section
    showMatchSection('upload');
    
    // Show success message
    showStatus('upload', 'File uploaded successfully! Click "Find Matching Songs" to search.', 'success');
}

// Show/Hide Match Section
function showMatchSection(mode) {
    if (mode === 'record') {
        recordMatchSection.classList.remove('hidden');
    } else {
        uploadMatchSection.classList.remove('hidden');
    }
}

function hideMatchSection() {
    recordMatchSection.classList.add('hidden');
    uploadMatchSection.classList.add('hidden');
}

// Status Messages
function showStatus(mode, message, type) {
    const statusElement = mode === 'record' ? recordStatus : uploadStatus;
    
    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;
    statusElement.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.classList.add('hidden');
    }, 5000);
}

// Audio Processing and Matching
async function processCurrentAudio(mode) {
    if (!currentAudioBlob) {
        showStatus(mode, 'No audio available. Please record or upload first.', 'error');
        return;
    }
    
    showLoading();
    hideResults();
    hideAnalysis();
    
    try {
        const formData = new FormData();
        
        // Handle different blob types
        if (currentAudioBlob instanceof File) {
            // Uploaded file
            formData.append('audio', currentAudioBlob);
        } else if (currentAudioBlob instanceof Blob) {
            // Recorded audio
            // Create a file from blob with proper filename
            const filename = mode === 'record' ? 'recording.webm' : 'audio.webm';
            formData.append('audio', currentAudioBlob, filename);
        }
        
        const endpoint = mode === 'record' ? '/record/' : '/upload/';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show analysis
            showAnalysis(data.features);
            
            // Show matches
            displayResults(data.matches);
            
            // Hide match section after processing
            hideMatchSection();
            
        } else {
            showStatus(mode, data.error || 'Error processing audio', 'error');
            showNoResults();
        }
        
    } catch (error) {
        console.error('Processing error:', error);
        showStatus(mode, 'Error processing audio. Please try again.', 'error');
        showNoResults();
    }
    
    hideLoading();
}

function showAnalysis(features) {
    if (!features) return;
    
    analysisGrid.innerHTML = '';
    
    const analysisData = [
        { label: 'Detected Tempo', value: `${features.tempo?.toFixed(1) || 'N/A'} BPM` },
        { label: 'Duration', value: `${features.duration?.toFixed(1) || 'N/A'} seconds` },
        { label: 'Pitch Features', value: features.pitch_count || 0 },
        { label: 'Onset Count', value: features.onset_count || 'N/A' }
    ];
    
    analysisData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'analysis-item';
        div.innerHTML = `
            <div class="analysis-label">${item.label}</div>
            <div class="analysis-value">${item.value}</div>
        `;
        analysisGrid.appendChild(div);
    });
    
    analysisSection.classList.add('active');
}

function hideAnalysis() {
    analysisSection.classList.remove('active');
}

function displayResults(matches) {
    if (!matches || matches.length === 0) {
        showNoResults();
        return;
    }
    
    resultsList.innerHTML = '';
    noResults.classList.add('hidden');
    
    matches.forEach((match, index) => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        // Search YouTube URL
        const youtubeQuery = encodeURIComponent(match.name + ' official audio');
        const youtubeUrl = `https://www.youtube.com/results?search_query=${youtubeQuery}`;
        
        // Determine color based on similarity
        let similarityColor = '#dc2626'; // red for low
        if (match.similarity > 60) similarityColor = '#16a34a'; // green for high
        else if (match.similarity > 30) similarityColor = '#ca8a04'; // yellow for medium
        
        // Get rank emoji
        const rankEmoji = ['🥇', '🥈', '🥉'][index] || '🎵';
        
        resultCard.innerHTML = `
            <div style="font-size: 1.5rem;">${rankEmoji}</div>
            <div class="similarity-badge" style="background: linear-gradient(135deg, ${similarityColor}, #4c1d95);">
                ${match.similarity}% Match
            </div>
            <div style="flex: 1;">
                <div class="song-name">${match.name}</div>
                <div class="song-info">
                    Tempo: ${match.tempo ? match.tempo.toFixed(1) : 'N/A'} BPM
                </div>
            </div>
            <div class="match-actions">
                <button class="play-btn" onclick="playSong('${match.path}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Play
                </button>
                <a href="${youtubeUrl}" target="_blank" class="youtube-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                    YouTube
                </a>
            </div>
        `;
        
        resultsList.appendChild(resultCard);
    });
    
    resultsSection.classList.add('active');
}

function showNoResults() {
    resultsList.innerHTML = '';
    noResults.classList.remove('hidden');
    resultsSection.classList.add('active');
}

function hideResults() {
    resultsSection.classList.remove('active');
    noResults.classList.add('hidden');
}

// Utility Functions
function showLoading() {
    loadingIndicator.classList.add('active');
    // Disable match buttons during processing
    findMatchesBtn.disabled = true;
    uploadFindMatchesBtn.disabled = true;
}

function hideLoading() {
    loadingIndicator.classList.remove('active');
    // Re-enable match buttons
    findMatchesBtn.disabled = false;
    uploadFindMatchesBtn.disabled = false;
}

function resetRecordMode() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    }
    recordedAudioPlayer.classList.add('hidden');
    timer.textContent = '00:00';
    audioChunks = [];
    currentAudioBlob = null;
    hideResults();
    hideAnalysis();
    hideMatchSection();
    recordStatus.classList.add('hidden');
}

function resetUploadMode() {
    uploadedAudioPlayer.classList.add('hidden');
    audioFileInput.value = '';
    currentAudioBlob = null;
    hideResults();
    hideAnalysis();
    hideMatchSection();
    uploadStatus.classList.add('hidden');
}

// Song playback function
function playSong(songPath) {
    const audio = new Audio(`/play_song/${encodeURIComponent(songPath)}`);
    audio.play().catch(e => {
        console.error('Error playing song:', e);
        showStatus(currentMode, 'Could not play song. The file might not exist on the server.', 'error');
    });
}

// Test function for debugging
window.testRecording = async function() {
    // Simulate a recording for testing
    console.log('Testing recording functionality...');
    
    // Create a test audio blob
    const testDuration = 3;
    const sampleRate = 22050;
    const samples = sampleRate * testDuration;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a simple sine wave
    for (let i = 0; i < samples; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    }
    
    // Convert to WAV
    function floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }
    
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    function encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        
        // RIFF identifier
        writeString(view, 0, 'RIFF');
        // RIFF chunk length
        view.setUint32(4, 36 + samples.length * 2, true);
        // RIFF type
        writeString(view, 8, 'WAVE');
        // format chunk identifier
        writeString(view, 12, 'fmt ');
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, 1, true);
        // channel count
        view.setUint16(22, 1, true);
        // sample rate
        view.setUint32(24, sampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * 2, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, 2, true);
        // bits per sample
        view.setUint16(34, 16, true);
        // data chunk identifier
        writeString(view, 36, 'data');
        // data chunk length
        view.setUint32(40, samples.length * 2, true);
        
        floatTo16BitPCM(view, 44, samples);
        
        return buffer;
    }
    
    const wavBuffer = encodeWAV(data, sampleRate);
    currentAudioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    
    // Show match section
    showMatchSection('record');
    showStatus('record', 'Test recording ready! Click "Find Matching Songs".', 'info');
};