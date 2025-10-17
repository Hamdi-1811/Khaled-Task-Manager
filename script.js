// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiniMK_AIN_crX9o1i8VkBjZmdhB50MGg",
  authDomain: "khaled-task--manager.firebaseapp.com",
  projectId: "khaled-task--manager",
  storageBucket: "khaled-task--manager.firebasestorage.app",
  messagingSenderId: "574392218953",
  appId: "1:574392218953:web:c1793a90edf35256201698",
  measurementId: "G-8VRGJ0FV20"
};

// ----------------- Global UI Refs -----------------
const micButton = document.getElementById('mic-button');
const voiceStatus = document.getElementById('voice-status');
const voicePreview = document.getElementById('voice-preview');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const notesConfirmation = document.getElementById('notes-confirmation');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');
const tasksList = document.getElementById('tasks-list');
const loadingMessage = document.getElementById('loading-message');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const closeModalBtn = document.getElementById('close-modal');
const refreshBtn = document.getElementById('refreshBtn');
const clearLocalBtn = document.getElementById('clearLocal');

// Theme color variables usage
const GOLD = "#FFD700";
const KHALED_NAME = "أستاذ خالد";

// ----------------- Three.js Background -----------------
function initThreeJS() {
  const container = document.getElementById('three-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.z = 60;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // Particles
  const particleCount = 1000;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size: 0.6, transparent: true, opacity: 0.9, color: 0xffffff });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function animate() {
    requestAnimationFrame(animate);
    points.rotation.y += 0.0008;
    points.rotation.x += 0.0002;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
initThreeJS();

// ----------------- Voice Recognition & Flow -----------------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recognition = Recognition ? new Recognition() : null;
let isListening = false;
let recognitionState = 'IDLE'; // IDLE, AWAITING_TASK_NAME, AWAITING_DATE_TIME, AWAITING_NOTES_CONFIRM, AWAITING_NOTES, PROCESSING
let currentTask = {};
const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const statusMessages = {
  IDLE: 'اضغط على الميكروفون لبدء مهمة جديدة.',
  AWAITING_TASK_NAME: 'قل اسم المهمة، ثم اضغط التالي.',
  AWAITING_DATE_TIME: 'قل اليوم، والشهر والوقت (مثال: 15 أكتوبر الساعة 8 مساءً)، ثم اضغط التالي.',
  AWAITING_NOTES_CONFIRM: 'هل تريد إضافة ملاحظات؟ اضغط نعم أو لا.',
  AWAITING_NOTES: 'قل الملاحظات، ثم اضغط تسجيل المهمة.',
  PROCESSING: 'جارِ معالجة الإدخال...'
};

function setStatus(state, preview='') {
  recognitionState = state;
  voiceStatus.textContent = statusMessages[state] || '';
  if (preview) voicePreview.textContent = preview;
  // Buttons visibility
  nextBtn.classList.toggle('hidden', !(state === 'AWAITING_TASK_NAME' || state === 'AWAITING_DATE_TIME'));
  submitBtn.classList.toggle('hidden', !(state === 'AWAITING_NOTES'));
  notesConfirmation.classList.toggle('hidden', state !== 'AWAITING_NOTES_CONFIRM');
}

function startRecognition(state) {
  if (!recognition) {
    setStatus('IDLE', 'عذراً، متصفحك لا يدعم التعرف على الصوت.');
    return;
  }
  try {
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (ev) => {
      const transcript = Array.from(ev.results).map(r => r[0].transcript).join(' ');
      handleTranscript(transcript);
    };
    recognition.onend = () => {
      isListening = false;
      // If still waiting input, we don't change to IDLE here - keep UI for user to press next/submit
    };
    recognition.onerror = (err) => {
      console.error('Speech error', err);
      setStatus('IDLE', 'خطأ في الميكروفون. تحقق من الأذونات.');
    };
    recognition.start();
    isListening = true;
    setStatus(state);
  } catch (e) {
    console.error("startRecognition error:", e);
    setStatus('IDLE', 'فشل بدء الميكروفون.');
  }
}

function toggleMic() {
  if (isListening && recognition) {
    recognition.stop();
    isListening = false;
    setStatus('IDLE');
    return;
  }
  // start flow
  currentTask = {};
  startRecognition('AWAITING_TASK_NAME');
}

function handleTranscript(transcript) {
  if (!transcript) return;
  const lower = transcript.trim();
  if (recognitionState === 'AWAITING_TASK_NAME') {
    currentTask.name = lower;
    voicePreview.textContent = `🎤 تم سماع اسم المهمة: ${currentTask.name}`;
    // Move to date/time step automatically
    startRecognition('AWAITING_DATE_TIME');
  } else if (recognitionState === 'AWAITING_DATE_TIME') {
    // parse date/time
    parseDateAndTime(lower);
    voicePreview.textContent = buildPreview();
    setStatus('AWAITING_NOTES_CONFIRM', voicePreview.textContent);
  } else if (recognitionState === 'AWAITING_NOTES') {
    currentTask.notes = lower;
    voicePreview.textContent = buildPreview();
    // waiting user to press "تسجيل المهمة"
  }
}

// Next button click handler
nextBtn.addEventListener('click', () => {
  if (recognitionState === 'AWAITING_TASK_NAME') {
    // user manually proceeds after saying name (if mic was not auto-stopped)
    if (!currentTask.name) {
      voicePreview.textContent = 'لم يتم التعرف على اسم المهمة. حاول مرة أخرى.';
      return;
    }
    startRecognition('AWAITING_DATE_TIME');
  } else if (recognitionState === 'AWAITING_DATE_TIME') {
    // ensure date/time exists
    if (!currentTask.date) {
      // try parse from preview text
      parseDateAndTime(voicePreview.textContent || '');
    }
    setStatus('AWAITING_NOTES_CONFIRM', buildPreview());
  }
});

// Confirm notes handlers
confirmYesBtn.addEventListener('click', () => {
  startRecognition('AWAITING_NOTES');
});
confirmNoBtn.addEventListener('click', () => {
  currentTask.notes = '';
  finalizeTask();
});

// Submit (register) button
submitBtn.addEventListener('click', () => {
  // make sure notes were captured
  if (recognitionState === 'AWAITING_NOTES' && recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
  finalizeTask();
});

// Toggle mic click
micButton.addEventListener('click', toggleMic);

// ----------------- Date/time parsing helper -----------------
function parseDateAndTime(text) {
  // Defaults:
  const now = new Date();
  let year = now.getFullYear();
  let day = now.getDate();
  let monthIndex = now.getMonth();
  let time = '12:00';

  // Find month
  for (let i = 0; i < ARABIC_MONTHS.length; i++) {
    if (text.includes(ARABIC_MONTHS[i])) {
      monthIndex = i;
      break;
    }
  }
  // Find numeric day
  const dmatch = text.match(/(\d{1,2})/);
  if (dmatch) day = parseInt(dmatch[1]);

  // Find time: patterns like "الساعة 8 مساءً" or "8 مساءً" or "8:30"
  const tmatch = text.match(/(\d{1,2})(?:[:\.](\d{2}))?\s*(?:ص|صباح|م|مساء|مساءً)?/);
  if (tmatch) {
    let hour = parseInt(tmatch[1]);
    const minute = tmatch[2] ? tmatch[2] : '00';
    // check for مساء / م presence
    if (/(مساء|م|مساءً)/.test(text) && hour < 12) hour += 12;
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const d = new Date(year, monthIndex, day);
  currentTask.date = d.toISOString().split('T')[0];
  currentTask.time = time;
}

// ----------------- Build preview -----------------
function buildPreview() {
  let preview = '';
  if (currentTask.name) preview += `✅ المهمة: ${currentTask.name}\n\n`;
  if (currentTask.date) {
    const dateObj = new Date(currentTask.date);
    const formatted = dateObj.toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    preview += `🗓️ التاريخ: ${formatted}\n`;
  }
  if (currentTask.time) preview += `⏰ الوقت: ${currentTask.time}\n\n`;
  if (recognitionState === 'AWAITING_NOTES' && currentTask.notes) preview += `📝 الملاحظات: ${currentTask.notes}\n\n`;
  if (recognitionState === 'AWAITING_NOTES_CONFIRM') preview += '💡 هل تريد إضافة ملاحظات؟';
  return preview;
}

// ----------------- Speech Synthesis (Voice confirmations) -----------------
function speakArabic(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('No speech synthesis available');
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ar-EG';
  // try to pick a voice that contains "Arabic" or "Google"
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length) {
    const v = voices.find(v => /arabic|google|zagros|majid/i.test(v.name)) || voices.find(v => v.lang && v.lang.startsWith('ar')) || voices[0];
    if (v) utter.voice = v;
  }
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ----------------- Firebase init & realtime -----------------
let app, auth, db;
let userId = null;
let tasksCollectionRef;

async function initFirebaseAndAuth() {
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    // No firebase configured: fallback to localStorage
    console.warn('Firebase config missing - using localStorage only.');
    loadingMessage.textContent = 'التخزين المحلي مفعل (Firebase غير مفعّل).';
    loadLocalTasks();
    return;
  }

  try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    // anonymous sign-in
    await auth.signInAnonymously();
    auth.onAuthStateChanged((user) => {
      if (user) {
        userId = user.uid;
        tasksCollectionRef = db.collection(`artifacts/khaled_voice_tasks/users/${userId}/tasks`);
        subscribeTasksRealtime();
      } else {
        console.error('No firebase user found.');
      }
    });
  } catch (e) {
    console.error('Firebase init error:', e);
    loadingMessage.textContent = 'خطأ في إعداد Firebase: ' + e.message;
    loadLocalTasks();
  }
}

// Subscribe to realtime tasks (if Firestore available)
function subscribeTasksRealtime() {
  if (!tasksCollectionRef) return;
  try {
    tasksCollectionRef.orderBy('createdAt').onSnapshot((snapshot) => {
      const tasks = [];
      snapshot.forEach(d => tasks.push({ id: d.id, ...d.data() }));
      // sort by date+time
      tasks.sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
      renderTasks(tasks);
    }, (err) => {
      console.error('Snapshot error', err);
      loadingMessage.textContent = 'خطأ في جلب المهام: ' + err.message;
    });
  } catch(e) {
    console.error('subscribeTasksRealtime error', e);
  }
}

// ----------------- Local fallback storage -----------------
function loadLocalTasks() {
  const raw = localStorage.getItem('khaled_tasks_v1');
  const tasks = raw ? JSON.parse(raw) : [];
  renderTasks(tasks);
}

function saveLocalTasks(tasks) {
  localStorage.setItem('khaled_tasks_v1', JSON.stringify(tasks));
}

// ----------------- Task CRUD (Firestore if available, else local) -----------------
async function finalizeTask() {
  setStatus('PROCESSING', buildPreview());
  const taskData = {
    name: currentTask.name || 'مهمة بدون اسم',
    date: currentTask.date || new Date().toISOString().split('T')[0],
    time: currentTask.time || '12:00',
    notes: currentTask.notes || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
    completed: false
  };

  try {
    if (tasksCollectionRef) {
      await tasksCollectionRef.add(taskData);
    } else {
      // localStorage flow
      const existing = JSON.parse(localStorage.getItem('khaled_tasks_v1') || '[]');
      existing.push({ id: 'local-' + Date.now(), ...taskData });
      saveLocalTasks(existing);
      renderTasks(existing);
    }
    setStatus('IDLE', 'تم حفظ المهمة بنجاح!');
    speakArabic(`تمت إضافة المهمة بنجاح، ${KHALED_NAME}`);
  } catch (e) {
    console.error('Error adding task:', e);
    setStatus('IDLE', 'فشل حفظ المهمة: ' + e.message);
  } finally {
    currentTask = {};
  }
}

async function updateTask(id, payload) {
  try {
    if (tasksCollectionRef) {
      const docRef = tasksCollectionRef.doc(id);
      await docRef.update(payload);
    } else {
      const tasks = JSON.parse(localStorage.getItem('khaled_tasks_v1') || '[]');
      const idx = tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...payload };
        saveLocalTasks(tasks);
        renderTasks(tasks);
      }
    }
  } catch (e) {
    console.error('updateTask error', e);
  }
}

