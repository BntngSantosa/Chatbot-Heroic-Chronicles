const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const attachButton = document.getElementById('attachButton');
const uploadMenu = document.getElementById('uploadMenu');
const imageInput = document.getElementById('imageInput');
const documentInput = document.getElementById('documentInput');
const audioInput = document.getElementById('audioInput');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
const micButton = document.querySelector('.mic-button');
const filePreview = document.getElementById('filePreview');

let selectedFile = null;
let selectedFileType = null;
const memorySummary = document.getElementById('memorySummary');
const historyList = document.getElementById('historyList');
const newChatButton = document.getElementById('newChatButton');
const saveHistoryButton = document.getElementById('saveHistoryButton');

const CHAT_HISTORY_KEY = 'lorongWaktuChatHistory';
let currentHistoryId = null;
let chatHistory = [];

const updateMemorySummary = (text) => {
  if (!memorySummary) return;
  if (!text) {
    memorySummary.classList.add('hidden');
    memorySummary.textContent = '';
    return;
  }
  memorySummary.textContent = text;
  memorySummary.classList.remove('hidden');
};

const fetchMemorySummary = async () => {
  try {
    const response = await fetch('/memory-summary');
    if (!response.ok) throw new Error('Tidak bisa memuat memori');
    const data = await response.json();
    updateMemorySummary(data.memorySummary || 'Belum ada percakapan tersimpan');
  } catch (error) {
    updateMemorySummary('Belum ada percakapan tersimpan');
  }
};

const appendMessage = (text, role, file = null, fileType = null) => {
  if (chatMessages.classList.contains('hidden')) {
    chatMessages.classList.remove('hidden');
  }

  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}-message`;

  // Tambahkan file jika ada
  if (file && fileType) {
    if (fileType === 'image') {
      const fileElement = document.createElement('img');
      fileElement.src = URL.createObjectURL(file);
      fileElement.style.maxWidth = '200px';
      fileElement.style.maxHeight = '200px';
      fileElement.style.borderRadius = '8px';
      fileElement.style.marginBottom = '10px';
      wrapper.appendChild(fileElement);
    } else if (fileType === 'audio') {
      const fileElement = document.createElement('audio');
      fileElement.src = URL.createObjectURL(file);
      fileElement.controls = true;
      fileElement.style.maxWidth = '300px';
      fileElement.style.marginBottom = '10px';
      wrapper.appendChild(fileElement);
    } else if (fileType === 'document') {
      const docElement = document.createElement('div');
      docElement.style.padding = '10px';
      docElement.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      docElement.style.borderRadius = '8px';
      docElement.style.marginBottom = '10px';
      docElement.style.display = 'flex';
      docElement.style.alignItems = 'center';
      docElement.style.gap = '10px';
      docElement.innerHTML = `<span style="font-size: 1.5rem;">📄</span><span>${file.name}</span>`;
      wrapper.appendChild(docElement);
    }
  }

  const messageText = document.createElement('p');
  messageText.textContent = text;
  wrapper.appendChild(messageText);

  const meta = document.createElement('span');
  meta.className = 'meta';
  const now = new Date();
  meta.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  wrapper.appendChild(meta);

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const saveChatHistoryToStorage = () => {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
};

const loadChatHistoryFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
};

const formatHistoryTitle = (messages) => {
  const firstUser = messages.find((item) => item.role === 'user');
  if (!firstUser || !firstUser.text) return 'Percakapan baru';
  return firstUser.text.length > 30 ? `${firstUser.text.slice(0, 30)}...` : firstUser.text;
};

const formatHistoryDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const renderHistoryList = () => {
  historyList.innerHTML = '';

  if (!chatHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Belum ada riwayat tersimpan.';
    historyList.appendChild(empty);
    return;
  }

  chatHistory.slice().reverse().forEach((item) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.dataset.id = item.id;

    const content = document.createElement('div');
    content.className = 'history-item-content';
    content.innerHTML = `
      <p class="history-item-title">${item.title}</p>
      <p class="history-item-date">${formatHistoryDate(item.createdAt)}</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'history-item-actions';

    const loadButton = document.createElement('button');
    loadButton.className = 'history-action-button';
    loadButton.type = 'button';
    loadButton.title = 'Buka riwayat';
    loadButton.textContent = '▶';
    loadButton.addEventListener('click', (event) => {
      event.stopPropagation();
      loadHistoryItem(item.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'history-action-button';
    deleteButton.type = 'button';
    deleteButton.title = 'Hapus riwayat';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteHistoryItem(item.id);
    });

    actions.appendChild(loadButton);
    actions.appendChild(deleteButton);
    row.appendChild(content);
    row.appendChild(actions);

    row.addEventListener('click', () => loadHistoryItem(item.id));
    historyList.appendChild(row);
  });
};

