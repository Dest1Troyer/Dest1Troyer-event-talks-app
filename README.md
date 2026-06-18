# 📊 BigQuery Release Notes Tracker

A sleek, responsive, and modern dark-themed web application to monitor, filter, search, and share release notes from Google Cloud BigQuery. Built using **Python Flask** on the backend and **vanilla HTML, JavaScript, and CSS** on the frontend.

## 🚀 Features

* **📰 Automatic Feed Parsing & Splitting**: Fetches the official Google Cloud BigQuery RSS/Atom feed and uses BeautifulSoup to split daily digests into individual, clean update cards (e.g. separating a **Feature** from an **Issue** or **Announcement** on the same day).
* **✨ Glassmorphic Dark UI**: Modern and immersive interface designed from scratch using HSL color tokens, responsive sidebar layout, glowing border accents, and loading skeleton states.
* **🔍 Live Filtering & Search**:
  * Search through updates dynamically by keywords.
  * Filter updates by change category (e.g., Features, Announcements, Changes, Deprecations, Issues).
* **🐦 Custom Tweet Composer Modal**:
  * Select any individual update and compile a Tweet instantly.
  * Pre-fills type, date, description, source link, and hashtags.
  * **Smart Character Counting**: Mimics Twitter's character counting policy by treating all URLs as exactly 23 characters, with a live warning banner if the total length exceeds the 280-character limit.
  * One-click copying or direct redirection via Twitter Web Intent.
* **🔄 Live Refresh**: A refresh button with smooth spinner animations allows fetching the latest notes on demand.

---

## 🛠️ Project Structure

```
Dest1Troyer-event-talks-app/
├── app.py                  # Flask web server & feed parser
├── templates/
│   └── index.html          # Frontend structure and HTML layouts
├── static/
│   ├── css/
│   │   └── style.css       # Layout styles & responsive design
│   └── js/
│       └── app.js          # DOM manipulation, filters, and Tweet composer
├── .gitignore              # Git ignore file for Python projects
└── README.md               # Project overview and instructions
```

---

## 💻 Setup & Installation

### Prerequisites
* Python 3.8 or higher
* Pip (Python package manager)

### 1. Clone the Repository
```bash
git clone https://github.com/Dest1Troyer/Dest1Troyer-event-talks-app.git
cd Dest1Troyer-event-talks-app
```

### 2. Install Dependencies
This project uses standard Flask, requests, and BeautifulSoup4:
```bash
pip install flask requests beautifulsoup4 lxml
```

### 3. Run the Server
Launch the development server:
```bash
python app.py
```
By default, the application runs on **`http://127.0.0.1:5000`**. Open this URL in your web browser.

---

## 📖 Usage

1. **Timeline**: Use the left sidebar to navigate chronological update dates.
2. **Search**: Type keywords into the search box in the sidebar to search all release notes.
3. **Filter**: Choose an update type from the dropdown (e.g., Features) to show only updates of that category.
4. **Copy Text**: Click the copy icon on any card to copy the plain text details to your clipboard.
5. **Tweet**: Click the Twitter logo on any card, customize your text in the pop-up modal, and click **Tweet Now** to share the update.