async function removeTask(id) {
  try {
    if (tasksCollectionRef) {
      const docRef = tasksCollectionRef.doc(id);
      await docRef.delete();
    } else {
      const tasks = JSON.parse(localStorage.getItem('khaled_tasks_v1') || '[]');
      const newTasks = tasks.filter(t => t.id !== id);
      saveLocalTasks(newTasks);
      renderTasks(newTasks);
    }
    speakArabic('تم حذف المهمة.');
  } catch (e) {
    console.error('removeTask error', e);
  }
}

// ----------------- Render tasks UI -----------------
function renderTasks(tasks) {
  tasksList.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    tasksList.innerHTML = '<p class="text-center text-gray-400 mt-4">لا توجد مهام محفوظة حتى الآن.</p>';
    return;
  }
  tasks.forEach(t => {
    const el = createTaskElement(t);
    tasksList.appendChild(el);
  });
}

// Create task DOM
function createTaskElement(task) {
  const container = document.createElement('div');
  container.className = 'task-item flex justify-between items-start gap-4';

  const left = document.createElement('div');
  left.className = 'flex-1 min-w-0';

  const title = document.createElement('h4');
  title.className = 'text-lg font-semibold truncate';
  title.textContent = task.name;

  if (task.completed) title.classList.add('task-done');

  const meta = document.createElement('p');
  const dateObj = new Date(task.date);
  const formatted = dateObj.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
  meta.className = 'text-yellow-300 text-sm mt-1';
  meta.innerHTML = `🗓️ ${formatted} <span class="mx-2">|</span> ⏰ ${task.time}`;

  left.appendChild(title);
  left.appendChild(meta);

  if (task.notes) {
    const notes = document.createElement('p');
    notes.className = 'text-gray-300 text-xs mt-2 whitespace-pre-wrap';
    notes.textContent = `📝 ${task.notes}`;
    left.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'flex flex-col gap-2 items-center';

  // complete button
  const doneBtn = document.createElement('button');
  doneBtn.title = 'إنجاز';
  doneBtn.className = 'px-3 py-1 rounded-md bg-green-600 text-white text-xs';
  doneBtn.textContent = task.completed ? 'تم' : 'إنجاز';
  doneBtn.addEventListener('click', async () => {
    await updateTask(task.id, { completed: !task.completed });
    speakArabic(task.completed ? 'تم تفعيل المهمة مرة أخرى.' : `تم إنجاز المهمة، رائع يا خالد!`);
  });

  // edit button
  const editBtn = document.createElement('button');
  editBtn.title = 'تعديل';
  editBtn.className = 'px-3 py-1 rounded-md border border-yellow-400 text-xs text-yellow-300';
  editBtn.textContent = 'تعديل';
  editBtn.addEventListener('click', async () => openEditModal(task));

  // delete button
  const delBtn = document.createElement('button');
  delBtn.title = 'حذف';
  delBtn.className = 'px-3 py-1 rounded-md bg-red-600 text-white text-xs';
  delBtn.textContent = 'حذف';
  delBtn.addEventListener('click', () => {
    // custom confirm UI (simple)
    if (confirm('هل أنت متأكد أنك تريد حذف هذه المهمة؟')) removeTask(task.id);
  });

  actions.appendChild(doneBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  container.appendChild(left);
  container.appendChild(actions);

  return container;
}

// ----------------- Edit modal handlers -----------------
let currentEditId = null;
async function openEditModal(task) {
  currentEditId = task.id;
  document.getElementById('edit-name').value = task.name || '';
  document.getElementById('edit-date').value = task.date || '';
  document.getElementById('edit-time').value = task.time || '';
  document.getElementById('edit-notes').value = task.notes || '';
  editModal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', () => {
  editModal.classList.add('hidden');
  currentEditId = null;
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEditId) return;
  const updated = {
    name: document.getElementById('edit-name').value,
    date: document.getElementById('edit-date').value,
    time: document.getElementById('edit-time').value,
    notes: document.getElementById('edit-notes').value
  };
  await updateTask(currentEditId, updated);
  editModal.classList.add('hidden');
  currentEditId = null;
});

// ----------------- Local buttons -----------------
refreshBtn.addEventListener('click', () => {
  if (tasksCollectionRef) subscribeTasksRealtime();
  else loadLocalTasks();
});

clearLocalBtn.addEventListener('click', () => {
  if (confirm('مسح كل المهام المحفوظة محلياً؟')) {
    localStorage.removeItem('khaled_tasks_v1');
    renderTasks([]);
  }
});

// ----------------- Startup -----------------
initFirebaseAndAuth();
setStatus('IDLE');

// If there's no Firebase config, tell user how to set it up:
if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
  console.info('Firebase not configured. To enable cloud sync, set firebaseConfig in script.js and deploy.');
}
