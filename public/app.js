/* ============================================================
   ChatSphere - Community Chat Application
   ============================================================ */
const API_BASE = "http://localhost:5078/api/chat";


const App = (() => {
  // --------------- DATA LAYER ---------------
  const DB = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(`cs_${key}`)); }
      catch { return null; }
    },
    set(key, val) { localStorage.setItem(`cs_${key}`, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(`cs_${key}`); }
  };

  async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users`);
  const data = await res.json();

  if (!data.success) return [];

  DB.set("users", data.users);

  return data.users;
}
async function saveChat(chats) {

  try {

    for (const chat of chats) {

      await fetch(`${API_BASE}/chats`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(chat)
      });
    }

    DB.set("chats", chats);

  } catch (err) {

    console.error("saveChat error:", err);
  }
}
async function fetchChats(userId) {
  const res = await fetch(`${API_BASE}/chats/${userId}`);

  const data = await res.json();

  if (!data.success) return [];

  DB.set("chats", data.chats);

  return data.chats;
}
async function saveUsers(users) {

  try {

    for (const user of users) {

      await fetch(
        "http://localhost:5078/api/users/sync",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(user)
        }
      );
    }

    DB.set("users", users);

  } catch (err) {

    console.error("saveUsers error:", err);
  }
}
function getUsers() {
  return DB.get("users") || [];
}

function getChats() {
  return DB.get("chats") || [];
}

async function createChat(chat) {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(chat)
  });

  return await res.json();
}

async function sendMessageToServer(chatId, message) {
  const res = await fetch(
    `${API_BASE}/messages/${chatId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    }
  );

  return await res.json();
}
  function getCurrentUser() { return DB.get('currentUser'); }
  function setCurrentUser(user) { DB.set('currentUser', user); }
  function clearCurrentUser() { DB.remove('currentUser'); }
  function getReadMap() { return DB.get('readMap') || {}; }
  function saveReadMap(map) { DB.set('readMap', map); }

  function markAsRead(chatId, userId) {
    const map = getReadMap();
    map[`${chatId}:${userId}`] = Date.now();
    saveReadMap(map);
  }

  function getUnreadCount(chat, userId) {
    if (!chat.members.includes(userId)) return 0;
    const map = getReadMap();
    const lastRead = map[`${chat.id}:${userId}`] || 0;
    return chat.messages.filter(m =>
      m.type !== 'system' && m.senderId !== userId && m.timestamp > lastRead
    ).length;
  }

  function uuid() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  }

  // --------------- STATE ---------------
  let currentChatId = null;
  let selectedMembers = new Set();
  let addMembersSet = new Set();
  let groupAvatarData = null;
  let currentTab = 'chats';

  // --------------- EMOJI DATA ---------------
  const EMOJIS = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
    '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
    '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢',
    '🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏',
    '😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷',
    '🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠',
    '🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮',
    '😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥',
    '😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱',
    '😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡',
    '👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻',
    '😼','😽','🙀','😿','😾','🙈','🙉','🙊','💋','💌',
    '💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔',
    '❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💯',
    '💢','💥','💫','💦','💨','🕳️','💣','💬','👋','🤚',
    '🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏',
    '✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕',
    '👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏',
    '🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪',
    '🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴',
    '👀','👁️','👅','👄','🫦','👶','🧒','👦','👧','🧑',
    '🔥','⭐','🌟','✨','⚡','🎉','🎊','🎈','🎁','🏆'
  ];

  // --------------- DOM REFS ---------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    authScreen: $('#authScreen'),
    appScreen: $('#appScreen'),
    loginForm: $('#loginForm'),
    signupForm: $('#signupForm'),
    loginUsername: $('#loginUsername'),
    loginPassword: $('#loginPassword'),
    signupName: $('#signupName'),
    signupUsername: $('#signupUsername'),
    signupPassword: $('#signupPassword'),
    showSignup: $('#showSignup'),
    showLogin: $('#showLogin'),
    authError: $('#authError'),

    sidebarAvatar: $('#sidebarAvatar'),
    sidebarName: $('#sidebarName'),
    searchChats: $('#searchChats'),
    conversationsList: $('#conversationsList'),

    emptyState: $('#emptyState'),
    activeChat: $('#activeChat'),
    chatAvatar: $('#chatAvatar'),
    chatName: $('#chatName'),
    chatStatus: $('#chatStatus'),
    messagesContainer: $('#messagesContainer'),
    messageInput: $('#messageInput'),

    emojiPicker: $('#emojiPicker'),
    emojiGrid: $('#emojiGrid'),
    emojiSearch: $('#emojiSearch'),

    infoPanel: $('#infoPanel'),
    infoPanelContent: $('#infoPanelContent'),

    fileInput: $('#fileInput'),
    toastContainer: $('#toastContainer'),

    modalCreateGroup: $('#modalCreateGroup'),
    groupName: $('#groupName'),
    groupAvatarPreview: $('#groupAvatarPreview'),
    groupAvatarInput: $('#groupAvatarInput'),
    searchMembers: $('#searchMembers'),
    membersSelectList: $('#membersSelectList'),
    selectedMembersEl: $('#selectedMembers'),

    modalAllUsers: $('#modalAllUsers'),
    searchAllUsers: $('#searchAllUsers'),
    allUsersList: $('#allUsersList'),

    modalProfile: $('#modalProfile'),
    profileAvatarPreview: $('#profileAvatarPreview'),
    profileAvatarInput: $('#profileAvatarInput'),
    profileDisplayName: $('#profileDisplayName'),
    profileStatus: $('#profileStatus'),

    modalAddMembers: $('#modalAddMembers'),
    searchAddMembers: $('#searchAddMembers'),
    addMembersSelectList: $('#addMembersSelectList'),
    addSelectedMembers: $('#addSelectedMembers'),

    imageViewer: $('#imageViewer'),
    viewerImage: $('#viewerImage'),
  };

  // --------------- HELPERS ---------------
  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function renderAvatar(data, name, extraClass = '') {
    if (data) {
      return `<div class="avatar ${extraClass}"><img src="${data}" alt="${name}"></div>`;
    }
    return `<div class="avatar ${extraClass}">${getInitials(name || '?')}</div>`;
  }

  function setAvatarEl(el, data, name) {
    if (data) {
      el.innerHTML = `<img src="${data}" alt="${name}">`;
    } else {
      el.textContent = getInitials(name || '?');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --------------- AUTH ---------------
  function handleGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const auth = urlParams.get("auth");
    const tokenParam = urlParams.get("token");
    const userParam = urlParams.get("user");
    
    if (auth === "google" && tokenParam && userParam) {
      try {
        const libraryUser = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem("token", decodeURIComponent(tokenParam));
        localStorage.setItem("user", JSON.stringify(libraryUser));
        
        // Create or update ChatSphere user
        let users = getUsers();
        let chatUser = users.find(u => u.username === libraryUser.email.toLowerCase());
        
        if (!chatUser) {
          chatUser = {
            id: uuid(),
            username: libraryUser.email.toLowerCase(),
            password: null,
            displayName: libraryUser.name,
            avatar: null,
            status: 'Hey there! I am using ChatSphere',
            createdAt: Date.now()
          };
          users.push(chatUser);
          saveUsers(users);
        }
        
        setCurrentUser(chatUser);
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showApp();
        return true;
      } catch (err) {
        console.error("Error handling Google callback:", err);
      }
    }
    return false;
  }
  
  function initAuth() {
    // First check Google callback
    if (handleGoogleCallback()) {
      return;
    }
    
    // Check if we have a library user in localStorage
    const libraryUserStr = localStorage.getItem("user");
    if (libraryUserStr) {
      try {
        const libraryUser = JSON.parse(libraryUserStr);
        let users = getUsers();
        let chatUser = users.find(u => u.username === libraryUser.email.toLowerCase());
        
        if (!chatUser) {
          chatUser = {
            id: uuid(),
            username: libraryUser.email.toLowerCase(),
            password: null,
            displayName: libraryUser.name,
            avatar: null,
            status: 'Hey there! I am using ChatSphere',
            createdAt: Date.now()
          };
          users.push(chatUser);
          saveUsers(users);
        }
        
        setCurrentUser(chatUser);
        showApp();
        return;
      } catch (err) {
        console.error("Error using library user:", err);
      }
    }
    
    const user = getCurrentUser();
    if (user) {
      const users = getUsers();
      const found = users.find(u => u.id === user.id);
      if (found) {
        setCurrentUser(found);
        showApp();
        return;
      }
    }
    showAuth();
  }

  function showAuth() {
    dom.authScreen.classList.remove('hidden');
    dom.appScreen.classList.add('hidden');
  }

 async function showApp() {

  dom.authScreen.classList.add('hidden');

  dom.appScreen.classList.remove('hidden');

  let user = getCurrentUser();

  // FETCH USERS FROM DB
  await fetchUsers();

  // GET FRESH USERS
  const users = getUsers();

  // FIND CURRENT USER FROM DB DATA
  const freshUser = users.find(
    u => u.id === user.id
  );

  // UPDATE LOCAL CURRENT USER
  if (freshUser) {

    setCurrentUser(freshUser);

    user = freshUser;
  }

  // FETCH CHATS
  await fetchChats(user.id);

  renderSidebar();

  renderConversations();
}

  function handleLogin(e) {
    e.preventDefault();
    const username = dom.loginUsername.value.trim().toLowerCase();
    const password = dom.loginPassword.value;
    if (!username || !password) return showAuthError('Please fill all fields');

    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user) return showAuthError('User not found. Please sign up.');
    if (user.password !== password) return showAuthError('Incorrect password');

    setCurrentUser(user);
    dom.loginForm.reset();
    showApp();
  }

  function handleSignup(e) {
    e.preventDefault();
    const displayName = dom.signupName.value.trim();
    const username = dom.signupUsername.value.trim().toLowerCase();
    const password = dom.signupPassword.value;

    if (!displayName || !username || !password) return showAuthError('Please fill all fields');
    if (username.length < 3) return showAuthError('Username must be at least 3 characters');
    if (password.length < 4) return showAuthError('Password must be at least 4 characters');

    const users = getUsers();
    if (users.find(u => u.username === username)) return showAuthError('Username already taken');

    const newUser = {
      id: uuid(),
      username,
      password,
      displayName,
      avatar: null,
      status: 'Hey there! I am using ChatSphere',
      createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    dom.signupForm.reset();
    showToast('Account created successfully!', 'success');
    showApp();
  }

  function showAuthError(msg) {
    dom.authError.textContent = msg;
    setTimeout(() => dom.authError.textContent = '', 3000);
  }

  function handleLogout() {
    setTimeout(() => {
    window.location.href = "library.html#map";
  }, 1500);
  }

  // --------------- SIDEBAR ---------------
  function renderSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    setAvatarEl(dom.sidebarAvatar, user.avatar, user.displayName);
    dom.sidebarName.textContent = user.displayName;
  }

  async function renderConversations(search = '') {

  const user = getCurrentUser();

  if (!user) return;

  const chats = await fetchChats(user.id);

  const users = getUsers();

  const query = search.toLowerCase();

  let filtered = chats.filter(c => {

    // ---------------- DIRECT CHATS ----------------
    if (currentTab === 'chats') {

      return (
        c.type === 'direct' &&
        c.members.includes(user.id)
      );
    }

    // ---------------- GROUPS ----------------
    if (currentTab === 'groups') {

      if (c.type !== 'group') return false;

      const isMember = c.members.includes(user.id);

      // PRIVATE GROUP
      if (!c.isPublic) {

        // ONLY MEMBERS CAN SEE
        if (!isMember) return false;
      }

      // SEARCH FILTER
      if (query) {

        const name = getChatDisplayName(c, user, users);

        return name.toLowerCase().includes(query);
      }

      return true;
    }

    return true;
  });

  // SORT
  filtered.sort((a, b) => {

    const aUnread = getUnreadCount(a, user.id);

    const bUnread = getUnreadCount(b, user.id);

    if (aUnread > 0 && bUnread === 0) return -1;

    if (aUnread === 0 && bUnread > 0) return 1;

    const aLast =
      a.messages.length
        ? a.messages[a.messages.length - 1].timestamp
        : a.createdAt;

    const bLast =
      b.messages.length
        ? b.messages[b.messages.length - 1].timestamp
        : b.createdAt;

    return bLast - aLast;
  });

  // EMPTY STATE
  if (filtered.length === 0) {

    dom.conversationsList.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">

        <p>
          ${
            currentTab === 'groups'
              ? 'No groups available'
              : 'No conversations yet'
          }
        </p>

      </div>
    `;

    return;
  }

  // RENDER
  dom.conversationsList.innerHTML = filtered.map(chat => {

    const isMember = chat.members.includes(user.id);

    const name = getChatDisplayName(chat, user, users);

    const avatar = getChatAvatar(chat, user, users);

    const lastMsg =
      chat.messages.length
        ? chat.messages[chat.messages.length - 1]
        : null;

    const unread = getUnreadCount(chat, user.id);

    let preview = '';

    if (lastMsg) {

      const sender =
        lastMsg.senderId === user.id
          ? 'You'
          : getUserName(lastMsg.senderId, users);

      if (lastMsg.type === 'file') {
        preview = `${sender}: 📎 ${lastMsg.fileName}`;
      }

      else if (lastMsg.type === 'image') {
        preview = `${sender}: 📷 Photo`;
      }

      else if (lastMsg.type === 'system') {
        preview = lastMsg.content;
      }

      else {
        preview = `${sender}: ${lastMsg.content}`;
      }
    }

    const time =
      lastMsg
        ? formatTime(lastMsg.timestamp)
        : '';

    const isActive = chat.id === currentChatId;

    let badges = '';

    if (chat.type === 'group') {

      badges += `
        <span class="group-badge">
          ${chat.isPublic ? 'Public' : 'Private'}
        </span>
      `;

      if (chat.isPublic && !isMember) {

        badges += `
          <span
            class="group-badge"
            style="background:var(--accent);"
          >
            Join
          </span>
        `;
      }
    }

    return `
      <div
        class="conversation-item ${isActive ? 'active' : ''}"
        data-chat-id="${chat.id}"
      >

        ${avatar}

        <div class="conversation-info">

          <div class="conversation-name">

            ${escapeHtml(name)}

            ${badges}

          </div>

          <div class="conversation-last-msg">

            ${
              preview
                ? escapeHtml(preview)
                : '<i>No messages yet</i>'
            }

          </div>

        </div>

        <div class="conversation-meta">

          <span class="conversation-time">
            ${time}
          </span>

          ${
            unread > 0
              ? `<span class="unread-badge">${unread}</span>`
              : ''
          }

        </div>

      </div>
    `;

  }).join('');

  dom.conversationsList
    .querySelectorAll('.conversation-item')
    .forEach(el => {

      el.addEventListener('click', () => {
        openChat(el.dataset.chatId);
      });

    });
}

  function getChatDisplayName(chat, user, users) {
    if (chat.type === 'group') return chat.name;
    const otherId = chat.members.find(id => id !== user.id);
    return getUserName(otherId, users);
  }

  function getChatAvatar(chat, user, users) {
    if (chat.type === 'group') {
      return renderAvatar(chat.avatar, chat.name, 'avatar-sm');
    }
    const otherId = chat.members.find(id => id !== user.id);
    const other = users.find(u => u.id === otherId);
    return renderAvatar(other?.avatar, other?.displayName || '?', 'avatar-sm');
  }

  function getUserName(id, users) {
    const u = users.find(u => u.id === id);
    return u ? u.displayName : 'Unknown';
  }

  // --------------- OPEN CHAT ---------------
 function openChat(chatId) {

  currentChatId = chatId;

  const user = getCurrentUser();

  const chat = getChats().find(c => c.id === chatId);

  if (!chat) return;

  const isMember = chat.members.includes(user.id);

  // BLOCK PRIVATE GROUP ACCESS
  if (
    chat.type === 'group' &&
    !chat.isPublic &&
    !isMember
  ) {

    showToast(
      'This is a private group',
      'error'
    );

    return;
  }

  // MARK AS READ IMMEDIATELY
  markAsRead(chatId, user.id);

  dom.emptyState.classList.add('hidden');

  dom.activeChat.classList.remove('hidden');

  dom.appScreen.classList.add('chat-open');

  const inputArea = $('.chat-input-area');

  const joinBar = $('#joinGroupBar');

  // PUBLIC GROUP NOT JOINED
  if (
    chat.type === 'group' &&
    chat.isPublic &&
    !isMember
  ) {

    inputArea.classList.add('hidden');

    joinBar.classList.remove('hidden');
  }

  else {

    inputArea.classList.remove('hidden');

    joinBar.classList.add('hidden');
  }

  renderChatHeader();

  renderMessages();

  // RERENDER AFTER READ UPDATE
  renderConversations(dom.searchChats.value);

  if (isMember) {

    setTimeout(() => {
      dom.messageInput.focus();
    }, 50);
  }
}

  function closeChat() {
    currentChatId = null;
    dom.emptyState.classList.remove('hidden');
    dom.activeChat.classList.add('hidden');
    dom.infoPanel.classList.add('hidden');
    dom.appScreen.classList.remove('chat-open');
    renderConversations(dom.searchChats.value);
  }

  function renderChatHeader() {
    const chat = getChats().find(c => c.id === currentChatId);
    if (!chat) return;
    const user = getCurrentUser();
    const users = getUsers();
    const name = getChatDisplayName(chat, user, users);

    if (chat.type === 'group') {
      setAvatarEl(dom.chatAvatar, chat.avatar, chat.name);
      dom.chatName.textContent = name;
      const memberNames = chat.members.map(id => getUserName(id, users)).join(', ');
      dom.chatStatus.textContent = `${chat.members.length} members`;
    } else {
      const otherId = chat.members.find(id => id !== user.id);
      const other = users.find(u => u.id === otherId);
      setAvatarEl(dom.chatAvatar, other?.avatar, other?.displayName || '?');
      dom.chatName.textContent = name;
      dom.chatStatus.textContent = other?.status || '';
    }
  }

  // --------------- MESSAGES ---------------
  function renderMessages() {
    const chat = getChats().find(c => c.id === currentChatId);
    if (!chat) return;
    const user = getCurrentUser();
    const users = getUsers();
    let html = '';
    let lastDate = '';

    chat.messages.forEach(msg => {
      const msgDate = formatDate(msg.timestamp);
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        html += `<div class="date-divider"><span>${msgDate}</span></div>`;
      }

      if (msg.type === 'system') {
        html += `<div class="system-message">${escapeHtml(msg.content)}</div>`;
        return;
      }

      const isSent = msg.senderId === user.id;
      const senderName = getUserName(msg.senderId, users);
      const showSender = chat.type === 'group' && !isSent;

      html += `<div class="message-group ${isSent ? 'sent' : 'received'}">`;
      if (showSender) html += `<span class="message-sender">${escapeHtml(senderName)}</span>`;
      html += `<div class="message-bubble">`;

      if (msg.type === 'image') {
        html += `<img class="message-image" src="${msg.fileData}" alt="Shared image" data-viewable="true">`;
      } else if (msg.type === 'file') {
        html += `
          <div class="message-file" data-download="${msg.id}">
            <div class="message-file-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="message-file-info">
              <div class="message-file-name">${escapeHtml(msg.fileName)}</div>
              <div class="message-file-size">${formatFileSize(msg.fileSize)}</div>
            </div>
          </div>`;
      } else {
        html += linkify(escapeHtml(msg.content));
      }

      html += `<span class="message-time">${formatTime(msg.timestamp)}</span>`;
      html += `</div></div>`;
    });

    dom.messagesContainer.innerHTML = html;
    dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

    dom.messagesContainer.querySelectorAll('img[data-viewable]').forEach(img => {
      img.addEventListener('click', () => {
        dom.viewerImage.src = img.src;
        dom.imageViewer.classList.remove('hidden');
      });
    });

    dom.messagesContainer.querySelectorAll('[data-download]').forEach(el => {
      el.addEventListener('click', () => downloadFile(el.dataset.download));
    });
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">$1</a>');
  }

 async function sendMessage() {
  const content = dom.messageInput.value.trim();

  if (!content || !currentChatId) return;

  const user = getCurrentUser();

  const message = {
    id: uuid(),
    senderId: user.id,
    content,
    type: "text",
    timestamp: Date.now()
  };

  await sendMessageToServer(currentChatId, message);

  await fetchChats(user.id);

  dom.messageInput.value = '';

  renderMessages();

  renderConversations(dom.searchChats.value);
}

  function sendFile(file) {
    if (!currentChatId) return;
    const maxSize = 5 * 1024 * 1024; // 5MB limit for localStorage
    if (file.size > maxSize) {
      showToast('File too large. Max 5MB allowed.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const user = getCurrentUser();
      const chats = getChats();
      const chatIdx = chats.findIndex(c => c.id === currentChatId);
      if (chatIdx === -1) return;

      const isImage = file.type.startsWith('image/');
      chats[chatIdx].messages.push({
        id: uuid(),
        senderId: user.id,
        content: '',
        type: isImage ? 'image' : 'file',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: e.target.result,
        timestamp: Date.now()
      });

      await saveChat(chats);
      markAsRead(currentChatId, user.id);
      renderMessages();
      renderConversations(dom.searchChats.value);
      showToast('File sent!', 'success');
    };
    reader.readAsDataURL(file);
  }

  function downloadFile(msgId) {
    const chat = getChats().find(c => c.id === currentChatId);
    if (!chat) return;
    const msg = chat.messages.find(m => m.id === msgId);
    if (!msg || !msg.fileData) return;

    const a = document.createElement('a');
    a.href = msg.fileData;
    a.download = msg.fileName;
    a.click();
  }

  // --------------- DIRECT CHAT ---------------
async function startDirectChat(userId) {

  const user = getCurrentUser();

  if (userId === user.id) return;

  // Always fetch latest chats first
  await fetchChats(user.id);

  let chats = getChats();

  // Find EXACT same direct chat
  let existing = chats.find(c => {

    if (c.type !== "direct") return false;

    if (c.members.length !== 2) return false;

    return (
      c.members.includes(user.id) &&
      c.members.includes(userId)
    );
  });

  // If chat already exists → open same conversation
  if (existing) {

    closeAllModals();

    currentTab = 'chats';

    renderConversations();

    openChat(existing.id);

    return;
  }

  // Create only if not existing
  const newChat = {

    id: uuid(),

    type: "direct",

    name: "",

    avatar: null,

    members: [user.id, userId],

    admins: [],

    messages: [],

    createdBy: user.id,

    createdAt: Date.now()
  };

  await createChat(newChat);

  // Refetch updated chats
  await fetchChats(user.id);

  chats = getChats();

  const createdChat = chats.find(c => c.id === newChat.id);

  closeAllModals();

  currentTab = 'chats';

  renderConversations();

  openChat(createdChat.id);
}

  // --------------- GROUP MANAGEMENT ---------------
  function openCreateGroup() {
    selectedMembers.clear();
    groupAvatarData = null;
    dom.groupName.value = '';
    dom.groupAvatarPreview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`;
    renderMembersSelect();
    dom.modalCreateGroup.classList.remove('hidden');
  }

  function renderMembersSelect(search = '') {
    const user = getCurrentUser();
    const users = getUsers().filter(u => u.id !== user.id);
    const query = search.toLowerCase();
    const filtered = query ? users.filter(u =>
      u.displayName.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    ) : users;

    dom.membersSelectList.innerHTML = filtered.map(u => `
      <div class="member-select-item ${selectedMembers.has(u.id) ? 'selected' : ''}" data-user-id="${u.id}">
        <div class="checkbox"></div>
        ${renderAvatar(u.avatar, u.displayName, 'avatar-xs')}
        <span>${escapeHtml(u.displayName)}</span>
      </div>
    `).join('') || '<p style="color:var(--text-muted);padding:8px;">No users found</p>';

    dom.membersSelectList.querySelectorAll('.member-select-item').forEach(el => {
      el.addEventListener('click', () => {
        const uid = el.dataset.userId;
        if (selectedMembers.has(uid)) selectedMembers.delete(uid);
        else selectedMembers.add(uid);
        renderMembersSelect(search);
        renderSelectedChips();
      });
    });

    renderSelectedChips();
  }

  function renderSelectedChips() {
    const users = getUsers();
    dom.selectedMembersEl.innerHTML = [...selectedMembers].map(id => {
      const u = users.find(u => u.id === id);
      return `
        <div class="selected-member-chip">
          ${renderAvatar(u?.avatar, u?.displayName || '?', 'avatar-xs')}
          <span>${escapeHtml(u?.displayName || '?')}</span>
          <button class="remove-chip" data-user-id="${id}">×</button>
        </div>`;
    }).join('');

    dom.selectedMembersEl.querySelectorAll('.remove-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedMembers.delete(btn.dataset.userId);
        renderMembersSelect(dom.searchMembers.value);
      });
    });
  }

