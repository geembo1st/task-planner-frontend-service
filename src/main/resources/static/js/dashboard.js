document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
        return;
    }

    const elements = {
        greeting: document.getElementById('greeting'),
        logoutBtn: document.getElementById('logoutBtn'),
        createBoardBtn: document.getElementById('createBoardBtn'),
        editProfileBtn: document.getElementById('editProfileBtn'),
        boardsList: document.getElementById('boardsList'),
        modal: document.getElementById('createBoardModal'),
        closeModal: document.querySelector('.close-modal'),
        createBoardForm: document.getElementById('createBoardForm'),
        boardTitle: document.getElementById('boardTitle'),
        boardDescription: document.getElementById('boardDescription'),
        boardTitleError: document.getElementById('boardTitleError')
    };

    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Не найден элемент: ${key}`);
            return;
        }
    }

    try {
        const user = await fetchApi('/api/v1/users/profile');
        elements.greeting.textContent = `Здравствуйте, ${escapeHtml(user.username)}, вот ваши доски`;
        await loadBoards(user.id);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        elements.greeting.textContent = 'Ошибка загрузки данных';
    }

    elements.logoutBtn.addEventListener('click', logout);
    elements.createBoardBtn.addEventListener('click', () => elements.modal.style.display = 'block');
    elements.closeModal.addEventListener('click', () => closeModal(elements.modal));
    elements.editProfileBtn.addEventListener('click', () => window.location.href = '/profile-edit.html');
    elements.createBoardForm.addEventListener('submit', handleBoardCreate);

    window.addEventListener('click', (event) => {
        if (event.target === elements.modal) {
            closeModal(elements.modal);
        }
    });

    function logout() {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        elements.createBoardForm.reset();
        elements.boardTitleError.textContent = '';
    }

    async function handleBoardCreate(e) {
        e.preventDefault();

        const title = elements.boardTitle.value.trim();
        const description = elements.boardDescription.value.trim();

        if (!title) {
            elements.boardTitleError.textContent = 'Название обязательно';
            return;
        }

        try {
            await fetchApi('/api/v1/boards', 'POST', { title, description });
            closeModal(elements.modal);
            const userId = await getCurrentUserId();
            await loadBoards(userId);
        } catch (error) {
            console.error('Ошибка создания доски:', error);
            elements.boardTitleError.textContent = error.message || 'Ошибка при создании доски';
        }
    }

    async function loadBoards(userId) {
        try {
            const boards = await fetchApi(`/api/v1/boards/user/${userId}`);
            const boardsWithTasks = await Promise.all(
                boards.map(async board => ({
                    ...board,
                    tasks: await fetchApi(`/api/v1/boards/${board.id}/tasks`).catch(() => []) // Если ошибка - пустой массив задач
                }))
            );
            renderBoards(boardsWithTasks);
        } catch (error) {
            console.error('Ошибка загрузки досок:', error);
            elements.boardsList.innerHTML = '<p class="error-message">Ошибка загрузки досок</p>';
        }
    }

    function renderBoards(boards) {
        elements.boardsList.innerHTML = '';

        if (!boards || boards.length === 0) {
            elements.boardsList.innerHTML = '<p class="no-boards">У вас пока нет досок</p>';
            return;
        }

        boards.forEach(board => {
            const boardElement = document.createElement('div');
            boardElement.className = 'board-card';
            boardElement.innerHTML = `
                <div class="board-header">
                    <h3 class="board-title">${escapeHtml(board.title)}</h3>
                    <div class="board-actions">
                        <button class="btn edit-board" data-board-id="${board.id}">Редактировать</button>
                        <button class="btn delete-board" data-board-id="${board.id}">Удалить</button>
                    </div>
                </div>
                ${board.description ? `<p class="board-description">${escapeHtml(board.description)}</p>` : ''}
                <p class="board-date">Создано: ${formatDate(board.createdAt)}</p>
                <div class="tasks-container">
                    <h4>Задачи:</h4>
                    <div class="tasks-list">${renderTasks(board.tasks || [])}</div>
                </div>
            `;
            elements.boardsList.appendChild(boardElement);
        });

        document.querySelectorAll('.delete-board').forEach(btn => {
            btn.addEventListener('click', () => handleBoardDelete(btn.dataset.boardId));
        });

        document.querySelectorAll('.edit-board').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = `/board-edit.html?boardId=${btn.dataset.boardId}`;
            });
        });
    }

    async function handleBoardDelete(boardId) {
        if (!confirm('Вы уверены, что хотите удалить эту доску? Все задачи также будут удалены.')) return;

        try {
            await fetchApi(`/api/v1/boards/${boardId}`, 'DELETE');
            const userId = await getCurrentUserId();
            await loadBoards(userId);
        } catch (error) {
            console.error('Ошибка удаления доски:', error);
            alert('Ошибка при удалении: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    function renderTasks(tasks) {
        if (!tasks || tasks.length === 0) return '<p class="no-tasks">Нет задач</p>';

        return tasks.map(task => `
            <div class="task-item">
                <div class="task-main">
                    <h5 class="task-title">${escapeHtml(task.title)}</h5>
                    <span class="task-status ${(task.status || 'NEW').toLowerCase()}">${task.status || 'NEW'}</span>
                </div>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                ${task.dueDate ? `<p class="task-due">Выполнить до: ${formatDate(task.dueDate)}</p>` : ''}
                <div class="task-actions">
                    <button class="btn mark-done" data-task-id="${task.id}">
                        ${task.status === 'DONE' ? 'Вернуть в работу' : 'Выполнить'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateString) {
        if (!dateString) return 'не указана';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    }
});

async function getCurrentUserId() {
    const user = await fetchApi('/api/v1/users/profile');
    return user.id;
}

async function fetchApi(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        throw new Error('Not authenticated');
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`http://api-gateway:8081${endpoint}`, options);

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Ошибка API');
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }

    return response.json();
}