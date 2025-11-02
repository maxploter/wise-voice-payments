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

    // Search for recipient before generating PDF
    updateStatus('🔍 Searching for recipient...', 'processing');
    const recipientInfo = await searchRecipient(text);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Voice Invoice', 20, 20);

    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

    // Add recipient information if found
    let yPos = 45;
    if (recipientInfo && recipientInfo.found) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Recipient:', 20, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;

      doc.setFontSize(10);
      doc.text(`Name: ${recipientInfo.name}`, 20, yPos);
      yPos += 5;

      if (recipientInfo.currency) {
        doc.text(`Currency: ${recipientInfo.currency}`, 20, yPos);
        yPos += 5;
      }

      if (recipientInfo.accountSummary) {
        doc.text(`Account: ${recipientInfo.accountSummary}`, 20, yPos);
        yPos += 5;
      }

      yPos += 5; // Extra spacing
    } else if (recipientInfo && recipientInfo.searchQuery) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Searched for: ${recipientInfo.searchQuery} (no match found)`, 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Transcript:', 20, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 7;

    const lines = doc.splitTextToSize(text || 'No transcript available', 170);
    doc.setFontSize(10);
    doc.text(lines, 20, yPos);

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

// ============================================
// RECIPIENT SEARCH FUNCTIONS
// ============================================

/**
 * Extract recipient name from transcript
 * Tries multiple strategies:
 * 1. Find "to" keyword and extract 1-2 words after it
 * 2. Fall back to searching all words
 */
function extractRecipientName(transcript) {
  if (!transcript || !transcript.trim()) {
    return null;
  }

  const text = transcript.toLowerCase().trim();
  const words = text.split(/\s+/);

  // Strategy 1: Look for "to" keyword
  const toIndex = words.findIndex(word => word === 'to' || word === 'too');

  if (toIndex !== -1 && toIndex < words.length - 1) {
    // Get next 1-2 words after "to"
    const firstName = words[toIndex + 1];
    const lastName = words[toIndex + 2];

    // Clean up common punctuation
    const cleanFirst = firstName.replace(/[,.:;!?]/g, '');
    const cleanLast = lastName ? lastName.replace(/[,.:;!?]/g, '') : '';

    return {
      primary: cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst,
      alternatives: [
        cleanFirst, // Just first name
        cleanLast   // Just last name (surname)
      ].filter(Boolean)
    };
  }

  // Strategy 2: Use all words as search query (fallback)
  return {
    primary: text,
    alternatives: []
  };
}

/**
 * Search for recipient using Wise API
 * Returns recipient info if found, or null
 */
async function searchRecipient(transcript) {
  try {
    const nameInfo = extractRecipientName(transcript);

    if (!nameInfo || !nameInfo.primary) {
      console.log('Could not extract recipient name from transcript');
      return { found: false, searchQuery: null };
    }

    console.log('Searching for recipient:', nameInfo);

    // Get profile ID from cookies or storage
    const profileId = await getProfileId();
    if (!profileId) {
      console.error('Profile ID not found');
      return { found: false, searchQuery: nameInfo.primary };
    }

    // Try primary search (full name or all words)
    let result = await performRecipientSearch(profileId, nameInfo.primary);

    if (result && result.found) {
      return result;
    }

    // Try alternatives (first name, last name)
    for (const altName of nameInfo.alternatives) {
      if (!altName) continue;

      console.log('Trying alternative search:', altName);
      result = await performRecipientSearch(profileId, altName);

      if (result && result.found) {
        return result;
      }
    }

    // No recipient found
    return { found: false, searchQuery: nameInfo.primary };

  } catch (error) {
    console.error('Error searching for recipient:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Perform the actual API search for recipient
 */
async function performRecipientSearch(profileId, query) {
  try {
    const url = `https://wise.com/gateway/v2/profiles/${profileId}/contact-list-page/search`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-access-token': 'Tr4n5f3rw153',
      },
      body: JSON.stringify({
        query: query,
        action: 'SEND'
      }),
      credentials: 'include' // Include cookies for authentication
    });

    if (!response.ok) {
      console.error('Search API error:', response.status);
      return { found: false };
    }

    const data = await response.json();
    console.log('Search results:', data);

    // Check if we have results in the sections structure
    if (data && data.sections && data.sections.length > 0) {
      // Look through sections for matches
      for (const section of data.sections) {
        if (section.matches && section.matches.length > 0) {
          const recipient = section.matches[0]; // Take first match

          return {
            found: true,
            searchQuery: query,
            id: recipient.id,
            name: recipient.name || recipient.display?.title,
            currency: extractCurrencyFromDisplay(recipient.display),
            accountSummary: recipient.display?.subtitle,
            rawData: recipient
          };
        }
      }
    }

    return { found: false };

  } catch (error) {
    console.error('Error performing recipient search:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Extract currency from display badges
 */
function extractCurrencyFromDisplay(display) {
  if (!display) return null;

  // Try to extract from badge URL
  if (display.badge?.value) {
    const match = display.badge.value.match(/\/([a-z]{3})\.png$/i);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  // Try to extract from badges array
  if (display.badges && display.badges.length > 0) {
    const badge = display.badges[0];
    if (badge.value) {
      const match = badge.value.match(/\/([a-z]{3})\.png$/i);
      if (match) {
        return match[1].toUpperCase();
      }
    }
  }

  // Try to extract from subtitle
  if (display.subtitle) {
    const currencyMatch = display.subtitle.match(/\b([A-Z]{3})\b/);
    if (currencyMatch) {
      return currencyMatch[1];
    }
  }

  return null;
}

/**
 * Get profile ID from cookies or selected profile
 */
async function getProfileId() {
  try {
    // Try to get from cookie first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name.includes('selected-profile-id')) {
        const match = value.match(/(\d+)/);
        if (match) {
          console.log('Found profile ID from cookie:', match[1]);
          return match[1];
        }
      }
    }

    // Fallback: try to extract from page context or API
    // You could also store this in chrome.storage during login
    console.warn('Profile ID not found in cookies');
    return null;

  } catch (error) {
    console.error('Error getting profile ID:', error);
    return null;
  }
}

// ============================================
// UPLOAD OPTIONS
// ============================================

/**
 * Show upload or re-record options after PDF generation
 */
function showUploadOptions(transcript) {
  const recorderPanel = document.querySelector('.voice-recorder-panel');
  if (!recorderPanel) return;

  // Create options container
  const optionsHtml = `
    <div class="voice-options" id="voice-options">
      <div class="voice-preview">
        <h4>✅ Recording Complete</h4>
        <p class="preview-text">${transcript ? transcript.substring(0, 100) + '...' : 'No transcript available'}</p>
      </div>
      <div class="voice-actions">
        <button id="voice-upload-btn" class="voice-action-btn primary">
          📤 Upload Invoice
        </button>
        <button id="voice-rerecord-btn" class="voice-action-btn secondary">
          🔄 Re-record
        </button>
      </div>
    </div>
  `;

  // Remove existing options if present
  const existingOptions = document.getElementById('voice-options');
  if (existingOptions) {
    existingOptions.remove();
  }

  // Insert options
  recorderPanel.insertAdjacentHTML('beforeend', optionsHtml);

  // Add event listeners
  document.getElementById('voice-upload-btn').onclick = uploadPDF;
  document.getElementById('voice-rerecord-btn').onclick = reRecord;

  updateStatus('✅ Ready to upload', 'success');
}

/**
 * Upload the PDF to Wise
 */
async function uploadPDF() {
  try {
    if (!currentPDFBlob) {
      throw new Error('No PDF to upload');
    }

    updateStatus('⏳ Uploading invoice...', 'processing');

    // Find the file input on the page
    const fileInput = document.querySelector('input[type="file"]');

    if (!fileInput) {
      throw new Error('Could not find file upload input');
    }

    // Create a File object from the blob
    const file = new File([currentPDFBlob], 'voice-invoice.pdf', { type: 'application/pdf' });

    // Create a DataTransfer to simulate file selection
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Trigger change event
    const event = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(event);

    updateStatus('✅ Invoice uploaded!', 'success');

    // Wait a bit then clean up
    setTimeout(() => {
      const voiceRecorder = document.getElementById('wise-voice-recorder');
      if (voiceRecorder) {
        voiceRecorder.style.display = 'none';
      }
    }, 2000);

  } catch (error) {
    console.error('Error uploading PDF:', error);
    updateStatus('❌ Upload failed: ' + error.message, 'error');
  }
}

/**
 * Re-record the voice invoice
 */
function reRecord() {
  // Remove options
  const options = document.getElementById('voice-options');
  if (options) {
    options.remove();
  }

  // Clear transcript
  const transcriptDiv = document.getElementById('voice-transcript');
  if (transcriptDiv) {
    transcriptDiv.innerHTML = '';
    transcriptDiv.style.display = 'none';
  }

  // Reset button
  const btn = document.getElementById('voice-record-btn');
  if (btn) {
    btn.textContent = 'Start Recording';
    btn.classList.remove('recording');
  }

  // Clear PDF blob
  currentPDFBlob = null;

  updateStatus('🎤 Ready to record', 'info');
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