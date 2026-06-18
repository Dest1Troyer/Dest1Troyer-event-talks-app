// --- Application State ---
let releaseNotesData = [];
let selectedDateIndex = 0;
let searchQuery = "";
let selectedTypeFilter = "all";

// --- DOM Elements ---
const datesList = document.getElementById("dates-list");
const selectedDateTitle = document.getElementById("selected-date-title");
const updateCountBadge = document.getElementById("update-count-badge");
const originalSourceLink = document.getElementById("original-source-link");
const updatesContainer = document.getElementById("updates-container");
const refreshBtn = document.getElementById("refresh-btn");
const refreshIcon = document.getElementById("refresh-icon");
const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");
const skeletonLoader = document.getElementById("skeleton-loader");
const emptyState = document.getElementById("empty-state");
const errorAlert = document.getElementById("error-alert");
const errorMessage = document.getElementById("error-message");
const retryBtn = document.getElementById("retry-btn");

// Modal Elements
const tweetModal = document.getElementById("tweet-modal");
const tweetTextarea = document.getElementById("tweet-textarea");
const charCounter = document.getElementById("char-counter");
const currentCharCount = document.getElementById("current-char-count");
const tweetWarning = document.getElementById("tweet-warning");
const closeModalBtn = document.getElementById("close-modal-btn");
const copyTweetBtn = document.getElementById("copy-tweet-btn");
const tweetSubmitBtn = document.getElementById("tweet-submit-btn");

// Utility Elements
const themeToggle = document.getElementById("theme-toggle");
const exportCsvBtn = document.getElementById("export-csv-btn");

// --- API Functions ---
async function fetchReleaseNotes() {
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch("/api/release-notes");
        const result = await response.json();
        
        if (result.success) {
            releaseNotesData = result.data;
            filterAndRender();
        } else {
            showError(result.error || "Failed to fetch release notes from the server.");
        }
    } catch (error) {
        showError("A connection error occurred. Make sure the Flask server is running.");
        console.error("Fetch error:", error);
    } finally {
        showLoading(false);
    }
}

// --- Filtering and Processing ---
function getFilteredData() {
    if (!releaseNotesData || releaseNotesData.length === 0) return [];

    let filtered = JSON.parse(JSON.stringify(releaseNotesData)); // Deep copy to avoid mutating original

    // Apply filters to each date's updates
    filtered = filtered.map(entry => {
        entry.updates = entry.updates.filter(update => {
            // Filter by type
            if (selectedTypeFilter !== "all" && update.type.toLowerCase() !== selectedTypeFilter) {
                return false;
            }
            // Filter by search query
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                const matchesText = update.text.toLowerCase().includes(query);
                const matchesType = update.type.toLowerCase().includes(query);
                return matchesText || matchesType;
            }
            return true;
        });
        return entry;
    });

    // Remove dates that have no updates left after filtering
    return filtered.filter(entry => entry.updates.length > 0);
}

function filterAndRender() {
    const filtered = getFilteredData();
    
    if (filtered.length === 0) {
        renderSidebar([]);
        renderUpdatesContainer(null);
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    renderSidebar(filtered);
    
    // Maintain active selection if possible, otherwise reset to 0
    if (selectedDateIndex >= filtered.length) {
        selectedDateIndex = 0;
    }
    
    renderUpdatesContainer(filtered[selectedDateIndex]);
}

// --- Render Functions ---
function renderSidebar(data) {
    datesList.innerHTML = "";
    
    data.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = `date-item ${index === selectedDateIndex ? 'active' : ''}`;
        
        // Count badge for the number of updates on this day
        const count = entry.updates.length;
        
        li.innerHTML = `
            <span class="date-item-text">${entry.date}</span>
            <span class="date-item-count">${count}</span>
        `;
        
        li.addEventListener("click", () => {
            // Update selected index
            document.querySelectorAll(".date-item").forEach(item => item.classList.remove("active"));
            li.classList.add("active");
            selectedDateIndex = index;
            renderUpdatesContainer(entry);
        });
        
        datesList.appendChild(li);
    });
}

function renderUpdatesContainer(entry) {
    updatesContainer.innerHTML = "";
    
    if (!entry) {
        selectedDateTitle.textContent = "BigQuery Release Notes";
        updateCountBadge.classList.add("hidden");
        originalSourceLink.classList.add("hidden");
        return;
    }
    
    // Set Header
    selectedDateTitle.textContent = entry.date;
    updateCountBadge.textContent = `${entry.updates.length} ${entry.updates.length === 1 ? 'update' : 'updates'}`;
    updateCountBadge.classList.remove("hidden");
    
    if (entry.link) {
        originalSourceLink.href = entry.link;
        originalSourceLink.classList.remove("hidden");
    } else {
        originalSourceLink.classList.add("hidden");
    }
    
    // Render Cards
    entry.updates.forEach((update, idx) => {
        const card = document.createElement("div");
        
        // Determine type classes for color coding
        const typeNormalized = update.type.toLowerCase();
        let dataType = "fallback";
        if (["feature", "announcement", "changed", "deprecated", "issue"].includes(typeNormalized)) {
            dataType = typeNormalized;
        }
        
        card.className = "update-card";
        card.setAttribute("data-type", dataType);
        
        card.innerHTML = `
            <div class="update-card-header">
                <div class="badge-and-info">
                    <span class="badge">${update.type}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-icon copy-btn" title="Copy update description to clipboard">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="btn-icon tweet-btn" title="Tweet this update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </div>
            <div class="update-card-content">
                ${update.html || `<p>${update.text}</p>`}
            </div>
        `;
        
        // Setup copy event
        const copyBtn = card.querySelector(".copy-btn");
        copyBtn.addEventListener("click", () => {
            copyToClipboard(update.text, copyBtn);
        });
        
        // Setup tweet event
        const tweetBtn = card.querySelector(".tweet-btn");
        tweetBtn.addEventListener("click", () => {
            openTweetModal(update, entry.date, entry.link);
        });
        
        updatesContainer.appendChild(card);
    });
}

