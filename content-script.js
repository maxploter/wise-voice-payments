// Wise Voice Extension - Content Script
console.log('Wise Voice Extension loaded');

let mediaRecorder;
let audioChunks = [];
let recognition;
let isRecording = false;
let currentPDFBlob = null; // Store the PDF blob

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
      console.log('URL changed to:', url);
      handleCurrentPage();
    }
  }).observe(document, { subtree: true, childList: true });
}

async function handleCurrentPage() {
  const hash = window.location.hash;

  console.log('Current page hash:', hash);

  // Check if we're in voice flow mode
  const inVoiceFlow = await isInVoiceFlow();
  console.log('In voice flow:', inVoiceFlow);

  // Check what page we're on and act accordingly
  if (hash.includes('/send') || hash === '' || hash === '#/') {
    // Main send page - show "Send via Voice" button
    injectSendViaVoiceButton();
  } else if (inVoiceFlow && hash.includes('/contact-beta/existing')) {
    // On recipient list page - auto-click "Add recipient"
    console.log('Should auto-click Add recipient');
    autoClickAddRecipient();
  } else if (inVoiceFlow && hash.includes('/contact-beta/currency')) {
    // On currency page - WAIT for user to select
    console.log('On currency page, waiting for user selection');
    watchForCurrencySelection();
  } else if (inVoiceFlow && hash.includes('/contact-beta/method')) {
    // On method page - auto-click "Upload screenshot or invoice"
    console.log('Should auto-click Upload option');
    autoClickUploadOption();
  } else if (hash.includes('/upload') || hash.includes('/contact-beta/ocr')) {
    // On upload page - show voice recorder
    console.log('On upload page, showing voice recorder');
    injectVoiceRecorder();
  }
}

// Check if we're in the voice flow
async function isInVoiceFlow() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['voiceFlowActive'], (result) => {
      resolve(result.voiceFlowActive === true);
    });
  });
}

// Set voice flow state
function setVoiceFlowActive(active) {
  chrome.storage.local.set({ voiceFlowActive: active }, () => {
    console.log('Voice flow active:', active);
  });
}

// ============================================
// STEP 1: Inject "Send via Voice" button
// ============================================
function injectSendViaVoiceButton() {
  // Check if button already exists
  if (document.getElementById('wise-voice-send-btn')) {
    return;
  }

  console.log('Injecting Send via Voice button');

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

  // Set flag that we're in voice flow mode
  setVoiceFlowActive(true);

  // Redirect to recipient page
  window.location.href = 'https://wise.com/send#/contact-beta/existing';
}

// ============================================
// STEP 2: Auto-click "Add recipient"
// ============================================
function autoClickAddRecipient() {
  console.log('autoClickAddRecipient called');

  // Wait for the button to appear
  waitForElement('.List_addButton__HD7Fh', 5000)
    .then(button => {
      console.log('Found Add recipient button:', button);

      // Wait a bit for page to fully load
      setTimeout(() => {
        console.log('Clicking Add recipient button...');
        button.click();
      }, 800);
    })
    .catch((error) => {
      console.error('Could not find Add recipient button:', error);

      // Try alternative selector
      const addBtn = document.querySelector('button[class*="addButton"]');
      if (addBtn) {
        console.log('Found button with alternative selector, clicking...');
        setTimeout(() => addBtn.click(), 800);
      } else {
        console.error('Button not found with any selector');
      }
    });
}

// ============================================
// STEP 3: Wait for user to select currency
// ============================================
function watchForCurrencySelection() {
  console.log('watchForCurrencySelection called');

  // Show a subtle helper message
  showHelper('Please select your currency');

  // Watch for clicks on the page
  const clickHandler = (e) => {
    // Check if user clicked a currency option
    const button = e.target.closest('button');
    if (!button) return;

    // Check if this button has a flag (currency indicator)
    const hasFlag = button.querySelector('.wds-flag, img[src*="flag"]');

    if (hasFlag) {
      console.log('User clicked currency option');
      removeHelper();

      // Remove listener
      document.removeEventListener('click', clickHandler, true);

      // Wait for animation/transition
      setTimeout(() => {
        // The page should automatically proceed to method selection
        console.log('Currency selected, waiting for method page...');
      }, 1000);
    }
  };

  // Use capture phase to catch clicks early
  document.addEventListener('click', clickHandler, true);
}