const getConversation = () =>
  Array.from(document.querySelectorAll('.message')).map((messageElement) => {
    const text = messageElement.querySelector('p')?.textContent || '';
    const role = messageElement.classList.contains('user-message') ? 'user' : 'assistant';
    return { role, text };
  });

const getCurrentHistoryTitle = () => {
  const messages = getConversation();
  return formatHistoryTitle(messages);
};

const clearChat = () => {
  chatMessages.innerHTML = '';
  chatMessages.classList.add('hidden');
  selectedFile = null;
  selectedFileType = null;
  removePreview();
  currentHistoryId = null;
};

const loadHistoryItem = (id) => {
  const item = chatHistory.find((entry) => entry.id === id);
  if (!item) return;

  clearChat();
  currentHistoryId = id;
  item.messages.forEach((message) => {
    appendMessage(message.text, message.role);
  });
};

const deleteHistoryItem = (id) => {
  chatHistory = chatHistory.filter((entry) => entry.id !== id);
  saveChatHistoryToStorage();
  if (currentHistoryId === id) {
    clearChat();
  }
  renderHistoryList();
};

const saveCurrentConversation = () => {
  const messages = getConversation();
  if (!messages.length) return;

  const historyItem = {
    id: currentHistoryId || Date.now().toString(),
    title: getCurrentHistoryTitle(),
    messages,
    createdAt: new Date().toISOString()
  };

  if (currentHistoryId) {
    chatHistory = chatHistory.map((entry) =>
      entry.id === currentHistoryId ? historyItem : entry
    );
  } else {
    chatHistory.push(historyItem);
    currentHistoryId = historyItem.id;
  }

  saveChatHistoryToStorage();
  renderHistoryList();
};

const appendTypingMessage = (text) => {
  if (chatMessages.classList.contains('hidden')) {
    chatMessages.classList.remove('hidden');
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'message assistant-message typing-indicator';
  wrapper.id = 'typingMessage';

  const messageText = document.createElement('p');
  messageText.textContent = '';
  wrapper.appendChild(messageText);

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = '';
  wrapper.appendChild(meta);

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return typeMessage(messageText, text, meta);
};

const typeMessage = (element, text, metaElement) => {
  let index = 0;
  const now = new Date();
  metaElement.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return new Promise((resolve) => {
    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(type, 30);
      } else {
        resolve();
      }
    };
    type();
  });
};

const showPreview = (file, type) => {
  selectedFile = file;
  selectedFileType = type;
  filePreview.innerHTML = '';

  if (type === 'image') {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    filePreview.appendChild(img);
  } else if (type === 'audio') {
    const audio = document.createElement('audio');
    audio.src = URL.createObjectURL(file);
    audio.controls = true;
    filePreview.appendChild(audio);
  } else if (type === 'document') {
    const docElement = document.createElement('div');
    docElement.style.padding = '10px';
    docElement.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    docElement.style.borderRadius = '8px';
    docElement.style.display = 'flex';
    docElement.style.alignItems = 'center';
    docElement.style.gap = '10px';
    docElement.innerHTML = `<span style="font-size: 1.5rem;">📄</span>`;
    filePreview.appendChild(docElement);
  }

  const info = document.createElement('div');
  info.className = 'file-info';
  // const typeLabel = type === 'image' ? 'Gambar' : type === 'audio' ? 'Audio' : 'Dokumen';
  info.textContent = `${file.name}`;
  filePreview.appendChild(info);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-file';
  removeBtn.textContent = '×';
  removeBtn.onclick = removePreview;
  filePreview.appendChild(removeBtn);

  filePreview.classList.remove('hidden');
};

const removePreview = () => {
  selectedFile = null;
  selectedFileType = null;
  filePreview.innerHTML = '';
  filePreview.classList.add('hidden');
};

