// Wise Voice Extension - Content Script
console.log('Wise Voice Extension loaded');

let mediaRecorder;
let audioChunks = [];
let recognition;
let isRecording = false;
let flowState = 'initial'; // Track where we are in the flow

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}

function initExtension() {
  console.log('Initializing Wise Voice Extension...');

  // Watch for URL changes (React SPA)
  watchUrlChanges();

  // Initialize based on current page
  handleCurrentPage();
}

// Watch for URL changes in React SPA
function watchUrlChanges() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      handleCurrentPage();
    }
  }).observe(document, { subtree: true, childList: true });
}

function handleCurrentPage() {
  const hash = window.location.hash;

  console.log('Current page hash:', hash);

  // Check what page we're on and act accordingly
  if (hash.includes('/send') || hash === '' || hash === '#/') {
    // Main send page - show "Send via Voice" button
    injectSendViaVoiceButton();
  } else if (hash.includes('/contact-beta/existing')) {
    // On recipient list page - auto-click "Add recipient"
    autoClickAddRecipient();
  } else if (hash.includes('/contact-beta/currency')) {
    // On currency page - WAIT for user to select
    // After user selects, auto-click to method page
    watchForCurrencySelection();
  } else if (hash.includes('/contact-beta/method')) {
    // On method page - auto-click "Upload screenshot or invoice"
    autoClickUploadOption();
  } else if (hash.includes('/upload') || hash.includes('/contact-beta/ocr')) {
    // On upload page - show voice recorder
    injectVoiceRecorder();
  }
}

// ============================================
// STEP 1: Inject "Send via Voice" button
// ============================================
function injectSendViaVoiceButton() {
  // Check if button already exists
  if (document.getElementById('wise-voice-send-btn')) {
    return;
  }

  // Find a good location (try multiple selectors)
  const possibleTargets = [
    document.querySelector('main'),
    document.querySelector('.container'),
    document.body
  ];

  const targetElement = possibleTargets.find(el => el !== null);

  if (!targetElement) {
    setTimeout(injectSendViaVoiceButton, 1000);
    return;
  }

  // Create floating button
  const btn = document.createElement('button');
  btn.id = 'wise-voice-send-btn';
  btn.className = 'wise-voice-btn wise-voice-entry-btn';
  btn.innerHTML = '🎤 Send via Voice';
  btn.onclick = startVoiceFlow;

  document.body.appendChild(btn);
  console.log('Send via Voice button injected');
}

function startVoiceFlow() {
  console.log('Starting voice flow...');
  flowState = 'started';

  // Redirect to recipient page
  window.location.href = 'https://wise.com/send#/contact-beta/existing';
}

// ============================================
// STEP 2: Auto-click "Add recipient"
// ============================================
function autoClickAddRecipient() {
  if (flowState !== 'started') return;

  console.log('Looking for Add recipient button...');

  waitForElement('.List_addButton__HD7Fh, button:has-text("Add recipient")', 3000)
    .then(button => {
      console.log('Found Add recipient button, clicking...');
      setTimeout(() => {
        button.click();
        flowState = 'currency';
      }, 500);
    })
    .catch(() => {
      console.log('Could not find Add recipient button');
    });
}

// ============================================
// STEP 3: Wait for user to select currency
// ============================================
function watchForCurrencySelection() {
  if (flowState !== 'currency') return;

  console.log('On currency page, waiting for user selection...');

  // Show a subtle helper message
  showHelper('Please select your currency');

  // Watch for user clicking a currency
  document.addEventListener('click', function currencyClickHandler(e) {
    const currencyOption = e.target.closest('button[class*="option"]');

    if (currencyOption && currencyOption.querySelector('.wds-flag')) {
      console.log('User selected currency');
      removeHelper();

      // Wait a bit for any animations
      setTimeout(() => {
        // Find and click continue/next button
        const continueBtn = document.querySelector('button[type="submit"], button.wds-Button--primary');
        if (continueBtn) {
          continueBtn.click();
          flowState = 'method';
        }
      }, 800);

      // Remove this event listener
      document.removeEventListener('click', currencyClickHandler);
    }
  }, true);
}

// ============================================
// STEP 4: Auto-click "Upload screenshot or invoice"
// ============================================
function autoClickUploadOption() {
  if (flowState !== 'method') return;

  console.log('On method page, looking for Upload option...');

  waitForElement('button', 3000)
    .then(() => {
      // Find the upload button by text content
      const buttons = Array.from(document.querySelectorAll('button'));
      const uploadBtn = buttons.find(btn =>
        btn.textContent.includes('Upload screenshot') ||
        btn.textContent.includes('upload') && btn.textContent.includes('invoice')
      );

      if (uploadBtn) {
        console.log('Found Upload button, clicking...');
        setTimeout(() => {
          uploadBtn.click();
          flowState = 'upload';
        }, 500);
      }
    })
    .catch(() => {
      console.log('Could not find Upload button');
    });
}

