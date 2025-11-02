// Popup script for Wise Voice Extension

document.addEventListener('DOMContentLoaded', () => {
  checkExtensionStatus();
});

function checkExtensionStatus() {
  const statusDiv = document.getElementById('status');
  
  // Check if we're on a Wise page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('wise.com')) {
      statusDiv.className = 'status active';
      statusDiv.innerHTML = '✅ Ready to record on Wise.com';
    } else {
      statusDiv.className = 'status';
      statusDiv.innerHTML = 'ℹ️ Navigate to wise.com to use the extension';
    }
  });
  
  // Check for pending uploads
  chrome.storage.local.get(['pendingPDF'], (result) => {
    if (result.pendingPDF) {
      statusDiv.className = 'status active';
      statusDiv.innerHTML = '📄 You have a pending voice invoice ready to upload';
    }
  });
}