const showLoadingMessage = () => {
  const loading = document.createElement('div');
  loading.className = 'message assistant-message';
  loading.id = 'loadingMessage';
  loading.innerHTML = '<p>Menyiapkan jawaban...</p><span class="meta">...</span>';
  chatMessages.appendChild(loading);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const removeLoadingMessage = () => {
  const loading = document.getElementById('loadingMessage');
  if (loading) loading.remove();
};

const removeTypingMessage = () => {
  const typing = document.getElementById('typingMessage');
  if (typing) typing.remove();
};

// const getConversation = () =>
//   Array.from(document.querySelectorAll('.message')).map((messageElement) => {
//     const text = messageElement.querySelector('p')?.textContent || '';
//     const role = messageElement.classList.contains('user-message') ? 'user' : 'assistant';
//     return { role, text };
//   });

const sendMessage = async (message) => {
  
  appendMessage(message, 'user');
  chatInput.value = '';
  showLoadingMessage();

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: getConversation() }),
    });

    if (!response.ok) {
      throw new Error('Gagal menghubungkan ke API');
    }

    const data = await response.json();
    removeLoadingMessage();
    await appendTypingMessage(data.result || 'Maaf, saya tidak bisa merespons saat ini.');
    updateMemorySummary(data.memorySummary);

  } catch (error) {
    removeLoadingMessage();
    await appendTypingMessage('Terjadi kesalahan koneksi. Silakan coba lagi.');
    console.error(error);
  }
};

const sendFileMessage = async (file, endpoint) => {
  if (!file) return;

  const prompt = chatInput.value.trim();
  const messageText = prompt ? `${prompt}` : `${file.name}`;
  let fileType;
  if (endpoint === '/generate-from-image') fileType = 'image';
  else if (endpoint === '/generate-from-audio') fileType = 'audio';
  else if (endpoint === '/generate-from-document') fileType = 'document';
  appendMessage(messageText, 'user', file, fileType);
  showLoadingMessage();

  const formData = new FormData();
  formData.append(endpoint === '/generate-from-image' ? 'image' : endpoint === '/generate-from-audio' ? 'audio' : 'document', file);
  if (prompt) {
    formData.append('prompt', prompt);
    chatInput.value = '';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Gagal mengirim file ke API');
    }

    const data = await response.json();
    removeLoadingMessage();
    await appendTypingMessage(data.result || 'Maaf, saya tidak bisa memproses file ini.');
    updateMemorySummary(data.memorySummary);
  } catch (error) {
    removeLoadingMessage();
    await appendTypingMessage('Gagal mengunggah file. Silakan coba lagi.');
    console.error(error);
  }
};

saveHistoryButton.addEventListener('click', () => {
  saveCurrentConversation();
});

newChatButton.addEventListener('click', () => {
  clearChat();
});

attachButton.addEventListener('click', () => {
  uploadMenu.classList.toggle('hidden');
});

window.addEventListener('click', (event) => {
  if (!uploadMenu.contains(event.target) && event.target !== attachButton) {
    uploadMenu.classList.add('hidden');
  }
});

uploadMenu.addEventListener('click', (event) => {
  const option = event.target.closest('.upload-option');
  if (!option) return;

  const type = option.dataset.type;
  if (type === 'image') imageInput.click();
  if (type === 'document') documentInput.click();
  if (type === 'audio') audioInput.click();

  uploadMenu.classList.add('hidden');
});

imageInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) showPreview(file, 'image');
  event.target.value = '';
});

documentInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) showPreview(file, 'document');
  event.target.value = '';
});

audioInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) showPreview(file, 'audio');
  event.target.value = '';
});

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      sendFileMessage(audioFile, '/generate-from-audio');
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    micButton.textContent = '⏹️'; // Change to stop icon
    micButton.setAttribute('aria-label', 'Hentikan rekaman');
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Tidak dapat mengakses mikrofon. Pastikan izin diberikan.');
  }
};

const stopRecording = () => {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micButton.textContent = '🎤'; // Change back to mic icon
    micButton.setAttribute('aria-label', 'Rekam suara');
  }
};

micButton.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();

  if (selectedFile) {
    // Kirim dengan file
    let endpoint;
    if (selectedFileType === 'image') {
      endpoint = '/generate-from-image';
      label = 'Gambar';
    } else if (selectedFileType === 'audio') {
      endpoint = '/generate-from-audio';
      label = 'Audio';
    } else if (selectedFileType === 'document') {
      endpoint = '/generate-from-document';
      label = 'Dokumen';
    }
    sendFileMessage(selectedFile, endpoint);
    removePreview();
  } else if (message) {
    // Kirim pesan biasa
    sendMessage(message);
  }

  uploadMenu.classList.add('hidden');
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

chatHistory = loadChatHistoryFromStorage();
renderHistoryList();
fetchMemorySummary();

