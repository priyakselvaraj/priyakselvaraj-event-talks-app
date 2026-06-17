document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
        activeCategory: 'all',
        searchQuery: '',
        sortBy: 'newest'
    };

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const sunIcon = document.querySelector('.theme-icon-sun');
    const moonIcon = document.querySelector('.theme-icon-moon');
    const syncStatus = document.getElementById('sync-status');
    const statusDot = syncStatus.querySelector('.status-indicator-dot');
    const statusText = syncStatus.querySelector('.status-text');
    
    const searchInput = document.getElementById('search-input');
    const categoryFiltersContainer = document.getElementById('category-filters-container');
    const sortSelect = document.getElementById('sort-select');
    
    const feedLoading = document.getElementById('feed-loading');
    const feedError = document.getElementById('feed-error');
    const errorMessage = document.getElementById('error-message');
    const btnRetry = document.getElementById('btn-retry');
    const feedEmpty = document.getElementById('feed-empty');
    const feedList = document.getElementById('feed-list');
    const feedCountBadge = document.getElementById('feed-count-badge');
    const btnExportCsv = document.getElementById('btn-export-csv');
    
    const detailPanel = document.querySelector('.detail-panel');
    const detailEmpty = document.getElementById('detail-empty');
    const detailContent = document.getElementById('detail-content');
    const detailCategoryBadge = document.getElementById('detail-category-badge');
    const detailDate = document.getElementById('detail-date');
    const detailLink = document.getElementById('detail-link');
    const detailBodyContainer = document.getElementById('detail-body-container');
    
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnTweet = document.getElementById('btn-tweet');
    const charCountText = document.getElementById('char-count-text');
    const progressRingCircle = document.getElementById('progress-ring-circle');
    const xPreviewText = document.getElementById('x-preview-text');

    // Create a close button for mobile viewports in the Detail panel
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary btn-icon-only btn-close-detail';
    closeBtn.title = 'Back to Feed';
    closeBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '24px';
    closeBtn.style.right = '24px';
    closeBtn.style.zIndex = '10';
    closeBtn.style.display = 'none';
    detailPanel.appendChild(closeBtn);

    // Initial Theme Setup
    applyTheme(state.theme);

    // Fetch Release Notes on Start
    fetchReleaseNotes();

    // Event Listeners
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    btnThemeToggle.addEventListener('click', toggleTheme);
    
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });

    categoryFiltersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        // Update active class
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        state.activeCategory = chip.dataset.category;
        applyFilters();
    });

    sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFilters();
    });

    tweetTextarea.addEventListener('input', (e) => {
        updateComposerUI(e.target.value);
    });

    btnTweet.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (text) {
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        }
    });

    closeBtn.addEventListener('click', () => {
        detailPanel.classList.remove('overlay-active');
        closeBtn.style.display = 'none';
        
        // Remove active class from selected card
        document.querySelectorAll('.release-card').forEach(c => c.classList.remove('active'));
        state.selectedUpdate = null;
    });

    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportToCSV);
    }

    // Theme Toggle Function
    function toggleTheme() {
        const nextTheme = state.theme === 'light' ? 'dark' : 'light';
        state.theme = nextTheme;
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.remove('theme-light');
            document.documentElement.classList.add('theme-dark');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.documentElement.classList.remove('theme-dark');
            document.documentElement.classList.add('theme-light');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }

    // Fetch API Data
    async function fetchReleaseNotes() {
        setLoadingState(true);
        try {
            const response = await fetch('/api/release-notes');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Process and flatten entry updates
            processUpdates(data.entries);
            setLoadingState(false);
            updateSyncStatus('success', 'Up to date');
            
        } catch (error) {
            console.error('Fetch error:', error);
            setErrorState(error.message);
            updateSyncStatus('error', 'Sync failed');
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            btnRefresh.classList.add('btn-refresh-active');
            btnRefresh.disabled = true;
            feedLoading.style.display = 'flex';
            feedError.style.display = 'none';
            feedEmpty.style.display = 'none';
            feedList.style.display = 'none';
            updateSyncStatus('syncing', 'Syncing feed...');
        } else {
            btnRefresh.classList.remove('btn-refresh-active');
            btnRefresh.disabled = false;
            feedLoading.style.display = 'none';
        }
    }

    function setErrorState(msg) {
        btnRefresh.classList.remove('btn-refresh-active');
        btnRefresh.disabled = false;
        feedLoading.style.display = 'none';
        feedList.style.display = 'none';
        feedEmpty.style.display = 'none';
        
        feedError.style.display = 'flex';
        errorMessage.textContent = msg || "Could not retrieve release notes.";
    }

    function updateSyncStatus(type, text) {
        statusDot.className = 'status-indicator-dot';
        if (type === 'syncing') {
            statusDot.classList.add('dot-syncing');
        } else if (type === 'error') {
            statusDot.classList.add('dot-error');
        } else {
            statusDot.classList.add('dot-idle');
        }
        statusText.textContent = text;
    }

    // Process and flatten feed data
    function processUpdates(entries) {
        state.updates = [];
        
        entries.forEach(entry => {
            const entryDate = entry.date;
            const entryIsoDate = entry.iso_date;
            const entryLink = entry.link;
            
            entry.updates.forEach((update, idx) => {
                state.updates.push({
                    id: `${entry.id}-${idx}`,
                    date: entryDate,
                    isoDate: entryIsoDate,
                    link: entryLink,
                    category: update.category || 'Update',
                    body: update.body || ''
                });
            });
        });
        
        applyFilters();
    }

    // Filter and Sort Handler
    function applyFilters() {
        let results = [...state.updates];
        
        // Apply Category Filter
        if (state.activeCategory !== 'all') {
            results = results.filter(item => item.category.toLowerCase() === state.activeCategory.toLowerCase());
        }
        
        // Apply Keyword Search Filter
        if (state.searchQuery) {
            results = results.filter(item => {
                const plainText = stripHtmlTags(item.body).toLowerCase();
                return plainText.includes(state.searchQuery) || 
                       item.category.toLowerCase().includes(state.searchQuery) ||
                       item.date.toLowerCase().includes(state.searchQuery);
            });
        }
        
        // Apply Sorting
        results.sort((a, b) => {
            const dateA = new Date(a.isoDate);
            const dateB = new Date(b.isoDate);
            return state.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        state.filteredUpdates = results;
        renderFeed();
    }

    // Render Feed cards
    function renderFeed() {
        feedList.innerHTML = '';
        feedCountBadge.textContent = `${state.filteredUpdates.length} item${state.filteredUpdates.length !== 1 ? 's' : ''}`;
        
        if (state.filteredUpdates.length === 0) {
            feedList.style.display = 'none';
            feedEmpty.style.display = 'flex';
            return;
        }
        
        feedEmpty.style.display = 'none';
        feedList.style.display = 'flex';
        
        state.filteredUpdates.forEach(item => {
            const card = document.createElement('div');
            card.className = `release-card ${state.selectedUpdate && state.selectedUpdate.id === item.id ? 'active' : ''}`;
            card.dataset.id = item.id;
            
            // Extract a brief plain text summary for card excerpt
            const plainTextExcerpt = stripHtmlTags(item.body);
            const badgeClass = getCategoryBadgeClass(item.category);
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="badge ${badgeClass}">${item.category}</span>
                        <span class="card-date">${item.date}</span>
                    </div>
                    <button class="btn-copy-card" title="Copy to clipboard">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
                <div class="card-excerpt">${plainTextExcerpt}</div>
                <div class="card-select-indicator"></div>
            `;
            
            const copyBtn = card.querySelector('.btn-copy-card');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const textToCopy = `📢 [BigQuery] ${item.category} (${item.date})\n\n${plainTextExcerpt}\n\nRead more: ${item.link}`;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalHTML = copyBtn.innerHTML;
                        copyBtn.innerHTML = `
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        `;
                        copyBtn.classList.add('copy-success');
                        setTimeout(() => {
                            copyBtn.innerHTML = originalHTML;
                            copyBtn.classList.remove('copy-success');
                        }, 1500);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });
            }
            
            card.addEventListener('click', () => selectUpdate(item, card));
            feedList.appendChild(card);
        });
    }

    function getCategoryBadgeClass(category) {
        const cat = category.toLowerCase();
        if (cat === 'feature') return 'badge-feature';
        if (cat === 'announcement') return 'badge-announcement';
        if (cat === 'fix') return 'badge-fix';
        if (cat === 'deprecation') return 'badge-deprecation';
        if (cat === 'changed') return 'badge-changed';
        if (cat === 'issue') return 'badge-issue';
        if (cat === 'notice') return 'badge-notice';
        return 'badge-default';
    }

    // Select Update Handler
    function selectUpdate(item, cardElement) {
        state.selectedUpdate = item;
        
        // Update card active classes
        document.querySelectorAll('.release-card').forEach(c => c.classList.remove('active'));
        if (cardElement) cardElement.classList.add('active');
        
        // Populate Details view
        detailCategoryBadge.className = `badge ${getCategoryBadgeClass(item.category)}`;
        detailCategoryBadge.textContent = item.category;
        detailDate.textContent = item.date;
        detailLink.href = item.link;
        detailBodyContainer.innerHTML = item.body;
        
        // Setup initial Tweet Draft
        const draftText = composeDefaultTweet(item);
        tweetTextarea.value = draftText;
        updateComposerUI(draftText);
        
        // Show Content panels
        detailEmpty.style.display = 'none';
        detailContent.style.display = 'block';
        
        // Toggle mobile drawer overlay if viewport is small/medium
        if (window.innerWidth <= 1100) {
            detailPanel.classList.add('overlay-active');
            closeBtn.style.display = 'flex';
        } else {
            closeBtn.style.display = 'none';
        }
    }

    // Composing Default Tweet
    function composeDefaultTweet(item) {
        const cleanBody = stripHtmlTags(item.body);
        const prefix = `📢 [BigQuery] ${item.category}: `;
        const suffix = `\n\nRead more: ${item.link} #BigQuery #GoogleCloud`;
        
        // Twitter character limit is 280
        // We need to calculate what space is remaining for the body content
        const linkLength = 23; // Twitter URL shortener t.co wraps URLs at 23 chars
        const suffixEstimate = `\n\nRead more: ` + "h".repeat(linkLength) + ` #BigQuery #GoogleCloud`;
        const reservedLength = prefix.length + suffixEstimate.length;
        const maxBodyLength = 280 - reservedLength - 3; // 3 chars for ellipsis '...'
        
        let bodyText = cleanBody;
        if (cleanBody.length > maxBodyLength) {
            bodyText = cleanBody.substring(0, maxBodyLength).trim() + '...';
        }
        
        return `${prefix}${bodyText}\n\nRead more: ${item.link} #BigQuery #GoogleCloud`;
    }

    // Real-time updates to Composer and live post preview
    function updateComposerUI(text) {
        const characterCount = text.length;
        charCountText.textContent = `${characterCount} / 280`;
        
        // Calculate progress circle offsets
        // r = 10 -> C = 62.83
        const circ = 62.83;
        const pct = Math.min(characterCount / 280, 1.0);
        const offset = circ - (pct * circ);
        progressRingCircle.style.strokeDashoffset = offset;
        
        // Visual indicator changes based on length
        if (characterCount > 280) {
            progressRingCircle.style.stroke = '#ef4444'; // Red
            charCountText.style.color = '#ef4444';
            btnTweet.disabled = true;
            btnTweet.style.opacity = '0.5';
        } else if (characterCount >= 260) {
            progressRingCircle.style.stroke = '#f59e0b'; // Amber warning
            charCountText.style.color = '#f59e0b';
            btnTweet.disabled = false;
            btnTweet.style.opacity = '1';
        } else {
            progressRingCircle.style.stroke = 'var(--primary-color)';
            charCountText.style.color = 'var(--text-secondary)';
            btnTweet.disabled = false;
            btnTweet.style.opacity = '1';
        }
        
        // Mirror to live preview
        // Parse hashtags and links to highlight them like X/Twitter does
        xPreviewText.innerHTML = formatTweetPreview(text);
    }

    function formatTweetPreview(text) {
        if (!text) return '<span style="color: var(--text-secondary); font-style: italic;">Your post text will appear here...</span>';
        
        // Escape raw HTML
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
            
        // Highlight Hashtags
        escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: #1d9bf0; cursor: pointer;">$1</span>');
        
        // Highlight Handles
        escaped = escaped.replace(/(@[a-zA-Z0-9_]+)/g, '<span style="color: #1d9bf0; cursor: pointer;">$1</span>');
        
        // Highlight links
        escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #1d9bf0; text-decoration: underline; cursor: pointer;">$1</span>');
        
        return escaped;
    }

    // Helper functions
    function stripHtmlTags(html) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Replace list items with clean bullet lists
        const listItems = temp.querySelectorAll('li');
        listItems.forEach(li => {
            li.textContent = `• ${li.textContent.trim()}\n`;
        });
        
        let text = temp.textContent || temp.innerText || '';
        
        // Remove duplicate spaces and clean up spacing
        text = text.replace(/\n\s*\n/g, '\n').trim();
        return text;
    }

    function escapeCSVValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        let stringValue = String(value);
        stringValue = stringValue.replace(/"/g, '""');
        if (/[",\n\r]/.test(stringValue)) {
            return `"${stringValue}"`;
        }
        return stringValue;
    }

    function exportToCSV() {
        if (!state.filteredUpdates || state.filteredUpdates.length === 0) {
            alert("No updates to export!");
            return;
        }

        const headers = ['Date', 'Category', 'Link', 'Description'];
        const rows = state.filteredUpdates.map(item => [
            item.date,
            item.category,
            item.link,
            stripHtmlTags(item.body)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSVValue).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