// --- Twitter Web Intent & Character Counting Helper ---
// Twitter counts any URL as exactly 23 characters due to t.co wrapping.
function getTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
        length = length - url.length + 23;
    });
    return length;
}

function openTweetModal(update, dateStr, sourceLink) {
    // Construct default tweet text
    // Format: "BigQuery [Type] (Date): DescriptionSnippet... \n\nLink #BigQuery"
    const tag = `#BigQuery`;
    const header = `BigQuery ${update.type} (${dateStr}): `;
    const linkSection = `\n\nRead more: ${sourceLink || "https://cloud.google.com/bigquery"}`;
    
    // Remaining budget for description text
    const baseTextLength = getTweetLength(header + linkSection + "\n" + tag);
    const budget = 280 - baseTextLength - 4; // -4 for ellipsis and padding
    
    let descriptionText = update.text;
    if (descriptionText.length > budget) {
        descriptionText = descriptionText.substring(0, budget).trim() + "...";
    }
    
    const defaultTweet = `${header}${descriptionText}${linkSection}\n${tag}`;
    
    tweetTextarea.value = defaultTweet;
    updateCharCounter();
    
    // Show Modal
    tweetModal.classList.remove("hidden");
    tweetTextarea.focus();
}

function updateCharCounter() {
    const text = tweetTextarea.value;
    const length = getTweetLength(text);
    
    currentCharCount.textContent = length;
    
    if (length > 280) {
        charCounter.classList.add("warning");
        tweetWarning.classList.remove("hidden");
    } else {
        charCounter.classList.remove("warning");
        tweetWarning.classList.add("hidden");
    }
}

// --- Utility Functions ---
function showLoading(isLoading) {
    if (isLoading) {
        skeletonLoader.classList.remove("hidden");
        updatesContainer.classList.add("hidden");
        refreshIcon.classList.add("spinning");
        refreshBtn.disabled = true;
    } else {
        skeletonLoader.classList.add("hidden");
        updatesContainer.classList.remove("hidden");
        refreshIcon.classList.remove("spinning");
        refreshBtn.disabled = false;
    }
}

function showEmptyState(show) {
    if (show) {
        emptyState.classList.remove("hidden");
        updatesContainer.classList.add("hidden");
    } else {
        emptyState.classList.add("hidden");
        updatesContainer.classList.remove("hidden");
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove("hidden");
    updatesContainer.classList.add("hidden");
    datesList.innerHTML = "";
    selectedDateTitle.textContent = "Error";
    updateCountBadge.classList.add("hidden");
}

function hideError() {
    errorAlert.classList.add("hidden");
}

function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = buttonElement.querySelector("i");
        // Swap icon to checkmark
        icon.className = "fa-solid fa-check";
        buttonElement.style.borderColor = "var(--color-accent)";
        buttonElement.style.color = "var(--color-accent)";
        
        setTimeout(() => {
            icon.className = "fa-solid fa-copy";
            buttonElement.style.borderColor = "";
            buttonElement.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
}

function exportToCSV() {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
        alert("No release notes found matching the current filters to export.");
        return;
    }
    
    const csvRows = [];
    csvRows.push(['Date', 'Type', 'Description', 'Link']);
    
    filtered.forEach(entry => {
        entry.updates.forEach(update => {
            csvRows.push([
                entry.date,
                update.type,
                update.text,
                entry.link || "https://cloud.google.com/bigquery"
            ]);
        });
    });
    
    const csvContent = csvRows.map(row => 
        row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Fetch initial notes
    fetchReleaseNotes();
    
    // Refresh Event
    refreshBtn.addEventListener("click", fetchReleaseNotes);
    retryBtn.addEventListener("click", fetchReleaseNotes);
    
    // Filter Event
    typeFilter.addEventListener("change", (e) => {
        selectedTypeFilter = e.target.value;
        selectedDateIndex = 0; // Reset index to avoid out of bounds
        filterAndRender();
    });
    
    // Search Event
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        selectedDateIndex = 0; // Reset index to avoid out of bounds
        filterAndRender();
    });
    
    // Modal Event: Textarea input
    tweetTextarea.addEventListener("input", updateCharCounter);
    
    // Modal Event: Close
    closeModalBtn.addEventListener("click", () => {
        tweetModal.classList.add("hidden");
    });
    
    // Modal Event: Click outside to close
    tweetModal.addEventListener("click", (e) => {
        if (e.target === tweetModal) {
            tweetModal.classList.add("hidden");
        }
    });
    
    // Modal Event: Copy text
    copyTweetBtn.addEventListener("click", () => {
        copyToClipboard(tweetTextarea.value, copyTweetBtn);
    });
    
    // Modal Event: Submit/Tweet Intent
    tweetSubmitBtn.addEventListener("click", () => {
        const text = tweetTextarea.value;
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, "_blank");
        tweetModal.classList.add("hidden");
    });
    
    // Export CSV Event
    exportCsvBtn.addEventListener("click", exportToCSV);
    
    // Theme Toggle Events
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        themeToggle.checked = true;
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        themeToggle.checked = false;
    }

    themeToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            localStorage.setItem("theme", "light");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        }
    });
});
