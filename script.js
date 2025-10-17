// Wait for Firebase modules to load from index.html
async function waitForFirebase() {
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (window.firebaseModules) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });
}

// Initialize everything after Firebase modules are ready
waitForFirebase().then(initApp);

async function initApp() {
  const { initializeApp, getAuth, signInAnonymously, onAuthStateChanged, getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } = window.firebaseModules;

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

  // UI Elements
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
  const testVoiceBtn = document.getElementById('test-voice-btn');

  const GOLD = "#FFD700";
  const KHALED_NAME = "أستاذ خالد";
  const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  // التحقق من دعم المتصفح
  function checkBrowserSupport() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      voiceStatus.textContent = '⚠️ المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.';
      micButton.disabled = true;
      return false;
    }
    return true;
  }

  // Three.js Background
  function initThreeJS() {
    const container = document.getElementById('three-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  initThreeJS();

  // Voice Recognition - الإصدار المحسن
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let recognitionState = 'IDLE';
  let currentTask = {};

  // In-memory task storage (fallback)
  let tasksInMemory = [];

  const statusMessages = {
    IDLE: '🎤 اضغط على الميكروفون لبدء مهمة جديدة (يجب استخدام Chrome أو Edge)',
    AWAITING_TASK_NAME: '🎙️ قل اسم المهمة الآن...',
    AWAITING_DATE_TIME: '📅 قل التاريخ والوقت (مثال: غداً الساعة 3 عصراً)...',
    AWAITING_NOTES_CONFIRM: '📝 هل تريد إضافة ملاحظات؟',
    AWAITING_NOTES: '🗒️ قل ملاحظاتك الآن...',
    PROCESSING: '⚡ جارِ معالجة الإدخال...'
  };

  function setStatus(state, preview = '') {
    recognitionState = state;
    voiceStatus.textContent = statusMessages[state] || '';
    if (preview) voicePreview.textContent = preview;
    
    nextBtn.classList.toggle('hidden', !(state === 'AWAITING_TASK_NAME' || state === 'AWAITING_DATE_TIME'));
    submitBtn.classList.toggle('hidden', !(state === 'AWAITING_NOTES'));
    notesConfirmation.classList.toggle('hidden', state !== 'AWAITING_NOTES_CONFIRM');
  }

  // تهيئة التعرف على الصوت
  if (Recognition) {
    recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ar-SA'; // استخدام العربية السعودية (أكثر استقراراً)
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 بدء الاستماع...');
      isListening = true;
      micButton.classList.add('listening');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('✅ تم التعرف:', transcript);
      handleTranscript(transcript);
    };

    recognition.onerror = (event) => {
      console.error('❌ خطأ في التعرف:', event.error);
      isListening = false;
      micButton.classList.remove('listening');
      
      let errorMessage = 'خطأ في الميكروفون: ';
      switch(event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = 'السماح باستخدام الميكروفون مطلوب. اضغط على أيقونة القفل في شريط العنوان واسمح بالوصول.';
          break;
        case 'network':
          errorMessage = 'خطأ في الشبكة. تحقق من اتصال الإنترنت.';
          break;
        default:
          errorMessage += event.error;
      }
      
      setStatus('IDLE', errorMessage);
    };

    recognition.onend = () => {
      console.log('🛑 انتهى الاستماع');
      isListening = false;
      micButton.classList.remove('listening');
    };
  } else {
    voiceStatus.textContent = '⚠️ المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.';
    micButton.disabled = true;
  }

  function startRecognition(state) {
    if (!recognition) {
      setStatus('IDLE', 'المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.');
      return;
    }

    // إيقاف أي استماع سابق
    if (isListening) {
      recognition.stop();
    }

    try {
      // إعادة تعيين الإعدادات
      recognition.lang = 'ar-SA';
      recognition.start();
      setStatus(state);
      
      // إخفاء الزر بعد 60 ثانية كإجراء أمان
      setTimeout(() => {
        if (isListening) {
          recognition.stop();
          setStatus('IDLE', 'انتهى وقت الاستماع. اضغط على الميكروفون للمحاولة مرة أخرى.');
        }
      }, 60000);
      
    } catch (error) {
      console.error('فشل بدء الميكروفون:', error);
      
      if (error.message.includes('already started')) {
        recognition.stop();
        setTimeout(() => startRecognition(state), 500);
      } else {
        setStatus('IDLE', 'فشل بدء الميكروفون. تأكد من السماح بالوصول إلى الميكروفون.');
      }
    }
  }

  function toggleMic() {
    if (isListening && recognition) {
      recognition.stop();
      isListening = false;
      setStatus('IDLE');
      return;
    }
    currentTask = {};
    startRecognition('AWAITING_TASK_NAME');
  }

  function handleTranscript(transcript) {
    if (!transcript) return;
    const lower = transcript.trim();
    if (recognitionState === 'AWAITING_TASK_NAME') {
      currentTask.name = lower;
      voicePreview.textContent = `🎤 تم سماع اسم المهمة: ${currentTask.name}`;
      startRecognition('AWAITING_DATE_TIME');
    } else if (recognitionState === 'AWAITING_DATE_TIME') {
      parseDateAndTime(lower);
      voicePreview.textContent = buildPreview();
      setStatus('AWAITING_NOTES_CONFIRM', voicePreview.textContent);
    } else if (recognitionState === 'AWAITING_NOTES') {
      currentTask.notes = lower;
      voicePreview.textContent = buildPreview();
    }
  }

  nextBtn.addEventListener('click', () => {
    if (recognitionState === 'AWAITING_TASK_NAME') {
      if (!currentTask.name) {
        voicePreview.textContent = 'لم يتم التعرف على اسم المهمة. حاول مرة أخرى.';
        return;
      }
      startRecognition('AWAITING_DATE_TIME');
    } else if (recognitionState === 'AWAITING_DATE_TIME') {
      if (!currentTask.date) {
        parseDateAndTime(voicePreview.textContent || '');
      }
      setStatus('AWAITING_NOTES_CONFIRM', buildPreview());
    }
  });

  confirmYesBtn.addEventListener('click', () => {
    startRecognition('AWAITING_NOTES');
  });

  confirmNoBtn.addEventListener('click', () => {
    currentTask.notes = '';
    finalizeTask();
  });

  submitBtn.addEventListener('click', () => {
    if (recognitionState === 'AWAITING_NOTES' && recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
    finalizeTask();
  });

  micButton.addEventListener('click', toggleMic);

  function parseDateAndTime(text) {
    const now = new Date();
    let year = now.getFullYear();
    let day = now.getDate();
    let monthIndex = now.getMonth();
    let time = '12:00';

    for (let i = 0; i < ARABIC_MONTHS.length; i++) {
      if (text.includes(ARABIC_MONTHS[i])) {
        monthIndex = i;
        break;
      }
    }

    const dmatch = text.match(/(\d{1,2})/);
    if (dmatch) day = parseInt(dmatch[1]);

    const tmatch = text.match(/(\d{1,2})(?:[:\.](\d{2}))?\s*(?:ص|صباح|م|مساء|مساءً)?/);
    if (tmatch) {
      let hour = parseInt(tmatch[1]);
      const minute = tmatch[2] ? tmatch[2] : '00';
      if (/(مساء|م|مساءً)/.test(text) && hour < 12) hour += 12;
      time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const d = new Date(year, monthIndex, day);
    currentTask.date = d.toISOString().split('T')[0];
    currentTask.time = time;
  }

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

  function speakArabic(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('No speech synthesis available');
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-EG';
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const v = voices.find(v => /arabic|google|zagros|majid/i.test(v.name)) || 
                voices.find(v => v.lang && v.lang.startsWith('ar')) || 
                voices[0];
      if (v) utter.voice = v;
    }
    utter.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // Firebase initialization
  let app, auth, db, userId = null, tasksCollectionRef;

  async function initFirebaseAndAuth() {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      await signInAnonymously(auth);
      onAuthStateChanged(auth, (user) => {
        if (user) {
          userId = user.uid;
          tasksCollectionRef = collection(db, `artifacts/khaled_voice_tasks/users/${userId}/tasks`);
          subscribeTasksRealtime();
        } else {
          console.error('No firebase user found.');
          loadingMessage.textContent = 'فشل تسجيل الدخول';
        }
      });
    } catch (e) {
      console.error('Firebase init error:', e);
      loadingMessage.textContent = 'خطأ في إعداد Firebase: ' + e.message;
      renderTasks(tasksInMemory);
    }
  }

  function subscribeTasksRealtime() {
    if (!tasksCollectionRef) return;
    try {
      const q = query(tasksCollectionRef, orderBy('createdAt'));
      onSnapshot(q, (snapshot) => {
        tasksInMemory = [];
        snapshot.forEach(d => tasksInMemory.push({ id: d.id, ...d.data() }));
        tasksInMemory.sort((a,b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA - dateB;
        });
        renderTasks(tasksInMemory);
      }, (err) => {
        console.error('Snapshot error', err);
        loadingMessage.textContent = 'خطأ في جلب المهام: ' + err.message;
      });
    } catch(e) {
      console.error('subscribeTasksRealtime error', e);
    }
  }

  async function finalizeTask() {
    setStatus('PROCESSING', buildPreview());
    const taskData = {
      name: currentTask.name || 'مهمة بدون اسم',
      date: currentTask.date || new Date().toISOString().split('T')[0],
      time: currentTask.time || '12:00',
      notes: currentTask.notes || '',
      createdAt: serverTimestamp(),
      completed: false
    };

    try {
      if (tasksCollectionRef) {
        await addDoc(tasksCollectionRef, taskData);
      } else {
        tasksInMemory.push({ id: 'mem-' + Date.now(), ...taskData, createdAt: new Date() });
        renderTasks(tasksInMemory);
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
        const docRef = doc(db, `artifacts/khaled_voice_tasks/users/${userId}/tasks`, id);
        await updateDoc(docRef, payload);
      } else {
        const idx = tasksInMemory.findIndex(t => t.id === id);
        if (idx !== -1) {
          tasksInMemory[idx] = { ...tasksInMemory[idx], ...payload };
          renderTasks(tasksInMemory);
        }
      }
    } catch (e) {
      console.error('Error updating task:', e);
      alert('فشل تحديث المهمة: ' + e.message);
    }
  }

  async function deleteTask(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    
    try {
      if (tasksCollectionRef) {
        const docRef = doc(db, `artifacts/khaled_voice_tasks/users/${userId}/tasks`, id);
        await deleteDoc(docRef);
      } else {
        tasksInMemory = tasksInMemory.filter(t => t.id !== id);
        renderTasks(tasksInMemory);
      }
      speakArabic('تم حذف المهمة بنجاح');
    } catch (e) {
      console.error('Error deleting task:', e);
      alert('فشل حذف المهمة: ' + e.message);
    }
  }

  function renderTasks(tasks) {
    if (!tasks.length) {
      tasksList.innerHTML = '<p class="text-center text-gray-400">لا توجد مهام حالياً</p>';
      return;
    }

    tasksList.innerHTML = tasks.map(task => `
      <div class="task-item ${task.completed ? 'task-done' : ''}" data-id="${task.id}">
        <div class="flex justify-between items-start gap-3">
          <div class="flex gap-2">
            <button class="complete-btn w-6 h-6 rounded-full border-2 ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'}" 
                    title="${task.completed ? 'تم الانتهاء' : '标记完成'}">
              ${task.completed ? '✓' : ''}
            </button>
            <button class="edit-btn text-blue-400 hover:text-blue-300" title="تعديل">✏️</button>
            <button class="delete-btn text-red-400 hover:text-red-300" title="حذف">🗑️</button>
          </div>
          <div class="flex-1 text-right">
            <h3 class="font-bold text-white ${task.completed ? 'line-through' : ''}">${task.name}</h3>
            <p class="text-sm text-gray-300 mt-1">
              📅 ${formatArabicDate(task.date)} 
              ⏰ ${task.time}
            </p>
            ${task.notes ? `<p class="text-sm text-gray-400 mt-1">📝 ${task.notes}</p>` : ''}
            <p class="text-xs text-gray-500 mt-1">
              ${task.createdAt ? `أنشئت في: ${formatFirebaseTimestamp(task.createdAt)}` : ''}
            </p>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners to task buttons
    document.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.closest('.task-item').dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          updateTask(taskId, { completed: !task.completed });
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.closest('.task-item').dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          openEditModal(task);
        }
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.closest('.task-item').dataset.id;
        deleteTask(taskId);
      });
    });
  }

  function formatArabicDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = ARABIC_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function formatFirebaseTimestamp(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function openEditModal(task) {
    document.getElementById('edit-name').value = task.name;
    document.getElementById('edit-date').value = task.date;
    document.getElementById('edit-time').value = task.time;
    document.getElementById('edit-notes').value = task.notes || '';
    
    editModal.style.display = 'flex';
    
    // Store current task ID for form submission
    editForm.dataset.editingTaskId = task.id;
  }

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = editForm.dataset.editingTaskId;
    const updatedData = {
      name: document.getElementById('edit-name').value,
      date: document.getElementById('edit-date').value,
      time: document.getElementById('edit-time').value,
      notes: document.getElementById('edit-notes').value
    };
    
    await updateTask(taskId, updatedData);
    closeEditModal();
    speakArabic('تم تحديث المهمة بنجاح');
  });

  closeModalBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  function closeEditModal() {
    editModal.style.display = 'none';
    editForm.reset();
    delete editForm.dataset.editingTaskId;
  }

  refreshBtn.addEventListener('click', () => {
    if (tasksCollectionRef) {
      subscribeTasksRealtime();
    } else {
      renderTasks(tasksInMemory);
    }
    speakArabic('تم تحديث قائمة المهام');
  });

  // Test voice button
  testVoiceBtn.addEventListener('click', () => {
    speakArabic('هذا اختبار للصوت. إذا سمعت هذا، فالنظام يعمل بشكل صحيح.');
  });

  // Initialize Firebase and authentication
  initFirebaseAndAuth();

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal.style.display === 'flex') {
        closeEditModal();
      }
      if (isListening && recognition) {
        recognition.stop();
        isListening = false;
        setStatus('IDLE');
      }
    }
    
    // Space bar to toggle microphone
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      toggleMic();
    }
  });

  // Welcome message
  setTimeout(() => {
    speakArabic(`مرحباً ${KHALED_NAME}، أنا مساعدك الصوتي لإدارة المهام. اضغط على الميكروفون أو مفتاح المسافة لبدء إضافة مهمة جديدة.`);
  }, 1000);

}
