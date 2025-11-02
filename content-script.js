// Wise Voice Extension - Content Script
console.log('Wise Voice Extension loaded');

let mediaRecorder;
let audioChunks = [];
let recognition;
let isRecording = false;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}

function initExtension() {
  console.log('Initializing Wise Voice Extension...');
  
  // Add voice button to the page
  injectVoiceButton();
  
  // Check if we have a pending PDF to upload
  checkForPendingUpload();
}

function injectVoiceButton() {
  // Try to find a good spot to inject the button
  // This will need adjustment based on actual Wise page structure
  const possibleTargets = [
    document.querySelector('.upload-section'),
    document.querySelector('[data-testid="upload"]'),
    document.querySelector('main'),
    document.body
  ];
  
  const targetElement = possibleTargets.find(el => el !== null);
  
  if (!targetElement) {
    console.log('Could not find target element, will retry...');
    setTimeout(injectVoiceButton, 1000);
    return;
  }
  
  // Check if button already exists
  if (document.getElementById('wise-voice-btn')) {
    return;
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'wise-voice-container';
  container.className = 'wise-voice-container';
  
  // Create button
  const btn = document.createElement('button');
  btn.id = 'wise-voice-btn';
  btn.className = 'wise-voice-btn';
  btn.innerHTML = '🎤 Record Voice Invoice';
  btn.onclick = toggleRecording;
  
  // Create status display
  const status = document.createElement('div');
  status.id = 'wise-voice-status';
  status.className = 'wise-voice-status';
  status.style.display = 'none';
  
  // Create transcript display
  const transcript = document.createElement('div');
  transcript.id = 'wise-voice-transcript';
  transcript.className = 'wise-voice-transcript';
  transcript.style.display = 'none';
  
  container.appendChild(btn);
  container.appendChild(status);
  container.appendChild(transcript);
  
  targetElement.insertBefore(container, targetElement.firstChild);
  console.log('Voice button injected successfully');
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
      console.error('Speech recognition error:', event.error);
      updateStatus('Error: ' + event.error, 'error');
    };
    
    recognition.onend = () => {
      if (isRecording) {
        // Restart if still recording (for continuous recognition)
        recognition.start();
      }
    };
    
    // Start recording audio
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('Audio recorded:', audioBlob.size, 'bytes');
      
      // Generate PDF with transcript
      await generateAndStorePDF(finalTranscript);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    recognition.start();
    isRecording = true;
    
    // Update UI
    const btn = document.getElementById('wise-voice-btn');
    btn.innerHTML = '⏹️ Stop Recording';
    btn.classList.add('recording');
    updateStatus('Recording... Speak your invoice details', 'recording');
    showTranscript();
    
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Could not access microphone. Please grant permission and try again.');
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
  
  // Update UI
  const btn = document.getElementById('wise-voice-btn');
  btn.innerHTML = '🎤 Record Voice Invoice';
  btn.classList.remove('recording');
  updateStatus('Processing... Generating PDF', 'processing');
}

function updateStatus(message, type = 'info') {
  const status = document.getElementById('wise-voice-status');
  if (status) {
    status.textContent = message;
    status.className = 'wise-voice-status ' + type;
    status.style.display = 'block';
  }
}

function updateTranscript(finalText, interimText) {
  const transcriptDiv = document.getElementById('wise-voice-transcript');
  if (transcriptDiv) {
    transcriptDiv.innerHTML = `
      <div class="transcript-final">${finalText}</div>
      <div class="transcript-interim">${interimText}</div>
    `;
  }
}

function showTranscript() {
  const transcriptDiv = document.getElementById('wise-voice-transcript');
  if (transcriptDiv) {
    transcriptDiv.style.display = 'block';
  }
}

async function generateAndStorePDF(text) {
  try {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF library not loaded');
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Voice Invoice', 20, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add transcript
    doc.setFontSize(12);
    doc.text('Transcript:', 20, 45);
    
    // Split text into lines to fit page width
    const lines = doc.splitTextToSize(text || 'No transcript available', 170);
    doc.setFontSize(10);
    doc.text(lines, 20, 55);
    
    // Add footer
    doc.setFontSize(8);
    doc.text('Generated by Wise Voice Extension', 20, 280);
    
    // Convert to blob
    const pdfBlob = doc.output('blob');
    
    // Store in Chrome storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      chrome.storage.local.set({
        pendingPDF: base64data,
        pdfText: text,
        timestamp: Date.now()
      }, () => {
        console.log('PDF stored in Chrome storage');
        updateStatus('PDF generated! Redirecting to upload page...', 'success');
        
        // Show options to user
        setTimeout(() => {
          showUploadOptions(pdfBlob, text);
        }, 1000);
      });
    };
    reader.readAsDataURL(pdfBlob);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    updateStatus('Error generating PDF: ' + error.message, 'error');
  }
}