// ============================================
// STEP 4: Auto-click "Upload screenshot or invoice"
// ============================================
function autoClickUploadOption() {
  console.log('autoClickUploadOption called');

  waitForElement('button', 5000)
    .then(() => {
      // Find the upload button by checking for upload icon or text
      const buttons = Array.from(document.querySelectorAll('button'));

      const uploadBtn = buttons.find(btn => {
        const text = btn.textContent.toLowerCase();
        const hasUploadIcon = btn.querySelector('[data-testid="upload-icon"]');
        return (text.includes('upload') && (text.includes('screenshot') || text.includes('invoice'))) || hasUploadIcon;
      });

      if (uploadBtn) {
        console.log('Found Upload button:', uploadBtn);
        setTimeout(() => {
          console.log('Clicking Upload button...');
          uploadBtn.click();
        }, 800);
      } else {
        console.error('Could not find Upload button');
        console.log('Available buttons:', buttons.map(b => b.textContent));
      }
    })
    .catch((error) => {
      console.error('Error finding buttons:', error);
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

  console.log('Injecting voice recorder...');

  // Clear voice flow flag since we've reached the end
  setVoiceFlowActive(false);

  // Find the upload area - wait for it if needed
  waitForElement('main, .container, body', 2000)
    .then(uploadArea => {
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
    })
    .catch(error => {
      console.error('Could not inject voice recorder:', error);
    });
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
      // Generate PDF but don't upload yet - let user decide
      await generatePDFAndShowOptions(finalTranscript);
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
async function generatePDFAndShowOptions(text) {
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

    currentPDFBlob = doc.output('blob');

    // Show upload or re-record options
    showUploadOptions(text);

  } catch (error) {
    console.error('Error generating PDF:', error);
    updateStatus('❌ Error: ' + error.message, 'error');
  }
}

function showUploadOptions(text) {
  // Hide the record button and status (but keep showing for now)
  const recordBtn = document.getElementById('voice-record-btn');
  const statusDiv = document.getElementById('voice-status');

  if (recordBtn) recordBtn.style.display = 'none';

  // Update status to show success
  updateStatus('✅ Recording complete!', 'success');

  // Get transcript container
  const transcript = document.getElementById('voice-transcript');

  // Check if buttons already exist
  if (document.getElementById('voice-action-buttons')) {
    return;
  }

  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'voice-action-buttons';
  buttonsContainer.className = 'voice-action-buttons';
  buttonsContainer.innerHTML = `
    <button id="upload-pdf-btn" class="voice-action-btn upload-btn">
      ✅ Upload PDF
    </button>
    <button id="record-again-btn" class="voice-action-btn secondary-btn">
      🔄 Record Again
    </button>
  `;

  // Insert after transcript
  transcript.parentNode.appendChild(buttonsContainer);

  // Add event listeners
  document.getElementById('upload-pdf-btn').onclick = () => {
    uploadPDF();
  };

  document.getElementById('record-again-btn').onclick = () => {
    recordAgain();
  };
}

function uploadPDF() {
  if (!currentPDFBlob) {
    updateStatus('❌ No PDF to upload', 'error');
    return;
  }

  autoFillFileInput(currentPDFBlob);
}

function recordAgain() {
  // Reset UI
  const recordBtn = document.getElementById('voice-record-btn');
  const statusDiv = document.getElementById('voice-status');
  const transcript = document.getElementById('voice-transcript');
  const buttonsContainer = document.getElementById('voice-action-buttons');

  // Remove action buttons
  if (buttonsContainer) {
    buttonsContainer.remove();
  }

  // Clear transcript
  if (transcript) {
    transcript.innerHTML = '';
    transcript.style.display = 'none';
  }

  // Show record button again
  if (recordBtn) {
    recordBtn.style.display = 'block';
    recordBtn.textContent = 'Start Recording';
    recordBtn.classList.remove('recording');
  }

  // Clear status
  if (statusDiv) {
    statusDiv.style.display = 'none';
  }

  // Clear current PDF
  currentPDFBlob = null;

  console.log('Ready to record again');
}

function autoFillFileInput(pdfBlob) {
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

      // Show success and remove the panel after a delay
      updateStatus('✅ PDF uploaded successfully!', 'success');

      // Remove the recording panel after 2 seconds
      setTimeout(() => {
        removeRecordingPanel();
      }, 2000);

    } else {
      console.error('File input not found');
      updateStatus('❌ Could not find upload field', 'error');
    }
  } catch (error) {
    console.error('Error uploading PDF:', error);
    updateStatus('❌ Upload failed', 'error');
  }
}

function removeRecordingPanel() {
  const panel = document.getElementById('wise-voice-recorder');
  if (panel) {
    // Fade out animation
    panel.style.transition = 'opacity 0.3s ease';
    panel.style.opacity = '0';

    setTimeout(() => {
      panel.remove();
      console.log('Recording panel removed');
    }, 300);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Check if element already exists
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Element found immediately: ${selector}`);
      resolve(element);
      return;
    }

    console.log(`Waiting for element: ${selector}`);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Element found: ${selector}`);
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
      console.error(`Timeout waiting for: ${selector}`);
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