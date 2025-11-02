# Setup Instructions for Wise Voice Extension

## Prerequisites

✅ Google Chrome or Microsoft Edge browser (latest version)  
✅ Microphone access  
✅ 5 minutes of your time

## Installation Steps

### Step 1: Download the Extension

If you cloned from GitHub:
```bash
git clone https://github.com/maxploter/wise-voice-payments.git
cd wise-voice-payments
```

If you downloaded a ZIP:
- Extract the ZIP file to a folder of your choice
- Remember the folder location

### Step 2: Open Chrome Extensions

**Method 1:**
- Open Chrome/Edge
- Type `chrome://extensions/` in the address bar
- Press Enter

**Method 2:**
- Click the three dots (⋮) in the top-right
- Go to Extensions → Manage Extensions

### Step 3: Enable Developer Mode

- Look for the "Developer mode" toggle in the top-right corner
- Click to enable it (should turn blue)
- New buttons will appear: "Load unpacked", "Pack extension", etc.

### Step 4: Load the Extension

1. Click the "Load unpacked" button
2. Navigate to the `wise-voice-payments` folder
3. Select the entire folder (not individual files)
4. Click "Select Folder" or "Open"

### Step 5: Verify Installation

You should now see:
- ✅ The extension in your extensions list
- ✅ A purple microphone icon
- ✅ Extension name: "Wise Voice Extension"
- ✅ Status: Enabled (toggle should be on/blue)

### Step 6: Pin the Extension (Optional)

1. Click the puzzle piece icon (🧩) in Chrome's toolbar
2. Find "Wise Voice Extension"
3. Click the pin icon to keep it visible

## Testing the Extension

### Quick Test

1. Navigate to https://wise.com
2. Look for the purple 🎤 button in the top-right corner
3. Click the button
4. Grant microphone permission when prompted
5. Say: "Test invoice for 100 dollars"
6. Click stop
7. Verify the transcript appears
8. Click "Download PDF"

### Full Test Flow

1. **Open Wise**: Go to https://wise.com (or any Wise page)

2. **Grant Permissions**: 
   - First time: Chrome will ask for microphone access
   - Click "Allow"

3. **Start Recording**:
   - Click 🎤 "Record Voice Invoice"
   - Button turns red and says "⏹️ Stop Recording"

4. **Speak Your Invoice**:
   ```
   "Send 500 euros to John Smith,
   account number 1234567890,
   reference: March 2024 rent payment"
   ```

5. **Stop Recording**:
   - Click ⏹️ "Stop Recording"
   - Watch the transcript appear

6. **Generate PDF**:
   - Review the transcript
   - Click "📥 Download PDF"
   - PDF downloads to your Downloads folder

7. **Open PDF**:
   - Find the file: `voice-invoice-[timestamp].pdf`
   - Open to verify content

## Troubleshooting Installation

### "Load unpacked" button is grayed out
**Solution**: Enable Developer mode (toggle in top-right)

### "Cannot load extension" error
**Solutions**:
- Make sure you selected the main folder, not a subfolder
- Check that `manifest.json` is in the root of the selected folder
- Try reloading: click refresh icon on extension card

### Extension loads but no icon appears
**Solutions**:
- Check if extension is enabled (toggle should be on)
- Click the puzzle piece (🧩) icon to see hidden extensions
- Try pinning the extension

### "Invalid manifest" error
**Solution**: 
- Make sure all files are present
- Re-download or re-clone the repository
- Check that `manifest.json` hasn't been modified

### Button doesn't appear on Wise
**Solutions**:
- Refresh the Wise page (Ctrl+R or Cmd+R)
- Check extension is enabled in chrome://extensions/
- Clear cache and reload
- Try a different Wise page (dashboard, settings, etc.)

## File Structure Verification

Your folder should contain:

```
wise-voice-payments/
├── manifest.json          ✅ Extension config
├── content-script.js      ✅ Main logic
├── styles.css             ✅ Styles
├── popup.html             ✅ Popup UI
├── popup.js               ✅ Popup logic
├── libs/
│   └── jspdf.umd.min.js  ✅ PDF library (410KB)
├── icons/
│   ├── icon16.png        ✅ Small icon
│   ├── icon48.png        ✅ Medium icon
│   └── icon128.png       ✅ Large icon
├── README.md              ✅ Documentation
├── QUICKSTART.md          ✅ Quick guide
└── LICENSE                ✅ MIT License
```

**Important**: The `libs/jspdf.umd.min.js` file must be present and ~410KB in size.

## Updating the Extension

When you make changes or update from GitHub:

1. Go to `chrome://extensions/`
2. Find "Wise Voice Extension"
3. Click the refresh/reload icon (🔄)
4. Reload any open Wise pages

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Wise Voice Extension"
3. Click "Remove"
4. Confirm removal

## Permissions Explained

The extension requires:

- **Microphone**: To record your voice
- **wise.com access**: To inject the button and interact with the page
- **Storage**: To temporarily store the PDF before upload

All processing happens locally in your browser. No data is sent to external servers.

## Next Steps

- ✅ Read [QUICKSTART.md](QUICKSTART.md) for usage guide
- ✅ Check [README.md](README.md) for detailed documentation
- ✅ Visit [GitHub](https://github.com/maxploter/wise-voice-payments) for updates

## Getting Help

**Issues during installation?**
- Check the Troubleshooting section above
- Open an issue on [GitHub Issues](https://github.com/maxploter/wise-voice-payments/issues)
- Include: Chrome version, OS, error messages, screenshots

**Questions about usage?**
- See [QUICKSTART.md](QUICKSTART.md)
- See [README.md](README.md)
- Ask in [GitHub Discussions](https://github.com/maxploter/wise-voice-payments/discussions)

---

Ready to start? Go to [QUICKSTART.md](QUICKSTART.md) for your first recording! 🎤
