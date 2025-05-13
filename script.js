document.addEventListener('DOMContentLoaded', function() {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    
    // Завантаження завдань з локального сховища
    loadTasks();
    
    // Додавання нового завдання
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        
        if (taskText !== '') {
            addTask(taskText);
            saveTaskToLocalStorage(taskText);
            taskInput.value = '';
        }
    });
    
    // Додавання завдання до списку
    function addTask(taskText) {
        const li = document.createElement('li');
        li.innerHTML = `
            ${taskText}
            <button class="delete-btn">Видалити</button>
        `;
        
        li.querySelector('.delete-btn').addEventListener('click', function() {
            li.remove();
            removeTaskFromLocalStorage(taskText);
        });
        
        taskList.appendChild(li);
    }
    
    // Збереження завдання у локальне сховище
    function saveTaskToLocalStorage(task) {
        let tasks;
        if (localStorage.getItem('tasks') === null) {
            tasks = [];
        } else {
            tasks = JSON.parse(localStorage.getItem('tasks'));
        }
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Видалення завдання з локального сховища
    function removeTaskFromLocalStorage(task) {
        let tasks = JSON.parse(localStorage.getItem('tasks'));
        tasks = tasks.filter(t => t !== task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Завантаження завдань з локального сховища
    function loadTasks() {
        let tasks;
        if (localStorage.getItem('tasks') === null) {
            tasks = [];
        } else {
            tasks = JSON.parse(localStorage.getItem('tasks'));
        }
        
        tasks.forEach(task => {
            addTask(task);
        });
    }
});
