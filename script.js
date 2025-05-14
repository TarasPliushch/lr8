document.addEventListener('DOMContentLoaded', function() {
    // Елементи DOM
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDatetime = document.getElementById('task-datetime');
    const taskList = document.getElementById('task-list');
    const totalTasksElement = document.getElementById('total-tasks');
    const completedTasksElement = document.getElementById('completed-tasks');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Модальне вікно
    const editModal = document.getElementById('edit-modal');
    const editTaskInput = document.getElementById('edit-task-input');
    const editTaskDatetime = document.getElementById('edit-task-datetime');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const closeBtn = document.querySelector('.close-btn');
    
    // Змінні для редагування
    let currentEditId = null;
    
    // Завантаження завдань при запуску
    loadTasks();
    updateStats();
    
    // Додавання нового завдання
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        const taskTime = taskDatetime.value;
        
        if (taskText !== '') {
            const task = {
                id: Date.now(),
                text: taskText,
                completed: false,
                time: taskTime,
                createdAt: new Date().toISOString()
            };
            
            addTaskToDOM(task);
            saveTaskToLocalStorage(task);
            taskInput.value = '';
            taskDatetime.value = '';
            updateStats();
        }
    });
    
    // Фільтрація завдань
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterTasks(this.dataset.filter);
        });
    });
    
    // Додавання завдання до DOM
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
        
        // Обробники подій для кнопок
        const checkbox = li.querySelector('.task-checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        const taskText = li.querySelector('.task-text');
        
        checkbox.addEventListener('change', function() {
            task.completed = this.checked;
            taskText.classList.toggle('completed', this.checked);
            updateTaskInLocalStorage(task);
            updateStats();
        });
        
        editBtn.addEventListener('click', function() {
            openEditModal(task);
        });
        
        deleteBtn.addEventListener('click', function() {
            li.remove();
            removeTaskFromLocalStorage(task.id);
            updateStats();
        });
        
        taskList.appendChild(li);
    }
    
    // Відкриття модального вікна для редагування
    function openEditModal(task) {
        currentEditId = task.id;
        editTaskInput.value = task.text;
        editTaskDatetime.value = task.time;
        editModal.style.display = 'flex';
    }
    
    // Збереження змін після редагування
    saveEditBtn.addEventListener('click', function() {
        const newText = editTaskInput.value.trim();
        const newTime = editTaskDatetime.value;
        
        if (newText !== '') {
            updateTask(currentEditId, newText, newTime);
            editModal.style.display = 'none';
        }
    });
    
    // Закриття модального вікна
    closeBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Оновлення завдання
    function updateTask(id, newText, newTime) {
        const tasks = getTasksFromLocalStorage();
        const taskIndex = tasks.findIndex(task => task.id == id);
        
        if (taskIndex !== -1) {
            tasks[taskIndex].text = newText;
            tasks[taskIndex].time = newTime;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            
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
    
    // Фільтрація завдань
    function filterTasks(filter) {
        const tasks = document.querySelectorAll('#