async function createGroup() {

  const name = dom.groupName.value.trim();

  if (!name) {

    return showToast(
      "Please enter group name",
      "error"
    );
  }

  const user = getCurrentUser();

  const selected = [...selectedMembers];

  const isPublic =
    document.getElementById("groupPrivacy").value === "public";

  const group = {

    id: uuid(),

    type: "group",

    name,

    avatar: groupAvatarData,

    // ONLY CREATOR INITIALLY
    members: [user.id],

    // INVITED USERS
    invitedMembers: selected,

    admins: [user.id],

    messages: [],

    createdBy: user.id,

    createdAt: Date.now(),

    isPublic
  };

  // PRIVATE GROUP → auto add invited users
  if (!isPublic) {

    group.members.push(...selected);
  }

  await createChat(group);

  await fetchChats(user.id);

  closeAllModals();

  renderConversations();

  showToast("Group created!", "success");
}

 async function addMembersToGroup() {
    if (!currentChatId) return;
    const chats = getChats();
    const chatIdx = chats.findIndex(c => c.id === currentChatId);
    if (chatIdx === -1) return;
    const chat = chats[chatIdx];
    const user = getCurrentUser();

    const newMembers = [...addMembersSet].filter(id => !chat.members.includes(id));
    if (newMembers.length === 0) return showToast('No new members selected', 'error');

    const users = getUsers();
    newMembers.forEach(id => {
      chat.members.push(id);
      const name = getUserName(id, users);
      chat.messages.push({
        id: uuid(),
        senderId: user.id,
        content: `${user.displayName} added ${name}`,
        type: 'system',
        timestamp: Date.now()
      });
    });

    await saveChat([chat]);
    closeAllModals();
    renderMessages();
    renderChatHeader();
    renderInfoPanel();
    renderConversations(dom.searchChats.value);
    showToast(`${newMembers.length} member(s) added`, 'success');
  }

 async function removeMember(memberId) {
    if (!currentChatId) return;
    const chats = getChats();
    const chatIdx = chats.findIndex(c => c.id === currentChatId);
    if (chatIdx === -1) return;
    const chat = chats[chatIdx];
    const user = getCurrentUser();

    if (!chat.admins.includes(user.id)) return showToast('Only admins can remove members', 'error');
    if (memberId === chat.createdBy) return showToast('Cannot remove the group creator', 'error');

    chat.members = chat.members.filter(id => id !== memberId);
    chat.admins = chat.admins.filter(id => id !== memberId);

    const users = getUsers();
    const removedName = getUserName(memberId, users);
    chat.messages.push({
      id: uuid(),
      senderId: user.id,
      content: `${user.displayName} removed ${removedName}`,
      type: 'system',
      timestamp: Date.now()
    });

    await saveChat([chat]);
    renderMessages();
    renderChatHeader();
    renderInfoPanel();
    renderConversations(dom.searchChats.value);
    showToast(`${removedName} removed from group`, 'success');
  }

  async function makeAdmin(memberId) {
    if (!currentChatId) return;
    const chats = getChats();
    const chatIdx = chats.findIndex(c => c.id === currentChatId);
    if (chatIdx === -1) return;
    const chat = chats[chatIdx];
    const user = getCurrentUser();

    if (!chat.admins.includes(user.id)) return showToast('Only admins can manage roles', 'error');
    if (chat.admins.includes(memberId)) return showToast('Already an admin', 'error');

    chat.admins.push(memberId);

    const users = getUsers();
    const name = getUserName(memberId, users);
    chat.messages.push({
      id: uuid(),
      senderId: user.id,
      content: `${user.displayName} made ${name} an admin`,
      type: 'system',
      timestamp: Date.now()
    });

    await saveChat([chat]);
    renderMessages();
    renderInfoPanel();
    renderConversations(dom.searchChats.value);
    showToast(`${name} is now an admin`, 'success');
  }

  async function removeAdmin(memberId) {
    if (!currentChatId) return;
    const chats = getChats();
    const chatIdx = chats.findIndex(c => c.id === currentChatId);
    if (chatIdx === -1) return;
    const chat = chats[chatIdx];
    const user = getCurrentUser();

    if (!chat.admins.includes(user.id)) return showToast('Only admins can manage roles', 'error');
    if (memberId === chat.createdBy) return showToast('Cannot remove creator as admin', 'error');

    chat.admins = chat.admins.filter(id => id !== memberId);

    const users = getUsers();
    const name = getUserName(memberId, users);
    chat.messages.push({
      id: uuid(),
      senderId: user.id,
      content: `${user.displayName} removed ${name} as admin`,
      type: 'system',
      timestamp: Date.now()
    });

    await saveChat([chat]);
    renderMessages();
    renderInfoPanel();
    renderConversations(dom.searchChats.value);
    showToast(`${name} is no longer an admin`, 'info');
  }

