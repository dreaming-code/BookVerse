/**
 * BookVerse Router - Dynamic Navigation & User Features
 * Handles sidebar routing, section toggling, auth checks, favorites, and continue reading
 */

(function() {
  'use strict';

  // ==================== CONFIGURATION ====================
  const ROUTES = {
    home: {
      sections: ['search', 'best-books', 'popular-books', 'list_books', 'list_books_rel', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false,
      headers: ['fea', 'rel']
    },
    search: {
      sections: ['search', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false
    },
    featured: {
      sections: ['search', 'list_books', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false,
      headers: ['fea']
    },
    'new-releases': {
      sections: ['search', 'list_books_rel', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false,
      headers: ['rel']
    },
    'continue-reading': {
      sections: ['search', 'list_books_stash', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false,
      headers: ['stash']
    },
    favorites: {
      sections: ['search', 'list_books_fav', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false,
      headers: ['fav']
    },
    about: {
      sections: ['search', 'best-books', 'popular-books', 'about', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false
    },
    contact: {
      sections: ['search', 'contact', 'footer'],
      showLogin: false,
      requiresAuth: false
    },
    account: {
      sections: ['dashboard', 'about', 'contact', 'footer'],
      showLogin: true,
      requiresAuth: true,
      fallbackRoute: 'login'
    },
    login: {
      sections: ['login', 'signUp'],
      showLogin: false,
      requiresAuth: false,
      hideSidebar: false
    },
    admin: {
      sections: ['admin'],
      showLogin: false,
      requiresAuth: true,
      requiresAdmin: true,
      fallbackRoute: 'home'
    }
  };

  // Section ID mappings
  const SECTION_MAP = {
    'search': 'search',
    'best-books': 'best-books',
    'popular-books': 'popular-books',
    'about': 'about',
    'contact': 'contact',
    'footer': 'footer',
    'list_books': 'list_books',
    'list_books_rel': 'list_books_rel',
    'list_books_stash': 'list_books_stash',
    'list_books_fav': 'list_books_fav',
    'dashboard': 'dashboard',
    'login': 'login',
    'signUp': 'signUp',
    'admin': 'admin',
    'map': 'search'  // alias for compatibility
  };

  // Header ID mappings for section titles
  const HEADER_MAP = {
    'fea': 'Featured Books',
    'rel': 'New Released',
    'stash': 'Stashed Books',
    'fav': 'Favorite Books'
  };

  // ==================== STATE ====================
  const state = {
    currentRoute: 'home',
    isLoggedIn: false,
    user: null,
    favorites: [],
    continueReading: [],
    mobileMenuOpen: false
  };

  // ==================== STORAGE KEYS ====================
  const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
    FAVORITES: 'bookverse_favorites',
    CONTINUE_READING: 'bookverse_continue_reading',
    CURRENT_ROUTE: 'bookverse_current_route'
  };

  // ==================== UTILITY FUNCTIONS ====================
  function getUserId() {
    const user = getUser();
    return user ? (user._id || user.id || 'anonymous') : 'anonymous';
  }

  function getUserKey(baseKey) {
    const userId = getUserId();
    return `${baseKey}_${userId}`;
  }

  function getUser() {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
      return null;
    }
  }

  function isAuthenticated() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return !!token;
  }

  function isAdmin() {
    const user = getUser();
    return user && (user.admin === 'Y' || user.role === 'admin');
  }

  // ==================== FAVORITES MANAGEMENT ====================
  function getFavorites() {
    const userKey = getUserKey(STORAGE_KEYS.FAVORITES);
    try {
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading favorites:', e);
      return [];
    }
  }

  function saveFavorites(favorites) {
    const userKey = getUserKey(STORAGE_KEYS.FAVORITES);
    localStorage.setItem(userKey, JSON.stringify(favorites));
    state.favorites = favorites;
    updateFavoriteIcons();
    renderDashboardFavorites();
  }

  function toggleFavorite(book) {
    const favorites = getFavorites();
    const bookId = book._id || book.id || book.externalId || book.title;
    const existingIndex = favorites.findIndex(f => 
      (f._id || f.id || f.externalId || f.title) === bookId
    );

    if (existingIndex > -1) {
      favorites.splice(existingIndex, 1);
    } else {
      favorites.push({
        ...book,
        addedAt: Date.now()
      });
    }

    saveFavorites(favorites);
    return existingIndex === -1; // returns true if added, false if removed
  }

  function isBookFavorite(book) {
    const favorites = getFavorites();
    const bookId = book._id || book.id || book.externalId || book.title;
    return favorites.some(f => 
      (f._id || f.id || f.externalId || f.title) === bookId
    );
  }

  function updateFavoriteIcons() {
    document.querySelectorAll('.book-fav-btn').forEach(btn => {
      const bookId = btn.dataset.bookId;
      const favorites = getFavorites();
      const isFav = favorites.some(f => 
        (f._id || f.id || f.externalId || f.title) === bookId
      );
      btn.classList.toggle('active', isFav);
      btn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    });
  }

  // ==================== CONTINUE READING MANAGEMENT ====================
  function getContinueReading() {
    const userKey = getUserKey(STORAGE_KEYS.CONTINUE_READING);
    try {
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading continue reading:', e);
      return [];
    }
  }

  function addToContinueReading(book, source = 'catalog') {
    const userKey = getUserKey(STORAGE_KEYS.CONTINUE_READING);
    let books = getContinueReading();
    
    const bookId = book._id || book.id || book.externalId || book.title;
    
    // Remove if already exists
    books = books.filter(b => 
      (b._id || b.id || b.externalId || b.title) !== bookId
    );
    
    // Add to beginning
    books.unshift({
      ...book,
      lastOpenedAt: Date.now(),
      source: source
    });
    
    // Keep only last 20
    books = books.slice(0, 20);
    
    localStorage.setItem(userKey, JSON.stringify(books));
    state.continueReading = books;
    renderDashboardContinueReading();
    
    // Also update the stash section if it exists
    renderStashSection();
  }

  function removeFromContinueReading(bookId) {
    const userKey = getUserKey(STORAGE_KEYS.CONTINUE_READING);
    let books = getContinueReading();
    books = books.filter(b => 
      (b._id || b.id || b.externalId || b.title) !== bookId
    );
    localStorage.setItem(userKey, JSON.stringify(books));
    state.continueReading = books;
    renderDashboardContinueReading();
    renderStashSection();
  }

  // ==================== RENDER FUNCTIONS ====================
  function renderDashboardFavorites() {
    const container = document.getElementById('dashboardFavorites');
    if (!container) return;
    
    const favorites = getFavorites();
    container.innerHTML = '';
    
    if (favorites.length === 0) {
      container.innerHTML = '<p style="color: #888; width: 100%;">No favorite books yet. Click the heart icon on any book to add it here.</p>';
      return;
    }
    
    favorites.forEach(book => {
      const bookEl = createDashboardBookElement(book, 'favorite');
      container.appendChild(bookEl);
    });
  }

  function renderDashboardContinueReading() {
    const container = document.getElementById('dashboardContinueReading');
    if (!container) return;
    
    const books = getContinueReading();
    container.innerHTML = '';
    
    if (books.length === 0) {
      container.innerHTML = '<p style="color: #888; width: 100%;">No books in continue reading. Start reading a book to see it here!</p>';
      return;
    }
    
    books.forEach(book => {
      const bookEl = createDashboardBookElement(book, 'continue');
      container.appendChild(bookEl);
    });
  }

  function renderStashSection() {
    const container = document.getElementById('list_books_stash');
    if (!container) return;
    
    const books = getContinueReading();
    container.innerHTML = '';
    
    if (books.length === 0) {
      container.innerHTML = '<p style="color: #888;">No books in your reading list yet.</p>';
      return;
    }
    
    books.forEach(book => {
      const bookEl = createDashboardBookElement(book, 'stash');
      container.appendChild(bookEl);
    });
  }

  function createDashboardBookElement(book, type) {
    const div = document.createElement('div');
    div.className = 'book';
    div.dataset.name = book.title;
    div.dataset.author = book.author;
    div.dataset.id = book._id || '';
    
    const img = document.createElement('img');
    img.src = book.coverUrl || book.cover || 'https://via.placeholder.com/150?text=No+Cover';
    img.alt = book.title;
    
    // Add favorite button
    const favBtn = document.createElement('button');
    favBtn.className = 'book-fav-btn';
    favBtn.dataset.bookId = book._id || book.id || book.externalId || book.title;
    const isFav = isBookFavorite(book);
    favBtn.classList.toggle('active', isFav);
    favBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(book);
    });
    
    img.addEventListener('click', () => handleBookClick(book));
    
    div.appendChild(img);
    div.appendChild(favBtn);
    
    return div;
  }

  // ==================== LOGOUT ====================
  function logout() {
    const userId = getUserId();
    
    // Clear user-specific localStorage data
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(`${STORAGE_KEYS.FAVORITES}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.CONTINUE_READING}_${userId}`);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUTE);
  }

// ==================== GOOGLE OAUTH HANDLER ====================
function handleGoogleAuthRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const authType = urlParams.get('auth');
  const token = urlParams.get('token');
  const userData = urlParams.get('user');
  
  if (authType === 'google' && token && userData) {
    try {
      const user = JSON.parse(decodeURIComponent(userData));
      
      // Store token and user data
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      
      // Update state
      state.isLoggedIn = true;
      state.user = user;
      state.favorites = getFavorites();
      state.continueReading = getContinueReading();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Navigate to home or intended route
      const intendedRoute = sessionStorage.getItem('intendedRoute');
      if (intendedRoute) {
        sessionStorage.removeItem('intendedRoute');
        navigateTo(intendedRoute);
      } else {
        navigateTo('home');
      }
      
      console.log('Google OAuth login successful');
      return true;
    } catch (err) {
      console.error('Error handling Google OAuth redirect:', err);
      return false;
    }
  }
  return false;
}
  // ==================== AUTHENTICATION CHECKS ====================
  function handleBookClick(book, source = 'catalog') {
    if (!isAuthenticated()) {
      // Store intended book for after login
      sessionStorage.setItem('intendedBook', JSON.stringify(book));
      navigateTo('login');
      return;
    }
    
    // Add to continue reading
    addToContinueReading(book, source);
    
    // Open book details
    if (typeof openBookDetails === 'function') {
      openBookDetails(book, source);
    } else {
      // Fallback navigation
      window.location.href = `book-details.html?id=${book._id || ''}`;
    }
  }

  function handleAccountClick() {
    if (!isAuthenticated()) {
      navigateTo('login');
    } else {
      navigateTo('account');
    }
  }

  // ==================== NAVIGATION ====================
  function navigateTo(routeName) {
    const route = ROUTES[routeName];
    if (!route) {
      console.error('Unknown route:', routeName);
      return;
    }

    // Check auth requirements
    if (route.requiresAuth && !isAuthenticated()) {
      sessionStorage.setItem('intendedRoute', routeName);
      navigateTo('login');
      return;
    }

    // Check admin requirements
    if (route.requiresAdmin && !isAdmin()) {
      navigateTo(route.fallbackRoute || 'home');
      return;
    }

    // Update state
    state.currentRoute = routeName;
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROUTE, routeName);

    // Update active sidebar icon
    updateActiveSidebarIcon(routeName);

    // Hide all sections first
    hideAllSections();

    // Show login sections if needed
    if (route.showLogin) {
      showSections(['login', 'signUp']);
      // If logged in, show the actual content instead
      if (isAuthenticated() && routeName === 'account') {
        hideSections(['login', 'signUp']);
        showSections(route.sections);
        renderDashboard();
      }
    } else {
      // Show route sections
      showSections(route.sections);
      
      // Show associated headers
      if (route.headers) {
        route.headers.forEach(headerId => {
          const header = document.getElementById(headerId);
          if (header) {
            header.classList.remove('hide');
          }
          // Also show the parent header element if it exists
          const parentHeader = header?.closest('header');
          if (parentHeader) {
            parentHeader.classList.remove('hide');
          }
        });
      }
    }

    // Show footer and about/contact for most routes
    if (routeName !== 'login' && routeName !== 'admin') {
      const footer = document.getElementById('footer');
      if (footer) footer.style.display = '';
    }

    // Close mobile menu if open
    closeMobileMenu();

    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('routeChange', { detail: { route: routeName } }));
  }

  function hideAllSections() {
    Object.values(SECTION_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hide');
        el.style.display = 'none';
      }
    });
    
    // Also hide headers
    ['fea', 'rel', 'stash', 'fav'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hide');
      }
      const parentHeader = el?.closest('header');
      if (parentHeader) {
        parentHeader.classList.add('hide');
      }
    });
  }

  function hideSections(sectionIds) {
    sectionIds.forEach(id => {
      const el = document.getElementById(SECTION_MAP[id] || id);
      if (el) {
        el.classList.add('hide');
        el.style.display = 'none';
      }
    });
  }

  function showSections(sectionIds) {
    sectionIds.forEach(id => {
      const el = document.getElementById(SECTION_MAP[id] || id);
      if (el) {
        el.classList.remove('hide');
        el.style.display = '';
      }
    });
  }

  function updateActiveSidebarIcon(routeName) {
    document.querySelectorAll('.sidebar .icon').forEach(icon => {
      icon.classList.remove('active');
      if (icon.dataset.route === routeName) {
        icon.classList.add('active');
      }
    });
  }

  function renderDashboard() {
    renderDashboardFavorites();
    renderDashboardContinueReading();
  }

  // ==================== MOBILE MENU ====================
  function toggleMobileMenu() {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (state.mobileMenuOpen) {
      sidebar.classList.add('active');
      if (overlay) overlay.classList.add('active');
    } else {
      sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
    }
  }

  function closeMobileMenu() {
    state.mobileMenuOpen = false;
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
  }

  // ==================== EVENT HANDLERS ====================
  function setupEventListeners() {
    // Sidebar navigation clicks
    document.querySelectorAll('.sidebar .icon, .sidebar [data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const route = el.dataset.route;
        if (route) {
          if (route === 'account') {
            handleAccountClick();
          } else {
            navigateTo(route);
          }
        }
      });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      const mobileBtn = document.getElementById('mobileMenuBtn');
      
      if (state.mobileMenuOpen && 
          !sidebar?.contains(e.target) && 
          !mobileBtn?.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileMenu();
      }
    });

    // Handle book clicks with auth check
    document.addEventListener('click', (e) => {
      const bookEl = e.target.closest('.book');
      if (bookEl && !e.target.closest('.book-fav-btn')) {
        const book = {
          _id: bookEl.dataset.id,
          title: bookEl.dataset.name,
          author: bookEl.dataset.author,
          genre: bookEl.dataset.genre,
          coverUrl: bookEl.dataset.cover || bookEl.querySelector('img')?.src,
          fileUrl: bookEl.dataset.url,
          description: bookEl.dataset.description
        };
        
        // Only handle if it's not already handled by the existing click handler
        if (!bookEl.dataset.hasClickHandler) {
          // Let the existing handler work if it exists
          // This is a backup for dynamically added books
        }
      }
    });
  }

    // ==================== INITIALIZATION ====================
  function init() {
    // Handle Google OAuth redirect first
    if (handleGoogleAuthRedirect()) {
      return; // Google auth handled, skip normal init
    }
    
    // Load state
    state.isLoggedIn = isAuthenticated();
    state.user = getUser();
    state.favorites = getFavorites();
    state.continueReading = getContinueReading();

    // Create overlay element for mobile
    if (!document.getElementById('sidebarOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', closeMobileMenu);
      document.body.appendChild(overlay);
    }

    // Setup event listeners
    setupEventListeners();

    // Check for intended route after login
    const intendedRoute = sessionStorage.getItem('intendedRoute');
    const intendedBook = sessionStorage.getItem('intendedBook');
    
    if (isAuthenticated() && intendedRoute) {
      sessionStorage.removeItem('intendedRoute');
      navigateTo(intendedRoute);
    } else if (isAuthenticated() && intendedBook) {
      const book = JSON.parse(intendedBook);
      sessionStorage.removeItem('intendedBook');
      handleBookClick(book);
    } else {
      // Navigate to saved route or default
      const savedRoute = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE);
      if (savedRoute && ROUTES[savedRoute]) {
        navigateTo(savedRoute);
      } else {
        navigateTo('home');
      }
    }

    // Render initial dashboard if on account page
    if (state.currentRoute === 'account') {
      renderDashboard();
    }

  // Setup dashboard logout button
    const dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');
    if (dashboardLogoutBtn) {
      dashboardLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }

    console.log('BookVerse Router initialized');
  }

  // ==================== PUBLIC API ====================
  window.BookVerseRouter = {
    navigate: navigateTo,
    getCurrentRoute: () => state.currentRoute,
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin,
    getUser: getUser,
    toggleFavorite: toggleFavorite,
    isBookFavorite: isBookFavorite,
    addToContinueReading: addToContinueReading,
    getFavorites: getFavorites,
    getContinueReading: getContinueReading,
    handleBookClick: handleBookClick,
    refreshDashboard: renderDashboard,
    logout: logout
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
