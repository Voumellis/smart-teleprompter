# Contributing to Smart Teleprompter

Thank you for your interest in contributing to Smart Teleprompter! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

- Use the [GitHub Issues](https://github.com/yourusername/smart-teleprompter/issues) page
- Search existing issues before creating a new one
- Provide clear, detailed descriptions
- Include steps to reproduce bugs
- Specify your browser and operating system

### Suggesting Features

- Use [GitHub Discussions](https://github.com/yourusername/smart-teleprompter/discussions) for feature requests
- Check existing discussions first
- Provide use cases and examples
- Consider implementation complexity

### Code Contributions

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Make** your changes
5. **Test** thoroughly
6. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

## 🛠️ Development Setup

### Prerequisites

- Modern web browser (Chrome recommended)
- Git
- Text editor or IDE
- Local web server (optional but recommended)

### Local Development

```bash
# Clone your fork
git clone https://github.com/yourusername/smart-teleprompter.git
cd smart-teleprompter

# Serve locally (choose one)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000

# Open http://localhost:8000
```

### Testing

- Test in multiple browsers (Chrome, Edge, Safari)
- Test on different devices (mobile, tablet, desktop)
- Test with different languages
- Test microphone functionality
- Test keyboard shortcuts
- **Important**: Test iOS limitations (Auto-scroll only)
- **Important**: Test Android performance variations

## 📝 Code Style Guidelines

### JavaScript

- Use modern ES6+ features
- Follow React best practices
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### HTML/CSS

- Use semantic HTML
- Follow responsive design principles
- Use CSS custom properties for theming
- Keep styles organized and maintainable

### File Organization

- Keep related code together
- Use descriptive file names
- Follow the existing project structure

## 🎯 Areas for Contribution

### High Priority

- 🐛 **Bug fixes** - Especially for cross-browser compatibility
- 🌍 **Language support** - Adding new languages
- 📱 **Mobile optimization** - Improving mobile experience
- ♿ **Accessibility** - Making the app more accessible

### Medium Priority

- 🎨 **UI/UX improvements** - Better user interface
- ⚡ **Performance** - Optimizing speech recognition
- 🧪 **Testing** - Adding automated tests
- 📚 **Documentation** - Improving docs and examples

### Low Priority

- 🔧 **Build tools** - Adding build processes
- 🌐 **Internationalization** - Multi-language UI
- 🔌 **Plugins** - Extensibility features

## 🚫 What Not to Contribute

- Breaking changes without discussion
- Dependencies that significantly increase bundle size
- Features that require server-side components
- Code that doesn't follow the project's philosophy

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Test your changes thoroughly
- [ ] Update documentation if needed
- [ ] Follow the code style guidelines
- [ ] Make sure your PR description is clear
- [ ] Link any related issues

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested in Chrome
- [ ] Tested in Edge
- [ ] Tested on mobile
- [ ] Tested voice recognition
- [ ] Tested keyboard shortcuts

## Screenshots (if applicable)

Add screenshots to help explain your changes

## Additional Notes

Any additional information about the changes
```

## 🏷️ Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add fullscreen mode support
fix: resolve iOS microphone access issue
docs: update README with new features
style: improve button hover effects
refactor: optimize speech recognition logic
test: add tests for voice recognition
```

## 🐛 Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**

- Browser: [e.g. Chrome 91]
- OS: [e.g. Windows 10]
- Device: [e.g. Desktop/Mobile]

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Describe how you think this should work.

**Alternatives Considered**
Describe any alternative solutions you've considered.

**Additional Context**
Any other context or screenshots about the feature request.
```

## 🎉 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

## 📞 Getting Help

- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/smart-teleprompter/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/smart-teleprompter/issues)
- 📧 **Email**: [Your email] (for private matters)

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for contributing to Smart Teleprompter! 🎬✨
