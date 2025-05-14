document.addEventListener('DOMContentLoaded', function() {
    // Конфігурація Firebase (заповніть своїми даними)
    const firebaseConfig = {
        apiKey: localStorage.getItem('firebase-api-key') || '',
        projectId: localStorage.getItem('firebase-project-id') || '',
        databaseURL: localStorage.getItem('firebase-db-url') || ''
    };

    // Ініціалізація Firebase (якщо налаштовано)
    let firebaseApp, database;
    if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL) {
        try {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            updateStorageStatus('Хмарне сховище (Firebase)', 'fa-cloud');
        } catch (error) {
            console.error('Помилка ініціалізації Firebase:', error);
            updateStorageStatus('Помилка Firebase', 'fa-exclamation-circle', 'var(--danger-color)');
        }
    }

    // Елементи DOM
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDatetime = document.getElementById('task-datetime');
    const taskList = document.getElementById('task-list');
    const totalTasksElement = document.getElementById('total-tasks');
    const completedTasksElement = document.getElementById('completed-tasks');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cloudSyncSwitch = document.getElementById('cloud-sync');
    const backupBtn = document.getElementById('backup-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const storageStatus = document.getElementById('storage-status');
    
    // Модальні вікна
    const editModal = document.getElementById('edit-modal');
    const firebaseModal = document.getElementById('firebase-modal');
    const editTaskInput = document.getElementById('edit-task-input');
    const editTaskDatetime = document.getElementById('edit-task-datetime');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const closeButtons = document.querySelectorAll('.close-btn');
    const saveFirebaseBtn = document.getElementById('save-firebase-btn');
    
    // Елементи налаштувань Firebase
    const firebaseApiKey = document.getElementById('firebase-api-key');
    const firebaseProjectId = document.getElementById('firebase-project-id');
    const firebaseDbUrl = document.getElementById('firebase-db-url');
    
    // Заповнення полів Firebase, якщо вони є в localStorage
    if (firebaseConfig.apiKey) firebaseApiKey.value = firebaseConfig.apiKey;
    if (firebaseConfig.projectId) firebaseProjectId.value = firebaseConfig.projectId;
    if (firebaseConfig.databaseURL) firebaseDbUrl.value = firebaseConfig.databaseURL;
    
    // Змінні для редагування
    let currentEditId = null;
    let useCloudSync = localStorage.getItem('useCloudSync') === 'true';
    cloudSyncSwitch.checked = useCloudSync;
    
    // Завантаження завдань при запуску
    loadTasks();
    updateStats();
    
    // Обробники подій
    taskForm.addEventListener('submit', handleAddTask);
    cloudSyncSwitch.addEventListener('change', handleCloudSyncChange);
    backupBtn.addEventListener('click', createBackup);
    exportBtn.addEventListener('click', exportTasks);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importTasks);
    saveEditBtn.addEventListener('click', saveEditedTask);
    saveFirebaseBtn.addEventListener('click', saveFirebaseSettings);
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterTasks(this.dataset.filter);
        });
    });
    
    // Відкриття модального вікна Firebase при включенні синхронізації
    cloudSyncSwitch.addEventListener('click', function(e) {
        if (this.checked && !firebaseApp) {
            e.preventDefault();
            firebaseModal.style.display = 'flex';
        }
    });
    
    // Функції
    function handleAddTask(e) {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        const taskTime = taskDatetime.value;
        
        if (taskText !== '') {
            const task = {
                id: Date.now(),
                text: taskText,
                completed: false,
                time: taskTime,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            addTaskToDOM(task);
            saveTask(task);
            taskInput.value = '';
            taskDatetime.value = '';
            updateStats();
        }
    }
    
    function handleCloudSyncChange(e) {
        useCloudSync = e.target.checked;
        localStorage.setItem('useCloudSync', useCloudSync);
        
        if (useCloudSync && !firebaseApp) {
            firebaseModal.style.display = 'flex';
            e.target.checked = false;
        } else if (useCloudSync && firebaseApp) {
            syncWithFirebase();
            updateStorageStatus('Хмарне сховище (Firebase)', 'fa-cloud');
        } else {
            updateStorageStatus('Локальне сховище', 'fa-check-circle');
        }
    }
    
    function addTaskToDOM(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        
        const timeString = task.time ? new Date(task.time).toLocaleString() : 'Без терміну';
        
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
            </div>
            <div class="task-time">${timeString}</div>
            <div class="task-actions">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        const checkbox = li.querySelector('.task-checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        const taskText = li.querySelector('.task-text');
        
        checkbox.addEventListener('change', function() {
            task.completed = this.checked;
            task.updatedAt = new Date().toISOString();
            taskText.classList.toggle('completed', this.checked);
            saveTask(task);
            updateStats();
        });
        
        editBtn.addEventListener('click', function() {
            openEditModal(task);
        });
        
        deleteBtn.addEventListener('click', function() {
            li.remove();
            deleteTask(task.id);
            updateStats();
        });
        
        taskList.appendChild(li);
    }
    
    function openEditModal(task) {
        currentEditId = task.id;
        editTaskInput.value = task.text;
        editTaskDatetime.value = task.time;
        editModal.style.display = 'flex';
    }
    
    function saveEditedTask() {
        const newText = editTaskInput.value.trim();
        const newTime = editTaskDatetime.value;
        
        if (newText !== '') {
            updateTask(currentEditId, newText, newTime);
            editModal.style.display = 'none';
        }
    }
    
    function updateTask(id, newText, newTime) {
        const tasks = getTasksFromLocalStorage();
        const taskIndex = tasks.findIndex(task => task.id == id);
        
        if (taskIndex !== -1) {
            tasks[taskIndex].text = newText;
            tasks[taskIndex].time = newTime;
            tasks[taskIndex].updatedAt = new Date().toISOString();
            
            saveAllTasks(tasks);
            
            // Оновлення в DOM
            const taskElement = document.querySelector(`li[data-id="${id}"]`);
            if (taskElement) {
                const taskText = taskElement.querySelector('.task-text');
                const taskTime = taskElement.querySelector('.task-time');
                
                taskText.textContent = newText;
                taskTime.textContent = newTime ? new Date(newTime).toLocaleString() : 'Без терміну';
            }
        }
    }
    
    function filterTasks(filter) {
        const tasks = document.querySelectorAll('#task-list li');
        
        tasks.forEach(task => {
            const isCompleted = task.querySelector('.task-checkbox').checked;
            
            switch(filter) {
                case 'all':
                    task.style.display = 'flex';
                    break;
                case 'completed':
                    task.style.display = isCompleted ? 'flex' : 'none';
                    break;
                case 'active':
                    task.style.display = isCompleted ? 'none' : 'flex';
                    break;
            }
        });
    }
    
    function updateStats() {
        const tasks = getTasksFromLocalStorage();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        
        totalTasksElement.textContent = `${totalTasks} ${pluralize(totalTasks, ['завдання', 'завдань', 'завдань'])}`;
        completedTasksElement.textContent = `${completedTasks} виконано`;
    }
    
    function pluralize(number, words) {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[
            number % 100 > 4 && number % 100 < 20 
                ? 2 
                : cases[Math.min(number % 10, 5)]
        ];
    }
    
    // Робота з даними
    function saveTask(task) {
        if (useCloudSync && firebaseApp) {
            saveTaskToFirebase(task);
        } else {
            saveTaskToLocalStorage(task);
        }
    }
    
    function saveAllTasks(tasks) {
        if (useCloudSync && firebaseApp) {
            saveAllTasksToFirebase(tasks);
        } else {
            saveAllTasksToLocalStorage(tasks);
        }
    }
    
    function deleteTask(id) {
        if (useCloudSync && firebaseApp) {
            deleteTaskFromFirebase(id);
        } else {
            removeTaskFromLocalStorage(id);
        }
    }
    
    // Локальне сховище
    function saveTaskToLocalStorage(task) {
        let tasks = getTasksFromLocalStorage();
        const existingIndex = tasks.findIndex(t => t.id === task.id);
        
        if (existingIndex !== -1) {
            tasks[existingIndex] = task;
        } else {
            tasks.push(task);
        }
        
        localStorage.setItem('tasks', JSON.stringify(tasks));
        createLocalBackup(tasks);
    }
    
    function saveAllTasksToLocalStorage(tasks) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        createLocalBackup(tasks);
    }
    
    function getTasksFromLocalStorage() {
        return localStorage.getItem('tasks') 
            ? JSON.parse(localStorage.getItem('tasks')) 
            : [];
    }
    
    function removeTaskFromLocalStorage(id) {
        let tasks = getTasksFromLocalStorage();
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        createLocalBackup(tasks);
    }
    
    function loadTasks() {
        const tasks = getTasksFromLocalStorage();
        tasks.forEach(task => addTaskToDOM(task));
    }
    
    // Firebase
    function saveFirebaseSettings() {
        const apiKey = firebaseApiKey.value.trim();
        const projectId = firebaseProjectId.value.trim();
        const dbUrl = firebaseDbUrl.value.trim();
        
        if (apiKey && projectId && dbUrl) {
            localStorage.setItem('firebase-api-key', apiKey);
            localStorage.setItem('firebase-project-id', projectId);
            localStorage.setItem('firebase-db-url', dbUrl);
            
            try {
                firebaseApp = firebase.initializeApp({
                    apiKey: apiKey,
                    projectId: projectId,
                    databaseURL: dbUrl
                });
                database = firebase.database();
                
                cloudSyncSwitch.checked = true;
                useCloudSync = true;
                localStorage.setItem('useCloudSync', 'true');
                
                syncWithFirebase();
                firebaseModal.style.display = 'none';
                updateStorageStatus('Хмарне сховище (Firebase)', 'fa-cloud');
            } catch (error) {
                console.error('Помилка ініціалізації Firebase:', error);
                updateStorageStatus('Помилка Firebase', 'fa-exclamation-circle', 'var(--danger-color)');
            }
        }
    }
    
    function saveTaskToFirebase(task) {
        database.ref('tasks/' + task.id).set(task)
            .then(() => {
                console.log('Завдання збережено в Firebase');
                saveTaskToLocalStorage(task); // Локальний кеш
            })
            .catch(error => {
                console.error('Помилка збереження в Firebase:', error);
                saveTaskToLocalStorage(task); // Резервне збереження
                updateStorageStatus('Помилка синхронізації', 'fa-exclamation-triangle', 'var(--danger-color)');
            });
    }
    
    function saveAllTasksToFirebase(tasks) {
        database.ref('tasks').set(tasks)
            .then(() => {
                console.log('Всі завдання збережено в Firebase');
                saveAllTasksToLocalStorage(tasks); // Локальний кеш
            })
            .catch(error => {
                console.error('Помилка збереження в Firebase:', error);
                saveAllTasksToLocalStorage(tasks); // Резервне збереження
                updateStorageStatus('Помилка синхронізації', 'fa-exclamation-triangle', 'var(--danger-color)');
            });
    }
    
    function deleteTaskFromFirebase(id) {
        database.ref('tasks/' + id).remove()
            .then(() => {
                console.log('Завдання видалено з Firebase');
                removeTaskFromLocalStorage(id); // Локальний кеш
            })
            .catch(error => {
                console.error('Помилка видалення з Firebase:', error);
                removeTaskFromLocalStorage(id); // Резервне видалення
                updateStorageStatus('Помилка синхронізації', 'fa-exclamation-triangle', 'var(--danger-color)');
            });
    }
    
    function syncWithFirebase() {
        if (!firebaseApp) return;
        
        database.ref('tasks').once('value')
            .then(snapshot => {
                const firebaseTasks = snapshot.val() || {};
                const tasksArray = Object.values(firebaseTasks);
                
                // Оновлюємо локальне сховище
                localStorage.setItem('tasks', JSON.stringify(tasksArray));
                createLocalBackup(tasksArray);
                
                // Оновлюємо DOM
                taskList.innerHTML = '';
                tasksArray.forEach(task => addTaskToDOM(task));
                updateStats();
                
                updateStorageStatus('Хмарне сховище (Firebase)', 'fa-cloud');
            })
            .catch(error => {
                console.error('Помилка синхронізації з Firebase:', error);
                updateStorageStatus('Помилка синхронізації', 'fa-exclamation-triangle', 'var(--danger-color)');
            });
    }
    
    // Резервне копіювання та експорт/імпорт
    function createBackup() {
        const tasks = getTasksFromLocalStorage();
        createLocalBackup(tasks);
        alert(`Резервна копія створена (${tasks.length} завдань)`);
    }
    
    function createLocalBackup(tasks) {
        localStorage.setItem('tasks_backup_' + Date.now(), JSON.stringify(tasks));
        
        // Видаляємо старі резервні копії (залишаємо 5 останніх)
        const backups = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('tasks_backup_')) {
                backups.push({
                    key: key,
                    timestamp: parseInt(key.replace('tasks_backup_', ''))
                });
            }
        }
        
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        if (backups.length > 5) {
            for (let i = 5; i < backups.length; i++) {
                localStorage.removeItem(backups[i].key);
            }
        }
    }
    
    function exportTasks() {
        const tasks = getTasksFromLocalStorage();
        const dataStr = JSON.stringify(tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `tasks_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    function importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (confirm(`Імпортувати завдання з файлу ${file.name}? Поточні завдання будуть перезаписані.`)) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const tasks = JSON.parse(e.target.result);
                    if (Array.isArray(tasks)) {
                        saveAllTasks(tasks);
                        taskList.innerHTML = '';
                        tasks.forEach(task => addTaskToDOM(task));
                        updateStats();
                        alert(`Успішно імпортовано ${tasks.length} завдань`);
                    } else {
                        throw new Error('Невірний формат даних');
                    }
                } catch (error) {
                    alert('Помилка імпорту: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
        event.target.value = ''; // Скидаємо значення input
    }
    
    function updateStorageStatus(text, icon, color = '') {
        storageStatus.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        if (color) {
            storageStatus.querySelector('i').style.color = color;
        }
    }
});
