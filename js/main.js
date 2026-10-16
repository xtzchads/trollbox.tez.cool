/**
 * TezTrollBox — On-Chain Tezos Public Chat
 * Contract: KT1Ek4Nxu4XpQykpGLwaNtUJSWKuVpXFUJoy (Mainnet)
 * BigMap: 743755
 */

(function () {
  'use strict';

  const CONTRACT_ADDRESS = 'KT1Ek4Nxu4XpQykpGLwaNtUJSWKuVpXFUJoy';
  const BIGMAP_ID = '743755';
  const RPC_URL = 'https://rpc.tzbeta.net';
  const POLL_INTERVAL_MS = 3000;
  const MAX_MESSAGE_LEN = 280;

  const EMOJI_CATEGORIES = {
    '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
    '🚀': ['🚀','🛸','🌙','⭐','🌟','✨','⚡','🔥','💎','👑','🏆','🎯','🎲','🎮','🎰','📈','📉','💰','💸','🪙','🔮','🧬','🔭','📡','🛡️','⚔️','🧨','🎉','🎊'],
    '👍': ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','🙏','🤝','👏','🙌','👐'],
    '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💯','💢','💥','💫','💦','💨'],
    '🐸': ['🐸','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦅','🦆','🦉','🐺','🦄','🐝','🐛','🦋','🐢','🐍','🦖','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈'],
    '🍕': ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥨','🥯','🥖','🧀','🥗','🥙','🥪','🌮','🌯','🫔','🥫','🍖','🍗','🥩','🍠','🥟','🥠','🥡','🍱','🍘','🍙','🍚','🍛','🍜','🦪','🍣','🍤','🍥','🥮','🍢','🧆','🥘'],
    '🍺': ['🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','☕','🍵','🧃','🥤','🧋','🍶','🍼','🥛'],
    '🌍': ['🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🪨','🪵','🛖','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽'],
    '🔣': ['✅','❌','⚠️','🚫','🔞','📵','♻️','⚜️','🔱','📛','🔰','⭕','☑️','✔️','✖️','➕','➖','➗','➰','➿','〽️','✳️','✴️','❇️','‼️','⁉️','❓','❔','❕','❗']
  };

  // State
  let dAppClient = null;
  let activeAccount = null;
  let messagesMap = new Map(); // id -> message object
  let aliasCache = new Map();
  let replyToId = null;
  let pollTimer = null;
  let isSending = false;

  // Load cached aliases from localStorage
  try {
    const savedAliases = localStorage.getItem('teztrollbox_aliases');
    if (savedAliases) {
      const parsed = JSON.parse(savedAliases);
      Object.entries(parsed).forEach(([k, v]) => {
        if (k && k !== 'undefined' && v) aliasCache.set(k, v);
      });
    }
  } catch (e) {}

  function saveAliases() {
    try {
      const obj = {};
      aliasCache.forEach((v, k) => {
        if (k && k !== 'undefined' && v) obj[k] = v;
      });
      localStorage.setItem('teztrollbox_aliases', JSON.stringify(obj));
    } catch (e) {}
  }

  // DOM Elements
  const els = {};

  function cacheElements() {
    els.messagesViewport = document.getElementById('messagesViewport');
    els.walletBtn = document.getElementById('walletBtn');
    els.walletBadge = document.getElementById('walletBadge');
    els.walletAvatar = document.getElementById('walletAvatar');
    els.walletAddressText = document.getElementById('walletAddressText');
    els.msgCountStat = document.getElementById('msgCountStat');
    els.messageInput = document.getElementById('messageInput');
    els.charCounter = document.getElementById('charCounter');
    els.sendBtn = document.getElementById('sendBtn');
    els.emojiBtn = document.getElementById('emojiBtn');
    els.gifBtn = document.getElementById('gifBtn');
    els.emojiPopover = document.getElementById('emojiPopover');
    els.emojiCats = document.getElementById('emojiCats');
    els.emojiGrid = document.getElementById('emojiGrid');
    els.gifPopover = document.getElementById('gifPopover');
    els.gifSearchInput = document.getElementById('gifSearchInput');
    els.gifGrid = document.getElementById('gifGrid');
    els.replyBanner = document.getElementById('replyBanner');
    els.replyBannerText = document.getElementById('replyBannerText');
    els.cancelReplyBtn = document.getElementById('cancelReplyBtn');
    els.txStatusBar = document.getElementById('txStatusBar');
    els.txStatusText = document.getElementById('txStatusText');
    els.toastStack = document.getElementById('toastStack');
  }

  // Helpers
  function shortAddr(addr) {
    if (!addr || addr.length < 12) return addr || 'Anon';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isHex(str) {
    return typeof str === 'string' && str.length > 0 && str.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(str);
  }

  function hexToUtf8(raw) {
    if (!raw || typeof raw !== 'string') return '';
    if (!isHex(raw)) return raw;
    try {
      const bytes = new Uint8Array(raw.length / 2);
      for (let i = 0; i < raw.length; i += 2) {
        bytes[i / 2] = parseInt(raw.substr(i, 2), 16);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      return raw;
    }
  }

  function utf8ToHex(str) {
    const bytes = new TextEncoder().encode(str);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return timeStr;
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  }

  function showToast(msg, type = 'info') {
    if (!els.toastStack) return;
    const item = document.createElement('div');
    item.className = `toast-item ${type === 'error' ? 'error' : ''}`;
    item.textContent = msg;
    els.toastStack.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.25s ease';
      setTimeout(() => item.remove(), 260);
    }, 3800);
  }

  // Resolve TzKT alias
  async function resolveAlias(address) {
    if (!address) return 'Anon';
    if (aliasCache.has(address)) return aliasCache.get(address);
    aliasCache.set(address, shortAddr(address));
    try {
      const res = await fetch(`https://api.tzkt.io/v1/accounts/${address}`);
      if (res.ok) {
        const data = await res.json();
        const display = data && data.alias ? data.alias : shortAddr(address);
        aliasCache.set(address, display);
        saveAliases();
        // Update any rendered DOM nodes for this address
        document.querySelectorAll(`[data-author-addr="${address}"]`).forEach(node => {
          node.textContent = display;
        });
        return display;
      }
    } catch (e) {}
    return shortAddr(address);
  }

  // Format message body (GIFs, YouTube, Links)
  function formatMessageContent(rawText) {
    const trimmed = (rawText || '').trim();

    // Check if the entire message or a line contains a Giphy / Tenor GIF URL
    const gifRegex = /https?:\/\/(?:media\d?\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)\/[^\s"'<>]+/i;
    const gifMatch = trimmed.match(gifRegex);

    // Check YouTube URL
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
    const ytMatch = trimmed.match(ytRegex);

    const textWithoutGif = gifMatch ? trimmed.replace(gifMatch[0], '').trim() : trimmed;
    const safeText = escapeHtml(textWithoutGif).replace(
      /(https?:\/\/[^\s"'<>]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="msg-link" onclick="event.stopPropagation()">$1</a>'
    );

    let html = safeText ? `<div class="msg-text">${safeText}</div>` : '';

    if (gifMatch) {
      const safeGifUrl = escapeHtml(gifMatch[0]);
      html += `<img src="${safeGifUrl}" alt="GIF" class="msg-gif" onclick="event.stopPropagation()" />`;
    } else if (ytMatch) {
      const videoId = escapeHtml(ytMatch[1]);
      html += `<div class="msg-youtube" onclick="event.stopPropagation()"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" allowfullscreen loading="lazy"></iframe></div>`;
    }

    return html;
  }

  // Fetch & Render Messages from BigMap 743755
  async function fetchMessages(initial = false) {
    try {
      const res = await fetch(`https://api.tzkt.io/v1/bigmaps/${BIGMAP_ID}/keys?limit=1000`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();

      let hasNew = false;
      const newSenders = new Set();

      items.forEach(entry => {
        if (!entry || !entry.value) return;
        const id = Number(entry.key);
        if (!messagesMap.has(id)) {
          hasNew = true;
          const sender = entry.value.author || entry.value.sender || '';
          const decodedText = hexToUtf8(entry.value.message);
          const replyTo = entry.value.reply_to !== null && entry.value.reply_to !== undefined
            ? Number(entry.value.reply_to)
            : null;
          messagesMap.set(id, {
            id,
            sender,
            text: decodedText,
            timestamp: entry.value.timestamp,
            replyTo
          });
          if (sender && !aliasCache.has(sender)) {
            newSenders.add(sender);
          }
        }
      });

      if (els.msgCountStat) {
        els.msgCountStat.textContent = `${messagesMap.size.toLocaleString()} msgs`;
      }

      if (initial || hasNew) {
        renderMessages(initial);
      }

      newSenders.forEach(addr => resolveAlias(addr));
    } catch (err) {
      if (initial && els.messagesViewport) {
        els.messagesViewport.innerHTML = `
          <div class="chat-state-box">
            <div>Unable to load chat history from TzKT. Retrying automatically…</div>
          </div>
        `;
      }
    }
  }

  function renderMessages(scrollToBottom = false) {
    if (!els.messagesViewport) return;

    const wasNearBottom =
      els.messagesViewport.scrollHeight - els.messagesViewport.scrollTop - els.messagesViewport.clientHeight < 120;

    const sorted = Array.from(messagesMap.values()).sort((a, b) => a.id - b.id);

    if (sorted.length === 0) {
      els.messagesViewport.innerHTML = `
        <div class="chat-state-box">
          <div>No messages yet. Connect your wallet to post the first on-chain message!</div>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    sorted.forEach(msg => {
      const row = document.createElement('div');
      const isOwn = activeAccount && activeAccount.address === msg.sender;
      row.className = `msg-row${isOwn ? ' own-message' : ''}`;
      row.id = `msg-${msg.id}`;
      row.dataset.msgId = String(msg.id);

      const authorName = aliasCache.get(msg.sender) || shortAddr(msg.sender);

      let replyHtml = '';
      if (msg.replyTo !== null && messagesMap.has(msg.replyTo)) {
        const parent = messagesMap.get(msg.replyTo);
        const parentAuthor = aliasCache.get(parent.sender) || shortAddr(parent.sender);
        const snippet = parent.text.length > 70 ? parent.text.slice(0, 70) + '…' : parent.text;
        replyHtml = `
          <div class="msg-reply-quote" data-scroll-to="${parent.id}">
            <span>↩</span>
            <strong>${escapeHtml(parentAuthor)}</strong>
            <span>${escapeHtml(snippet)}</span>
          </div>
        `;
      }

      row.innerHTML = `
        <a class="msg-avatar-link" href="https://tzkt.io/${escapeHtml(msg.sender)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="View on TzKT">
          <img class="msg-avatar" src="https://services.tzkt.io/v1/avatars/${escapeHtml(msg.sender)}" alt="" loading="lazy" />
        </a>
        <div class="msg-body">
          <div class="msg-header">
            <div class="msg-author-group">
              <a class="msg-author" href="https://tzkt.io/${escapeHtml(msg.sender)}" target="_blank" rel="noopener noreferrer" data-author-addr="${escapeHtml(msg.sender)}" onclick="event.stopPropagation()">${escapeHtml(authorName)}</a>
              <span class="msg-id-badge">#${msg.id}</span>
            </div>
            <div class="msg-meta-right">
              <span class="msg-reply-hint">↩ Reply</span>
              <span class="msg-time">${escapeHtml(formatTimestamp(msg.timestamp))}</span>
            </div>
          </div>
          ${replyHtml}
          ${formatMessageContent(msg.text)}
        </div>
      `;

      // Click quote to jump to original message
      const quoteEl = row.querySelector('.msg-reply-quote');
      if (quoteEl) {
        quoteEl.addEventListener('click', e => {
          e.stopPropagation();
          const targetId = quoteEl.getAttribute('data-scroll-to');
          const targetNode = document.getElementById(`msg-${targetId}`);
          if (targetNode) {
            targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetNode.classList.remove('highlight-flash');
            void targetNode.offsetWidth;
            targetNode.classList.add('highlight-flash');
          }
        });
      }

      // Click message to reply
      row.addEventListener('click', () => {
        setReplyTo(msg.id);
      });

      fragment.appendChild(row);
    });

    els.messagesViewport.innerHTML = '';
    els.messagesViewport.appendChild(fragment);

    if (scrollToBottom || wasNearBottom) {
      const scrollToEnd = () => {
        els.messagesViewport.scrollTop = els.messagesViewport.scrollHeight;
      };
      scrollToEnd();
      requestAnimationFrame(scrollToEnd);

      const gifImages = els.messagesViewport.querySelectorAll('.msg-gif');
      gifImages.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', scrollToEnd, { once: true });
          img.addEventListener('error', scrollToEnd, { once: true });
        }
      });

      if (scrollToBottom) {
        setTimeout(scrollToEnd, 300);
        setTimeout(scrollToEnd, 1000);
        setTimeout(scrollToEnd, 2000);
      }
    }
  }

  function setReplyTo(msgId) {
    if (!activeAccount) {
      showToast('Connect your Tezos wallet first to reply.', 'info');
      return;
    }
    const target = messagesMap.get(msgId);
    if (!target) return;
    replyToId = msgId;
    const author = aliasCache.get(target.sender) || shortAddr(target.sender);
    const snippet = target.text.length > 60 ? target.text.slice(0, 60) + '…' : target.text;
    els.replyBannerText.innerHTML = `Replying to <strong>${escapeHtml(author)}</strong> (#${msgId}): ${escapeHtml(snippet)}`;
    els.replyBanner.classList.add('active');
    els.messageInput.focus();
  }

  function clearReplyTo() {
    replyToId = null;
    if (els.replyBanner) els.replyBanner.classList.remove('active');
  }

  // Wallet Connection (Beacon SDK)
  function initWallet() {
    if (typeof beacon === 'undefined' || !beacon.DAppClient) {
      console.warn('Beacon SDK not loaded');
      return;
    }
    dAppClient = new beacon.DAppClient({
      name: 'TezTrollBox',
      preferredNetwork: beacon.NetworkType.MAINNET
    });

    dAppClient.getActiveAccount().then(acc => {
      if (acc) {
        activeAccount = acc;
        updateWalletUI();
      }
    }).catch(() => {});
  }

  function updateWalletUI() {
    if (activeAccount && activeAccount.address) {
      const addr = activeAccount.address;
      els.walletBadge.classList.add('visible');
      els.walletAvatar.src = `https://services.tzkt.io/v1/avatars/${addr}`;
      els.walletAddressText.textContent = shortAddr(addr);
      resolveAlias(addr).then(alias => {
        els.walletAddressText.textContent = alias;
      });

      els.walletBtn.textContent = 'Disconnect';
      els.walletBtn.classList.add('disconnect');
      els.messageInput.disabled = false;
      els.messageInput.placeholder = 'Write an on-chain message… (Enter to send)';
      els.sendBtn.disabled = false;
    } else {
      els.walletBadge.classList.remove('visible');
      els.walletBtn.textContent = 'Connect Wallet';
      els.walletBtn.classList.remove('disconnect');
      els.messageInput.disabled = true;
      els.messageInput.placeholder = 'Connect your Tezos wallet to chat on-chain…';
      els.sendBtn.disabled = true;
      clearReplyTo();
    }
    if (messagesMap.size > 0) {
      renderMessages(false);
    }
  }

  async function handleWalletClick() {
    if (!dAppClient) {
      showToast('Wallet SDK unavailable.', 'error');
      return;
    }
    try {
      if (activeAccount) {
        await dAppClient.clearActiveAccount();
        activeAccount = null;
        updateWalletUI();
        showToast('Wallet disconnected.');
      } else {
        const perms = await dAppClient.requestPermissions({
          network: {
            type: beacon.NetworkType.MAINNET,
            rpcUrl: RPC_URL
          }
        });
        activeAccount = perms.account || (await dAppClient.getActiveAccount());
        updateWalletUI();
        showToast('Wallet connected!');
      }
    } catch (err) {
      showToast('Wallet connection cancelled.', 'error');
    }
  }

  // Send On-Chain Message
  async function sendMessage(customText) {
    if (isSending) return;
    if (!activeAccount || !dAppClient) {
      showToast('Please connect your wallet first.', 'error');
      return;
    }
    const text = (customText !== undefined ? customText : els.messageInput.value).trim();
    if (!text) return;
    if (text.length > MAX_MESSAGE_LEN) {
      showToast(`Message exceeds ${MAX_MESSAGE_LEN} characters.`, 'error');
      return;
    }

    const encodedHex = utf8ToHex(text);
    const valuePayload = replyToId !== null
      ? {
          prim: 'Pair',
          args: [
            { string: encodedHex },
            { prim: 'Some', args: [{ int: String(replyToId) }] }
          ]
        }
      : {
          prim: 'Pair',
          args: [
            { string: encodedHex },
            { prim: 'None' }
          ]
        };

    try {
      isSending = true;
      els.sendBtn.disabled = true;
      els.txStatusText.textContent = 'Confirm message in your wallet…';
      els.txStatusBar.classList.add('active');

      const response = await dAppClient.requestOperation({
        operationDetails: [
          {
            kind: beacon.TezosOperationType.TRANSACTION,
            destination: CONTRACT_ADDRESS,
            amount: '0',
            parameters: {
              entrypoint: 'post_message',
              value: valuePayload
            }
          }
        ]
      });

      if (customText === undefined) {
        els.messageInput.value = '';
        updateCharCounter();
      }
      clearReplyTo();

      els.txStatusText.textContent = 'Broadcasting on Tezos Mainnet… waiting for block inclusion';
      await waitForTxConfirmation(response.transactionHash);
      els.txStatusBar.classList.remove('active');
      showToast('Message confirmed on-chain!');
      await fetchMessages(true);
    } catch (err) {
      els.txStatusBar.classList.remove('active');
      showToast('Transaction cancelled or failed.', 'error');
    } finally {
      isSending = false;
      if (activeAccount) els.sendBtn.disabled = false;
    }
  }

  async function waitForTxConfirmation(txHash) {
    if (!txHash) return;
    const maxAttempts = 25;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const res = await fetch(`https://api.tzkt.io/v1/operations/${txHash}`);
        if (res.ok) {
          const ops = await res.json();
          if (Array.isArray(ops) && ops.length > 0 && ops[0].status === 'applied') {
            return true;
          }
        }
      } catch (e) {}
    }
    return false;
  }

  // Emoji & GIF Pickers
  function initEmojiPicker() {
    const categories = Object.keys(EMOJI_CATEGORIES);
    categories.forEach((cat, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `emoji-cat-btn${idx === 0 ? ' active' : ''}`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        els.emojiCats.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderEmojiCategory(cat);
      });
      els.emojiCats.appendChild(btn);
    });
    renderEmojiCategory(categories[0]);
  }

  function renderEmojiCategory(cat) {
    els.emojiGrid.innerHTML = '';
    (EMOJI_CATEGORIES[cat] || []).forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-item';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        if (els.messageInput.disabled) return;
        els.messageInput.value += emoji;
        updateCharCounter();
        els.messageInput.focus();
      });
      els.emojiGrid.appendChild(btn);
    });
  }

  async function loadGifs(query = '') {
    if (!els.gifGrid) return;
    els.gifGrid.innerHTML = `<div class="chat-state-box"><div class="spinner-ring-sm"></div></div>`;
    try {
      const endpointBase = window.location.hostname.includes('trollbox')
        ? '/fetchgif'
        : 'https://trollbox.tez.cool/fetchgif';
      const q = query.trim();
      const url = q
        ? `${endpointBase}?type=search&q=${encodeURIComponent(q)}&limit=50`
        : `${endpointBase}?type=trending&limit=50`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('GIF fetch failed');
      const data = await res.json();
      const list = Array.isArray(data?.results) && data.results.length > 0
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : [];

      if (list.length === 0) {
        els.gifGrid.innerHTML = `<div class="chat-state-box">No GIFs found</div>`;
        return;
      }

      els.gifGrid.innerHTML = '';
      list.forEach(item => {
        const previewUrl =
          item.media_formats?.tinygif?.url ||
          item.media?.[0]?.tinygif?.url ||
          item.images?.fixed_height_small?.url ||
          item.images?.fixed_height?.url ||
          item.images?.original?.url;
        const sendUrl =
          item.media_formats?.gif?.url ||
          item.media?.[0]?.gif?.url ||
          item.images?.fixed_height?.url ||
          item.images?.original?.url ||
          previewUrl;
        if (!previewUrl || !/^https:\/\//i.test(previewUrl) || !/^https:\/\//i.test(sendUrl)) return;

        const img = document.createElement('img');
        img.src = previewUrl;
        img.className = 'gif-item';
        img.loading = 'lazy';
        img.alt = item.title || item.content_description || 'GIF';
        img.addEventListener('click', () => {
          if (els.messageInput.disabled) {
            showToast('Connect your Tezos wallet first to send a GIF.', 'info');
            return;
          }
          els.gifPopover.classList.remove('open');
          els.gifBtn.classList.remove('active');
          els.messageInput.value = els.messageInput.value.trim()
            ? `${els.messageInput.value.trim()} ${sendUrl}`
            : sendUrl;
          updateCharCounter();
          els.messageInput.focus();
        });
        els.gifGrid.appendChild(img);
      });
    } catch (e) {
      els.gifGrid.innerHTML = `<div class="chat-state-box">Error loading GIFs. Please try again.</div>`;
    }
  }

  function updateCharCounter() {
    const len = els.messageInput.value.length;
    els.charCounter.textContent = `${len}/${MAX_MESSAGE_LEN}`;
    els.charCounter.classList.toggle('warn', len > 240 && len <= MAX_MESSAGE_LEN);
    els.charCounter.classList.toggle('limit', len > MAX_MESSAGE_LEN);
  }

  function bindEvents() {
    els.walletBtn.addEventListener('click', handleWalletClick);
    els.cancelReplyBtn.addEventListener('click', clearReplyTo);

    els.messageInput.addEventListener('input', updateCharCounter);
    els.messageInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      } else if (e.key === 'Escape') {
        clearReplyTo();
      }
    });

    els.sendBtn.addEventListener('click', () => sendMessage());

    els.emojiBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = els.emojiPopover.classList.toggle('open');
      els.emojiBtn.classList.toggle('active', open);
      if (els.gifPopover) els.gifPopover.classList.remove('open');
      if (els.gifBtn) els.gifBtn.classList.remove('active');
    });

    if (els.gifBtn && els.gifPopover) {
      els.gifBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = els.gifPopover.classList.toggle('open');
        els.gifBtn.classList.toggle('active', open);
        els.emojiPopover.classList.remove('open');
        els.emojiBtn.classList.remove('active');
        if (open && els.gifGrid && els.gifGrid.children.length === 0) {
          loadGifs(els.gifSearchInput ? els.gifSearchInput.value : '');
        }
        if (open && els.gifSearchInput) {
          els.gifSearchInput.focus();
        }
      });
    }

    if (els.gifSearchInput) {
      let gifDebounce = null;
      els.gifSearchInput.addEventListener('input', () => {
        clearTimeout(gifDebounce);
        gifDebounce = setTimeout(() => {
          loadGifs(els.gifSearchInput.value);
        }, 350);
      });
    }

    document.addEventListener('click', e => {
      if (!els.emojiPopover.contains(e.target) && e.target !== els.emojiBtn) {
        els.emojiPopover.classList.remove('open');
        els.emojiBtn.classList.remove('active');
      }
      if (els.gifPopover && !els.gifPopover.contains(e.target) && e.target !== els.gifBtn) {
        els.gifPopover.classList.remove('open');
        els.gifBtn.classList.remove('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    initEmojiPicker();
    bindEvents();
    initWallet();
    fetchMessages(true);
    pollTimer = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
  });
})();
