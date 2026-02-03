// Global variables
let mediaRecorder;
let audioChunks = [];
let recordingTimeout;
let timerInterval;
let startTime;
let selectedDuration = 10;

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
const matchSection = document.getElementById('matchSection');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
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

    // Match buttons (placeholder functionality)
    document.getElementById('match1Btn').addEventListener('click', () => {
        console.log('Match 1 clicked');
        alert('Match 1 functionality will be implemented later');
    });
    document.getElementById('match2Btn').addEventListener('click', () => {
        console.log('Match 2 clicked');
        alert('Match 2 functionality will be implemented later');
    });
    document.getElementById('match3Btn').addEventListener('click', () => {
        console.log('Match 3 clicked');
        alert('Match 3 functionality will be implemented later');
    });
}

// Mode Switching
function switchMode(mode) {
    if (mode === 'record') {
        recordModeBtn.classList.add('active');
        uploadModeBtn.classList.remove('active');
        recordMode.classList.add('active');
        uploadMode.classList.remove('active');

        // Reset upload mode
        resetUploadMode();
    } else {
        uploadModeBtn.classList.add('active');
        recordModeBtn.classList.remove('active');
        uploadMode.classList.add('active');
        recordMode.classList.remove('active');

        // Reset record mode
        resetRecordMode();
    }
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
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create media recorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Event handlers
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            recordedAudio.src = audioUrl;
            recordedAudioPlayer.classList.remove('hidden');
            matchSection.classList.remove('hidden');

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        // Start recording
        mediaRecorder.start();
        updateRecordButton(true);
        startTimer();

        // Auto-stop after selected duration
        recordingTimeout = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            }
        }, selectedDuration * 1000);

    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your permissions.');
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

function resetRecordMode() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    }
    recordedAudioPlayer.classList.add('hidden');
    matchSection.classList.add('hidden');
    timer.textContent = '00:00';
    audioChunks = [];
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
    // Check if file is audio
    if (!file.type.startsWith('audio/')) {
        alert('Please upload a valid audio file');
        return;
    }

    // Create URL and set to audio player
    const audioUrl = URL.createObjectURL(file);
    uploadedAudio.src = audioUrl;
    uploadedFileName.textContent = file.name;
    uploadedAudioPlayer.classList.remove('hidden');
    matchSection.classList.remove('hidden');
}

function resetUploadMode() {
    uploadedAudioPlayer.classList.add('hidden');
    matchSection.classList.add('hidden');
    audioFileInput.value = '';
}

// Format time helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}