// ============================================
// STEP 5: Show voice recorder on upload page
// ============================================
function injectVoiceRecorder() {
  // Check if already injected
  if (document.getElementById('wise-voice-recorder')) {
    return;
  }

  console.log('On upload page, injecting voice recorder...');

  // Find the upload area
  const uploadArea = document.querySelector('.upload-section, [data-testid="upload"], main');

  if (!uploadArea) {
    setTimeout(injectVoiceRecorder, 1000);
    return;
  }

  // Create voice recorder container
  const container = document.createElement('div');
  container.id = 'wise-voice-recorder';
  container.className = 'wise-voice-container';
  container.innerHTML = `
    <div class="voice-recorder-panel">
      <h3>🎤 Record Voice Invoice</h3>
      <p>Speak your invoice details clearly</p>
      <button id="voice-record-btn" class="voice-action-btn primary">
        Start Recording
      </button>
      <div id="voice-status" class="voice-status" style="display: none;"></div>
      <div id="voice-transcript" class="voice-transcript" style="display: none;"></div>
    </div>
  `;

  // Insert at the top of upload area
  uploadArea.insertBefore(container, uploadArea.firstChild);

  // Add event listener
  document.getElementById('voice-record-btn').onclick = toggleRecording;

  console.log('Voice recorder injected');
}

// ============================================
// RECORDING FUNCTIONS
// ============================================
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      updateTranscript(finalTranscript, interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      updateStatus('Error: ' + event.error, 'error');
    };

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      await generateAndUploadPDF(finalTranscript);
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    recognition.start();
    isRecording = true;

    // Update UI
    const btn = document.getElementById('voice-record-btn');
    btn.textContent = '⏹️ Stop Recording';
    btn.classList.add('recording');
    updateStatus('🎤 Recording... Speak now', 'recording');
    document.getElementById('voice-transcript').style.display = 'block';

  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Could not access microphone. Please grant permission.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recognition) {
    recognition.stop();
  }
  isRecording = false;

  const btn = document.getElementById('voice-record-btn');
  btn.textContent = 'Start Recording';
  btn.classList.remove('recording');
  updateStatus('⏳ Processing...', 'processing');
}

function updateStatus(message, type = 'info') {
  const status = document.getElementById('voice-status');
  if (status) {
    status.textContent = message;
    status.className = 'voice-status ' + type;
    status.style.display = 'block';
  }
}

function updateTranscript(finalText, interimText) {
  const transcriptDiv = document.getElementById('voice-transcript');
  if (transcriptDiv) {
    transcriptDiv.innerHTML = `
      <div class="transcript-final">${finalText}</div>
      <div class="transcript-interim">${interimText}</div>
    `;
  }
}

// ============================================
// PDF GENERATION AND UPLOAD
// ============================================
async function generateAndUploadPDF(text) {
  try {
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF not loaded');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Voice Invoice', 20, 20);

    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

    doc.setFontSize(12);
    doc.text('Transcript:', 20, 45);

    const lines = doc.splitTextToSize(text || 'No transcript available', 170);
    doc.setFontSize(10);
    doc.text(lines, 20, 55);

    doc.setFontSize(8);
    doc.text('Generated by Wise Voice Extension', 20, 280);

    const pdfBlob = doc.output('blob');

    // Auto-fill the file input
    autoFillFileInput(pdfBlob, text);

  } catch (error) {
    console.error('Error generating PDF:', error);
    updateStatus('❌ Error: ' + error.message, 'error');
  }
}

function autoFillFileInput(pdfBlob, text) {
  try {
    const file = new File([pdfBlob], `voice-invoice-${Date.now()}.pdf`, {
      type: 'application/pdf'
    });

    const fileInput = document.querySelector('input[type="file"]');

    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // Trigger events
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      console.log('PDF auto-uploaded to file input');
      updateStatus('✅ PDF uploaded! Click Continue below', 'success');

      // Reset flow state
      flowState = 'complete';

    } else {
      console.error('File input not found');
      updateStatus('❌ Could not find upload field', 'error');
    }
  } catch (error) {
    console.error('Error uploading PDF:', error);
    updateStatus('❌ Upload failed', 'error');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout: ${selector}`));
    }, timeout);
  });
}

function showHelper(message) {
  removeHelper(); // Remove any existing helper

  const helper = document.createElement('div');
  helper.id = 'wise-voice-helper';
  helper.className = 'wise-voice-helper';
  helper.textContent = `💡 ${message}`;

  document.body.appendChild(helper);
}

function removeHelper() {
  const helper = document.getElementById('wise-voice-helper');
  if (helper) {
    helper.remove();
  }
}