async function leaveGroup() {

  if (!currentChatId) return;

  const user = getCurrentUser();

  let chats = getChats();

  const chatIndex = chats.findIndex(c => c.id === currentChatId);

  if (chatIndex === -1) return;

  let chat = chats[chatIndex];

  // Remove member
  chat.members = chat.members.filter(id => id !== user.id);

  // Remove admin
  chat.admins = chat.admins.filter(id => id !== user.id);

  // System message
  chat.messages.push({
    id: uuid(),
    senderId: user.id,
    content: `${user.displayName} left the group`,
    type: "system",
    timestamp: Date.now()
  });

  // Save updated chat
  await saveChat([chat]);

  // Fetch fresh chats
  const updatedChats = await fetchChats(user.id);

  DB.set("chats", updatedChats);

  // Reopen fresh chat
  openChat(currentChatId);

  renderInfoPanel();

  renderConversations();

  showToast("You left the group", "info");
}

async function joinGroup() {

  if (!currentChatId) return;

  const user = getCurrentUser();

  let chats = getChats();

  const chatIndex = chats.findIndex(c => c.id === currentChatId);

  if (chatIndex === -1) return;

  let chat = chats[chatIndex];

  if (chat.members.includes(user.id)) return;

  // Add member
  chat.members.push(user.id);

  // System message
  chat.messages.push({
    id: uuid(),
    senderId: user.id,
    content: `${user.displayName} joined the group`,
    type: "system",
    timestamp: Date.now()
  });

  // Save updated chat
  await saveChat([chat]);

  // Fetch fresh chats
  const updatedChats = await fetchChats(user.id);

  DB.set("chats", updatedChats);

  // Reopen fresh chat
  openChat(currentChatId);

  renderInfoPanel();

  renderConversations();

  showToast("You joined the group!", "success");
}

  // --------------- INFO PANEL ---------------
  function toggleInfoPanel() {
    dom.infoPanel.classList.toggle('hidden');
    if (!dom.infoPanel.classList.contains('hidden')) {
      renderInfoPanel();
    }
  }

 function renderInfoPanel() {
  const chat = getChats().find(c => c.id === currentChatId);
  if (!chat) return;

  const user = getCurrentUser();
  const users = getUsers();

  if (chat.type === 'direct') {

    const otherId = chat.members.find(id => id !== user.id);
    const other = users.find(u => u.id === otherId);

    dom.infoPanelContent.innerHTML = `
      <div class="info-avatar-section">
        ${renderAvatar(other?.avatar, other?.displayName || '?', 'avatar-xl')}
        <h3>${escapeHtml(other?.displayName || 'Unknown')}</h3>
        <p>@${escapeHtml(other?.username || '')}</p>
        <p style="margin-top:8px;">${escapeHtml(other?.status || '')}</p>
      </div>
    `;

  } else {

    const isMember = chat.members.includes(user.id);
    const isAdmin = chat.admins.includes(user.id);

    let membersHtml = chat.members.map(mid => {

      const m = users.find(u => u.id === mid);

      const isCreator = mid === chat.createdBy;
      const isMemberAdmin = chat.admins.includes(mid);
      const isMe = mid === user.id;

      let badges = '';

      if (isCreator) {
        badges += '<span class="badge badge-creator">Creator</span>';
      } else if (isMemberAdmin) {
        badges += '<span class="badge badge-admin">Admin</span>';
      }

      let actions = '';

      if (isAdmin && !isMe) {

        if (!isMemberAdmin) {

          actions += `
            <button title="Make Admin" onclick="App.makeAdmin('${mid}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          `;

        } else if (!isCreator) {

          actions += `
            <button title="Remove Admin" onclick="App.removeAdmin('${mid}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          `;
        }

        if (!isCreator) {

          actions += `
            <button class="danger" title="Remove" onclick="App.removeMember('${mid}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          `;
        }
      }

      return `
        <div class="member-item">

          ${renderAvatar(m?.avatar, m?.displayName || '?', 'avatar-sm')}

          <div class="member-item-info">
            <div class="member-item-name">
              ${escapeHtml(m?.displayName || 'Unknown')}
              ${isMe ? '(You)' : ''}
              ${badges}
            </div>

            <div class="member-item-status">
              @${escapeHtml(m?.username || '')}
            </div>
          </div>

          ${actions ? `<div class="member-actions" style="opacity:1">${actions}</div>` : ''}

        </div>
      `;

    }).join('');

    dom.infoPanelContent.innerHTML = `

      <div class="info-avatar-section">
        ${renderAvatar(chat.avatar, chat.name, 'avatar-xl')}
        <h3>${escapeHtml(chat.name)}</h3>

        <p>
          ${chat.members.length} members ·
          ${chat.isPublic ? 'Public Group' : 'Private Group'}
        </p>
      </div>

      <div class="info-section">

        <div class="info-section-title">

          <span>Members (${chat.members.length})</span>

          ${isAdmin ? '<button id="btnAddMembersPanel">+ Add</button>' : ''}

        </div>

        ${membersHtml}

      </div>

      <div class="info-section">

        ${
          isMember
          ? `
            <button class="info-action-btn danger" id="btnLeaveGroup">

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>

              Leave Group

            </button>
          `
          : chat.isPublic
          ? `
            <button
              class="info-action-btn"
              id="btnJoinGroupPanel"
              style="border-color:var(--success);color:var(--success);"
            >

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>

              Join Group

            </button>
          `
          : `
            <div style="text-align:center;color:var(--text-muted);padding:10px;">
              This is a private group
            </div>
          `
        }

      </div>
    `;

    const addBtn = dom.infoPanelContent.querySelector('#btnAddMembersPanel');
    if (addBtn) {
      addBtn.addEventListener('click', openAddMembers);
    }

    const leaveBtn = dom.infoPanelContent.querySelector('#btnLeaveGroup');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', leaveGroup);
    }

    const joinBtnPanel = dom.infoPanelContent.querySelector('#btnJoinGroupPanel');
    if (joinBtnPanel) {
      joinBtnPanel.addEventListener('click', joinGroup);
    }
  }
}

  // --------------- ADD MEMBERS MODAL ---------------
  function openAddMembers() {
    addMembersSet.clear();
    const chat = getChats().find(c => c.id === currentChatId);
    if (!chat) return;
    renderAddMembersSelect(chat);
    dom.modalAddMembers.classList.remove('hidden');
  }

  function renderAddMembersSelect(chat, search = '') {
    const user = getCurrentUser();
    const users = getUsers().filter(u => u.id !== user.id && !chat.members.includes(u.id));
    const query = search.toLowerCase();
    const filtered = query ? users.filter(u =>
      u.displayName.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    ) : users;

    dom.addMembersSelectList.innerHTML = filtered.map(u => `
      <div class="member-select-item ${addMembersSet.has(u.id) ? 'selected' : ''}" data-user-id="${u.id}">
        <div class="checkbox"></div>
        ${renderAvatar(u.avatar, u.displayName, 'avatar-xs')}
        <span>${escapeHtml(u.displayName)}</span>
      </div>
    `).join('') || '<p style="color:var(--text-muted);padding:8px;">No users available to add</p>';

    dom.addMembersSelectList.querySelectorAll('.member-select-item').forEach(el => {
      el.addEventListener('click', () => {
        const uid = el.dataset.userId;
        if (addMembersSet.has(uid)) addMembersSet.delete(uid);
        else addMembersSet.add(uid);
        renderAddMembersSelect(chat, search);
        renderAddSelectedChips();
      });
    });

    renderAddSelectedChips();
  }

  function renderAddSelectedChips() {
    const users = getUsers();
    dom.addSelectedMembers.innerHTML = [...addMembersSet].map(id => {
      const u = users.find(u => u.id === id);
      return `
        <div class="selected-member-chip">
          ${renderAvatar(u?.avatar, u?.displayName || '?', 'avatar-xs')}
          <span>${escapeHtml(u?.displayName || '?')}</span>
          <button class="remove-chip" data-user-id="${id}">×</button>
        </div>`;
    }).join('');

    dom.addSelectedMembers.querySelectorAll('.remove-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addMembersSet.delete(btn.dataset.userId);
        const chat = getChats().find(c => c.id === currentChatId);
        renderAddMembersSelect(chat, dom.searchAddMembers.value);
      });
    });
  }

  // --------------- ALL USERS ---------------
  function openAllUsers() {
    renderAllUsers();
    dom.modalAllUsers.classList.remove('hidden');
  }

  function renderAllUsers(search = '') {
    const user = getCurrentUser();
    const users = getUsers().filter(u => u.id !== user.id);
    const query = search.toLowerCase();
    const filtered = query ? users.filter(u =>
      u.displayName.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    ) : users;

    dom.allUsersList.innerHTML = filtered.map(u => `
      <div class="user-list-item" data-user-id="${u.id}">
        ${renderAvatar(u.avatar, u.displayName, 'avatar-sm')}
        <div class="user-list-item-info">
          <div class="user-list-item-name">${escapeHtml(u.displayName)}</div>
          <div class="user-list-item-status">@${escapeHtml(u.username)} · ${escapeHtml(u.status || '')}</div>
        </div>
        <button class="btn-secondary btn-sm" onclick="App.startDirectChat('${u.id}')">Chat</button>
      </div>
    `).join('') || '<p style="text-align:center;color:var(--text-muted);padding:20px;">No other users yet. Invite friends to join!</p>';
  }

  // --------------- PROFILE ---------------
  function openProfile() {
    const user = getCurrentUser();
    setAvatarEl(dom.profileAvatarPreview, user.avatar, user.displayName);
    dom.profileDisplayName.value = user.displayName;
    dom.profileStatus.value = user.status || '';
    dom.modalProfile.classList.remove('hidden');
  }

