# 🎬 Smart Teleprompter

A free, open-source teleprompter application that uses real-time speech recognition to automatically follow your voice as you read. Perfect for content creators, presenters, and anyone who needs a professional teleprompter solution.

![Smart Teleprompter](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![React](https://img.shields.io/badge/React-Hooks-blue.svg)

## ✨ Features

### 🎤 Voice Recognition

- **Real-time speech tracking** with 20+ language support
- **Automatic scrolling** that follows your voice
- **Word highlighting** as you speak
- **Smart matching** with configurable lookahead window
- **Interim results** for faster response

### 🎨 Customization

- **Adjustable font size** (16px - 72px)
- **Custom colors** for background, text, and highlights
- **Line height** and **spacing** controls
- **Text alignment** (left, center, right)
- **Mirror mode** for camera setups
- **Opacity controls** for text and UI elements

### 📱 User Experience

- **Responsive design** for mobile, tablet, and desktop
- **Fullscreen mode** for presentations
- **Keyboard shortcuts** for quick access
- **Script editor** with copy/clear functions
- **Settings persistence** with localStorage
- **Smooth animations** and transitions

### 🌍 Multi-Language Support

- 🇺🇸 English (US/UK)
- 🇬🇷 Greek
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇮🇹 Italian
- 🇵🇹 Portuguese
- 🇳🇱 Dutch
- 🇸🇪 Swedish
- 🇳🇴 Norwegian
- 🇩🇰 Danish
- 🇫🇮 Finnish
- 🇵🇱 Polish
- 🇷🇺 Russian
- 🇨🇳 Chinese
- 🇯🇵 Japanese
- 🇰🇷 Korean
- 🇸🇦 Arabic
- 🇮🇳 Hindi
- 🇹🇷 Turkish

## 🚀 Quick Start

### Option 1: Direct Use

1. Download or clone this repository
2. Open `index.html` in your web browser (landing page)
3. Click "🚀 Launch App" to open the teleprompter
4. Allow microphone access when prompted
5. Start speaking to see the magic happen!

### Option 2: Local Server

```bash
# Clone the repository
git clone https://github.com/yourusername/smart-teleprompter.git
cd smart-teleprompter

# Serve with Python (if installed)
python -m http.server 8000

# Or with Node.js (if installed)
npx serve .

# Open http://localhost:8000 in your browser (landing page)
# Click "🚀 Launch App" to access the teleprompter
```

## ⌨️ Keyboard Shortcuts

| Key | Action                   |
| --- | ------------------------ |
| `V` | Start/Stop microphone    |
| `P` | Play/Pause auto-scroll   |
| `H` | Toggle word highlighting |
| `R` | Reset to beginning       |
| `L` | Language selection       |
| `E` | Settings menu            |
| `S` | Script editor            |
| `F` | Fullscreen mode          |
| `M` | Mirror text horizontally |

## 🎯 How It Works

1. **Voice Input**: The app uses the Web Speech API to capture your voice
2. **Text Processing**: Your speech is converted to text and matched against the script
3. **Smart Scrolling**: The app automatically scrolls to keep your current position centered
4. **Visual Feedback**: Words are highlighted as you speak them
5. **Smooth Experience**: Optimized for natural reading flow

## 📋 Requirements

- **Modern web browser** with Web Speech API support
- **Microphone access** for voice recognition
- **HTTPS connection** (required for microphone access in production)

### ⚠️ Important Compatibility Notes

**For Best Experience:**

- 🖥️ **Use Desktop/Laptop** with Chrome browser
- 🌐 **Stable Internet Connection** recommended
- 🎤 **Microphone Access** required for voice recognition

**Mobile Limitations:**

- 📱 **iPhone/iPad**: Only Auto-scroll mode works (no voice recognition)
- 📱 **Android**: Voice recognition may work but performance varies
- 🌐 **Mobile Browsers**: Limited Web Speech API support

### Browser Compatibility

- ✅ **Chrome/Chromium** (recommended - best performance)
- ✅ **Edge** (good performance)
- ⚠️ **Safari** (limited functionality, no voice recognition on iOS)
- ❌ **Firefox** (no Web Speech API support)

## 🔧 Configuration

### Voice Recognition Settings

- **Lookahead Window**: How many words ahead to search (8-15 recommended)
- **Language**: Select your preferred language for better accuracy
- **Interim Results**: Enable for faster response (recommended)

### Visual Settings

- **Font Size**: Adjust for your screen size and reading distance
- **Colors**: Customize background, text, and highlight colors
- **Spacing**: Fine-tune line height and paragraph spacing
- **Alignment**: Choose text alignment for your setup

### Performance Settings

- **Scroll Speed**: Adjust how fast the text scrolls
- **Center Padding**: Control how much space around the reading line
- **Aim Indicator**: Show/hide the reading line indicator

## 📱 Mobile Support

The app is fully responsive and works on:

- 📱 **Mobile phones** (iOS/Android)
- 📱 **Tablets** (iPad/Android tablets)
- 💻 **Desktop computers**

**Note**: iOS devices have limited speech recognition support. Auto-play mode works perfectly on all devices.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution

- 🌍 Additional language support
- 🎨 UI/UX improvements
- 🐛 Bug fixes
- 📚 Documentation
- 🧪 Testing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Web Speech API** for voice recognition capabilities
- **Heroicons** for beautiful SVG icons
- **React** for the component architecture
- **Open source community** for inspiration and support

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/smart-teleprompter/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/smart-teleprompter/discussions)
- ☕ **Support Development**: [Buy Me a Coffee](https://buymeacoffee.com/nrjsoeq61)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Made with ❤️ for content creators worldwide**

_If you find this project helpful, please give it a ⭐ on GitHub!_