function showUploadOptions(pdfBlob, text) {
  const container = document.getElementById('wise-voice-container');
  
  // Create options panel
  const optionsPanel = document.createElement('div');
  optionsPanel.className = 'wise-voice-options';
  optionsPanel.innerHTML = `
    <h3>PDF Generated Successfully!</h3>
    <p class="transcript-preview">${text.substring(0, 150)}${text.length > 150 ? '...' : ''}</p>
    <div class="button-group">
      <button id="download-pdf-btn" class="action-btn primary">📥 Download PDF</button>
      <button id="find-upload-btn" class="action-btn">📤 Go to Upload Page</button>
      <button id="dismiss-btn" class="action-btn secondary">✖ Dismiss</button>
    </div>
  `;
  
  // Clear previous content and add options
  container.innerHTML = '';
  container.appendChild(optionsPanel);
  
  // Add event listeners
  document.getElementById('download-pdf-btn').onclick = () => {
    downloadPDF(pdfBlob);
  };
  
  document.getElementById('find-upload-btn').onclick = () => {
    // Navigate to the correct Wise upload page
    window.location.href = 'https://wise.com/send#/contact-beta/upload';
  };
  
  document.getElementById('dismiss-btn').onclick = () => {
    // Reinitialize the button
    container.innerHTML = '';
    initExtension();
  };
}

function downloadPDF(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voice-invoice-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  updateStatus('PDF downloaded! You can now upload it to Wise.', 'success');
}

function checkForPendingUpload() {
  // Check if there's a pending PDF and we're on a page with file upload
  chrome.storage.local.get(['pendingPDF', 'pdfText'], (result) => {
    if (result.pendingPDF) {
      console.log('Found pending PDF, looking for file input...');
      
      // Look for file input fields
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      if (fileInputs.length > 0) {
        console.log('Found file input, attempting to auto-fill...');
        
        // Show notification
        showAutoUploadNotification(result.pendingPDF, result.pdfText);
      }
    }
  });
}

function showAutoUploadNotification(pdfData, text) {
  const notification = document.createElement('div');
  notification.className = 'wise-voice-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <h3>🎤 Voice Invoice Ready</h3>
      <p>Would you like to upload the voice invoice you just recorded?</p>
      <p class="transcript-preview">${text ? text.substring(0, 100) + '...' : 'Voice recording'}</p>
      <div class="button-group">
        <button id="auto-upload-btn" class="action-btn primary">Upload Now</button>
        <button id="cancel-upload-btn" class="action-btn secondary">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  document.getElementById('auto-upload-btn').onclick = () => {
    autoFillFileInput(pdfData);
    document.body.removeChild(notification);
    chrome.storage.local.remove(['pendingPDF', 'pdfText']);
  };
  
  document.getElementById('cancel-upload-btn').onclick = () => {
    document.body.removeChild(notification);
    chrome.storage.local.remove(['pendingPDF', 'pdfText']);
  };
}

function autoFillFileInput(pdfData) {
  try {
    // Convert base64 to blob
    const byteString = atob(pdfData.split(',')[1]);
    const mimeString = pdfData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    // Create File object
    const file = new File([blob], `voice-invoice-${Date.now()}.pdf`, { type: 'application/pdf' });
    
    // Find file input
    const fileInput = document.querySelector('input[type="file"]');
    
    if (fileInput) {
      // Try to set the files
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      // Trigger change event
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log('File input filled successfully');
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'wise-voice-success';
      successMsg.textContent = '✅ Voice invoice uploaded! Please review and submit.';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        if (document.body.contains(successMsg)) {
          document.body.removeChild(successMsg);
        }
      }, 5000);
    } else {
      alert('Could not find file upload field. Please upload the PDF manually.');
    }
  } catch (error) {
    console.error('Error auto-filling file input:', error);
    alert('Could not auto-upload. Please download and upload the PDF manually.');
  }
}