async function saveProfile() {

  const user = getCurrentUser();

  const displayName = dom.profileDisplayName.value.trim();

  const status = dom.profileStatus.value.trim();

  if (!displayName) {

    return showToast(
      'Display name cannot be empty',
      'error'
    );
  }

  const users = getUsers();

  const idx = users.findIndex(u => u.id === user.id);

  if (idx === -1) return;

  // KEEP EXISTING AVATAR
  const updatedUser = {
    ...users[idx],
    displayName,
    status
  };

  // UPDATE LOCAL ARRAY
  users[idx] = updatedUser;

  try {

    // SAVE TO BACKEND
    const res = await fetch(
      "http://localhost:5078/api/users/sync",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(updatedUser)
      }
    );

    const data = await res.json();

    if (!data.success) {

      throw new Error("Failed to save profile");
    }

    // SAVE LOCAL
    DB.set("users", users);

    setCurrentUser(updatedUser);

    renderSidebar();

    closeAllModals();

    showToast(
      'Profile updated!',
      'success'
    );

    if (currentChatId) {

      renderChatHeader();

      renderMessages();
    }

    renderConversations(dom.searchChats.value);

  } catch (err) {

    console.error(err);

    showToast(
      'Failed to save profile',
      'error'
    );
  }
}
  // --------------- EMOJI PICKER ---------------
  function toggleEmojiPicker() {
    dom.emojiPicker.classList.toggle('hidden');
    if (!dom.emojiPicker.classList.contains('hidden')) {
      renderEmojis();
      dom.emojiSearch.value = '';
      dom.emojiSearch.focus();
    }
  }

  function renderEmojis(search = '') {
    const query = search.toLowerCase();
    const filtered = query ? EMOJIS.filter(e => e.includes(query)) : EMOJIS;
    dom.emojiGrid.innerHTML = filtered.map(e =>
      `<button class="emoji-item" data-emoji="${e}">${e}</button>`
    ).join('');

    dom.emojiGrid.querySelectorAll('.emoji-item').forEach(btn => {
      btn.addEventListener('click', () => {
        dom.messageInput.value += btn.dataset.emoji;
        dom.messageInput.focus();
      });
    });
  }

  // --------------- MODALS ---------------
  function closeAllModals() {
    $$('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }

  // --------------- EVENT BINDINGS ---------------
  function bindEvents() {
    // Auth
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.signupForm.addEventListener('submit', handleSignup);

    dom.showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      dom.loginForm.classList.remove('active');
      dom.signupForm.classList.add('active');
      dom.authError.textContent = '';
    });

    dom.showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      dom.signupForm.classList.remove('active');
      dom.loginForm.classList.add('active');
      dom.authError.textContent = '';
    });

    // Sidebar actions
    $('#btnNewGroup').addEventListener('click', openCreateGroup);
    $('#btnAllUsers').addEventListener('click', openAllUsers);
    $('#btnProfile').addEventListener('click', openProfile);
    $('#btnLogout').addEventListener('click', handleLogout);

    // Search
    dom.searchChats.addEventListener('input', () => renderConversations(dom.searchChats.value));

    // Tabs
    $$('.sidebar-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        $$('.sidebar-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderConversations(dom.searchChats.value);
      });
    });

    // Chat
    $('#btnBack').addEventListener('click', closeChat);
    $('#btnChatInfo').addEventListener('click', toggleInfoPanel);
    $('#btnCloseInfo').addEventListener('click', () => dom.infoPanel.classList.add('hidden'));

    // Send message
    $('#btnSend').addEventListener('click', sendMessage);
    dom.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    dom.messageInput.addEventListener('input', () => {
      dom.messageInput.style.height = 'auto';
      dom.messageInput.style.height = Math.min(dom.messageInput.scrollHeight, 120) + 'px';
    });

    // Emoji
    $('#btnEmoji').addEventListener('click', toggleEmojiPicker);
    dom.emojiSearch.addEventListener('input', () => renderEmojis(dom.emojiSearch.value));

    document.addEventListener('click', (e) => {
      if (!dom.emojiPicker.contains(e.target) && e.target !== $('#btnEmoji') && !$('#btnEmoji').contains(e.target)) {
        dom.emojiPicker.classList.add('hidden');
      }
    });

    // File attach
    $('#btnAttach').addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        sendFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Create group
    dom.searchMembers.addEventListener('input', () => renderMembersSelect(dom.searchMembers.value));
    $('#btnGroupAvatar').addEventListener('click', () => dom.groupAvatarInput.click());
    dom.profileAvatarInput.addEventListener('change', (e) => {

  const file = e.target.files[0];

  if (!file) return;

  const img = new Image();

  const reader = new FileReader();

  reader.onload = (event) => {

    img.src = event.target.result;
  };

  img.onload = async () => {

    // CREATE CANVAS
    const canvas = document.createElement('canvas');

    const MAX_WIDTH = 300;

    const scale =
      MAX_WIDTH / img.width;

    canvas.width = MAX_WIDTH;

    canvas.height =
      img.height * scale;

    const ctx =
      canvas.getContext('2d');

    ctx.drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // COMPRESSED IMAGE
    const compressedImage =
      canvas.toDataURL(
        'image/jpeg',
        0.6
      );

    const user = getCurrentUser();

    const users = getUsers();

    const idx =
      users.findIndex(
        u => u.id === user.id
      );

    if (idx === -1) return;

    users[idx].avatar =
      compressedImage;

    try {

      const res = await fetch(
        "http://localhost:5078/api/users/sync",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(users[idx])
        }
      );

      const data =
        await res.json();

      if (!data.success) {

        throw new Error(
          "Avatar sync failed"
        );
      }

      // SAVE LOCAL
      DB.set("users", users);

      setCurrentUser(users[idx]);

      setAvatarEl(
        dom.profileAvatarPreview,
        compressedImage,
        user.displayName
      );

      renderSidebar();

      renderConversations();

      showToast(
        'Avatar updated!',
        'success'
      );

    } catch (err) {

      console.error(err);

      showToast(
        'Failed to update avatar',
        'error'
      );
    }
  };

  reader.readAsDataURL(file);
});
    $('#btnCreateGroup').addEventListener('click', createGroup);

    // All users search
    dom.searchAllUsers.addEventListener('input', () => renderAllUsers(dom.searchAllUsers.value));

    // Profile
    $('#btnChangeAvatar').addEventListener('click', () => dom.profileAvatarInput.click());
    dom.profileAvatarInput.addEventListener('change', async (e) => {

  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (ev) => {

    const user = getCurrentUser();

    const users = getUsers();

    const idx = users.findIndex(u => u.id === user.id);

    if (idx === -1) return;

    users[idx].avatar = ev.target.result;

    try {

      const res = await fetch(
        "http://localhost:5078/api/users/sync",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(users[idx])
        }
      );

      const data = await res.json();

      if (!data.success) {

        throw new Error("Avatar sync failed");
      }

      DB.set("users", users);

      setCurrentUser(users[idx]);

      setAvatarEl(
        dom.profileAvatarPreview,
        ev.target.result,
        user.displayName
      );

      renderSidebar();

      renderConversations();

    } catch (err) {

      console.error(err);

      showToast(
        'Failed to update avatar',
        'error'
      );
    }
  };

  reader.readAsDataURL(file);
});
    $('#btnSaveProfile').addEventListener('click', saveProfile);

    // Add members
    dom.searchAddMembers.addEventListener('input', () => {
      const chat = getChats().find(c => c.id === currentChatId);
      if (chat) renderAddMembersSelect(chat, dom.searchAddMembers.value);
    });
    $('#btnAddMembersConfirm').addEventListener('click', addMembersToGroup);

    // Join group
    $('#btnJoinGroup').addEventListener('click', joinGroup);

    // Image viewer
    $('#btnCloseViewer').addEventListener('click', () => dom.imageViewer.classList.add('hidden'));

    // Modal close buttons
    $$('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        $(`#${modalId}`).classList.add('hidden');
      });
    });

    // Close modals on overlay click
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });

    // Periodic refresh to simulate multi-user
    setInterval(() => {
      renderConversations(dom.searchChats.value);
      if (currentChatId) {
        renderMessages();
      }
    }, 3000);
  }

  // --------------- INIT ---------------
  function init() {
    bindEvents();
    initAuth();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Public API for inline handlers
  return {
    startDirectChat,
    removeMember,
    makeAdmin,
    removeAdmin
  };
})();
