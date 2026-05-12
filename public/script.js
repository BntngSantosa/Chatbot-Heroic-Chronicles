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

const getConversation = () =>
  Array.from(document.querySelectorAll('.message')).map((messageElement) => {
    const text = messageElement.querySelector('p')?.textContent || '';
    const role = messageElement.classList.contains('user-message') ? 'user' : 'assistant';
    return { role, text };
  });

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
  } catch (error) {
    removeLoadingMessage();
    await appendTypingMessage('Gagal mengunggah file. Silakan coba lagi.');
    console.error(error);
  }
};

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
