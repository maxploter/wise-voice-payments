# Wise Voice Extension 🎤

A Chrome extension that allows you to record voice notes and automatically convert them into PDF bills for upload to Wise (TransferWise).

## Features

- 🎤 **Voice Recording**: Click a button to start recording your invoice details
- 🗣️ **Real-time Transcription**: Uses Web Speech API to transcribe your voice in real-time
- 📄 **Automatic PDF Generation**: Converts your voice transcript into a formatted PDF
- ⚡ **Client-Side Processing**: Everything happens in your browser - no backend needed
- 🔒 **Privacy First**: Your voice data never leaves your computer
- 📤 **Easy Upload**: Download the PDF or auto-fill upload forms on Wise

## How It Works

1. Visit wise.com
2. Click the 🎤 "Record Voice Invoice" button (appears in top-right corner)
3. Speak your invoice details (e.g., "Send 500 euros to John Smith, reference: March rent")
4. Click stop when finished
5. Review the transcript
6. Download the PDF or click "Go to Upload Page" to navigate to `wise.com/send#/contact-beta/upload`

## Installation

### Option 1: Load Unpacked (For Development/Testing)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/maxploter/wise-voice-payments.git
   cd wise-voice-payments
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked"

5. Select the `wise-voice-payments` folder

6. The extension should now appear in your extensions list!

### Option 2: Install from Chrome Web Store

*Coming soon - currently in development*

## Usage

### Basic Usage

1. **Navigate to Wise**: Go to [wise.com](https://wise.com)

2. **Start Recording**: Look for the purple 🎤 button in the top-right corner of the page

3. **Speak Clearly**: Say your invoice details. Example:
   ```
   "Send 500 euros to John Smith, account number 1234567890, 
   reference: March 2024 rent payment"
   ```

4. **Stop Recording**: Click the ⏹️ button to stop

5. **Review**: Check the transcript to ensure accuracy

6. **Upload**: Choose to either:
   - Download the PDF for manual upload
   - Auto-upload to Wise (if on upload page)

### Tips for Best Results

- **Speak clearly** and at a moderate pace
- **Include key details**: recipient name, amount, currency, account details, reference
- **Use natural language**: The extension captures exactly what you say
- **Check permissions**: Grant microphone access when prompted
- **Browser support**: Works best in Chrome and Edge (Web Speech API required)

## Upload Page

The extension is designed to work seamlessly with Wise's bill upload page:

**Upload URL**: `https://wise.com/send#/contact-beta/upload`

After recording your voice invoice:
1. Click "Go to Upload Page" button - this will navigate you directly to the upload page
2. The extension will detect the upload form and offer to auto-fill your PDF
3. Review the details and submit to Wise

Alternatively, you can download the PDF and manually upload it at any time.

## File Structure

```
wise-voice-payments/
├── manifest.json              # Extension configuration
├── content-script.js          # Main logic (recording, transcription, PDF)
├── styles.css                 # UI styling
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup logic
├── libs/
│   └── jspdf.umd.min.js      # PDF generation library
├── icons/
│   ├── icon16.png            # Extension icons
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # This file
```

## Technical Details

### Technologies Used

- **Web Speech API**: Browser-native speech recognition (no API costs!)
- **MediaRecorder API**: For audio recording
- **jsPDF**: Client-side PDF generation
- **Chrome Extension APIs**: Storage and content script injection

### How It Works Technically

1. **Injection**: Content script injects a button into wise.com pages
2. **Recording**: MediaRecorder captures audio, Web Speech API transcribes in real-time
3. **Processing**: Transcript is formatted and converted to PDF using jsPDF
4. **Storage**: PDF stored temporarily in Chrome's local storage
5. **Upload**: File can be downloaded or auto-filled into Wise's upload forms

### Privacy & Security

- ✅ All processing happens client-side in your browser
- ✅ No data is sent to external servers
- ✅ Voice recordings are not stored permanently
- ✅ Chrome storage is cleared after PDF upload/download
- ✅ Requires microphone permission (standard Chrome permission)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Chromium-based |
| Firefox | ⚠️ Partial | Manifest V3 support varies |
| Safari | ❌ No | Different extension system |

## Troubleshooting

### "Microphone permission denied"
- Click the 🔒 icon in the address bar
- Allow microphone access for wise.com

### "Speech recognition not supported"
- Ensure you're using Chrome or Edge
- Check that you're on a secure connection (HTTPS)

### "Button doesn't appear"
- Refresh the page
- Check that the extension is enabled in `chrome://extensions/`
- Try visiting different pages on wise.com

### "PDF auto-upload not working"
- This feature is experimental
- Use the "Download PDF" button as a fallback
- Manually upload the PDF to Wise

## Development

### Setup

```bash
# Clone the repo
git clone https://github.com/maxploter/wise-voice-payments.git
cd wise-voice-payments

# Install dependencies (for jsPDF)
npm install

# Copy jsPDF to libs folder
cp node_modules/jspdf/dist/jspdf.umd.min.js libs/
```

### Making Changes

1. Edit the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload wise.com to see changes

### Building Icons

Icons are generated using Python PIL:

```bash
python3 create_icons.py
```

## Roadmap

- [ ] Add support for multiple languages
- [ ] Improve voice command parsing (extract fields automatically)
- [ ] Add templates for common invoice types
- [ ] Support for other document types (not just bills)
- [ ] Integration with Wise API (if available)
- [ ] Export to other formats (CSV, JSON)

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Disclaimer

This is an unofficial extension and is not affiliated with, endorsed by, or connected to Wise (TransferWise) in any way. Use at your own risk.

## Support

- **Issues**: [GitHub Issues](https://github.com/maxploter/wise-voice-payments/issues)
- **Discussions**: [GitHub Discussions](https://github.com/maxploter/wise-voice-payments/discussions)

## Acknowledgments

- Built with [jsPDF](https://github.com/parallax/jsPDF)
- Uses Web Speech API by W3C
- Inspired by the need for faster invoice processing

---

Made with ❤️ for the Wise community
