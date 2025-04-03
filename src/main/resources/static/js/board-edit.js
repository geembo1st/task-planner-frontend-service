document.addEventListener('DOMContentLoaded', function () {

    const tasksList = document.getElementById('tasksList');
    const editBoardForm = document.getElementById('editBoardForm');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskModal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const editTaskModal = document.getElementById('editTaskModal');
    const editTaskForm = document.getElementById('editTaskForm');
    const closeEditModalBtn = document.querySelector('.close-edit-modal');


    const boardId = new URLSearchParams(window.location.search).get('boardId');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Требуется авторизация');
        window.location.href = '/login.html';
        return;
    }

    if (!boardId) {
        alert('Доска не выбрана');
        window.location.href = '/dashboard.html';
        return;
    }

    loadBoardData();
    loadTasks();

    // Обработчики событий
    editBoardForm.addEventListener('submit', saveBoardChanges);
    addTaskBtn.addEventListener('click', () => taskModal.style.display = 'block');
    closeModalBtn.addEventListener('click', () => taskModal.style.display = 'none');
    taskForm.addEventListener('submit', createNewTask);


    tasksList.addEventListener('click', function (e) {
        const taskId = e.target.dataset.taskId;

        if (e.target.classList.contains('mark-done')) {
            markTaskAsDone(taskId, e.target);
        } else if (e.target.classList.contains('edit-task')) {
            openEditModal(taskId);
        } else if (e.target.classList.contains('delete-task')) {
            deleteTask(taskId);
        }
    });


    async function loadBoardData() {
        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/boards/${boardId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки доски');

            const board = await response.json();
            document.getElementById('boardTitle').value = board.title;
            document.getElementById('boardDescription').value = board.description || '';
        } catch (error) {
            console.error('Ошибка:', error);
            alert(error.message);
        }
    }

    async function loadTasks() {
        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/boards/${boardId}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки задач');

            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Ошибка:', error);
            tasksList.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    function renderTasks(tasks) {
        if (!tasks || !Array.isArray(tasks)) {
            tasksList.innerHTML = '<p>Ошибка формата данных задач</p>';
            return;
        }

        if (tasks.length === 0) {
            tasksList.innerHTML = '<p>Нет задач для этой доски</p>';
            return;
        }

        tasksList.innerHTML = tasks.map(task => `
            <div class="task-card ${task.status?.toLowerCase() || 'new'}" data-task-id="${task.id}">
                <h4>${escapeHtml(task.title)}</h4>
                <p>${escapeHtml(task.description || 'Нет описания')}</p>
                <p>Статус: ${task.status || 'NEW'}</p>
                <p>Срок: ${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'не указан'}</p>
                <div class="task-actions">
                    ${task.status !== 'DONE' ? `
                        <button class="btn mark-done" data-task-id="${task.id}">
                            Отметить выполненной
                        </button>
                    ` : ''}
                    <button class="btn delete-task" data-task-id="${task.id}">
                        Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    async function saveBoardChanges(e) {
        e.preventDefault();

        const title = document.getElementById('boardTitle').value.trim();
        const description = document.getElementById('boardDescription').value.trim();

        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/boards/${boardId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({title, description})
            });

            if (!response.ok) throw new Error('Ошибка сохранения');

            alert('Изменения доски сохранены');
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка сохранения: ${error.message}`);
        }
    }

    async function createNewTask(e) {
        e.preventDefault();

        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;

        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/tasks/${boardId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    dueDate: dueDate || null,
                    status: 'NEW',
                    boardId: Number(boardId)
                })
            });

            if (!response.ok) throw new Error('Ошибка создания задачи');

            taskModal.style.display = 'none';
            taskForm.reset();
            loadTasks();
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка создания задачи: ${error.message}`);
        }
    }


    async function deleteTask(taskId) {
        if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;

        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Ошибка удаления задачи');

            loadTasks();
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка удаления задачи: ${error.message}`);
        }
    }

    async function markTaskAsDone(taskId, button) {
        try {
            const response = await fetch(`http://api-gateway:8081/api/v1/tasks/${taskId}/done`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Ошибка обновления задачи');

            loadTasks();
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка обновления задачи: ${error.message}`);
        }
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});