document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
        return;
    }

    const greetingElement = document.getElementById('greeting');
    const logoutBtn = document.getElementById('logoutBtn');
    const createBoardBtn = document.getElementById('createBoardBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const boardsList = document.getElementById('boardsList');
    const statusFilter = document.getElementById('statusFilter');
    const modal = document.getElementById('createBoardModal');
    const closeModal = document.querySelector('.close-modal');
    const createBoardForm = document.getElementById('createBoardForm');

    try {
        const user = await fetchApi('/api/v1/users/profile');
        greetingElement.textContent = `Здравствуйте, ${user.username}, вот ваши доски`;

        await loadBoards(user.id);
    } catch (error) {
        showError('greeting', 'Ошибка загрузки данных: ' + error.message);
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/index.html';
    });

    createBoardBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    editProfileBtn.addEventListener('click', () => {
        window.location.href = '/profile-edit.html';
    });

    statusFilter.addEventListener('change', async () => {
        const userId = await getCurrentUserId();
        await loadBoards(userId);
    });

    createBoardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('boardTitle').value.trim();
        const description = document.getElementById('boardDescription').value.trim();

        try {
            await fetchApi('/api/v1/boards', 'POST', {
                title,
                description
            });

            modal.style.display = 'none';
            createBoardForm.reset();
            const userId = await getCurrentUserId();
            await loadBoards(userId);
        } catch (error) {
            showError('boardTitleError', error.message);
        }
    });

    async function loadBoards(userId) {
        try {
            const boards = await fetchApi(`/api/v1/boards/user/${userId}`);

            const boardsWithTasks = await Promise.all(
                boards.map(async board => {
                    const tasks = await fetchApi(`/api/v1/boards/${board.id}/tasks`);
                    return {...board, tasks};
                })
            );

            renderBoards(boardsWithTasks);
        } catch (error) {
            showError('boardsList', 'Ошибка загрузки досок: ' + error.message);
        }
    }

    function renderBoards(boards) {
        boardsList.innerHTML = '';

        if (boards.length === 0) {
            boardsList.innerHTML = '<p>У вас пока нет досок</p>';
            return;
        }

        boards.forEach(board => {
            const boardElement = document.createElement('div');
            boardElement.className = 'board-card';
            boardElement.innerHTML = `
                <div class="board-header">
                    <h3 class="board-title">${board.title}</h3>
                    <div class="board-actions">
                        <button onclick="location.href='/board-edit.html?boardId=${board.id}'" class="btn">Редактировать</button>
                        <button onclick="deleteBoard(${board.id})" class="btn delete-btn">Удалить</button>
                    </div>
                </div>
                ${board.description ? `<p class="board-description">${board.description}</p>` : ''}
                <p class="board-date">Создано: ${new Date(board.createdAt).toLocaleString()}</p>
                
                <div class="tasks-container">
                    <h4>Задачи:</h4>
                    <div class="tasks-list" id="tasks-${board.id}">
                        ${renderTasks(board.tasks || [])}
                    </div>
                </div>
            `;
            boardsList.appendChild(boardElement);
        });
    }

    function renderTasks(tasks) {
        if (tasks.length === 0) {
            return '<p class="no-tasks">Нет задач</p>';
        }

        return tasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-main">
                    <h5 class="task-title">${task.title}</h5>
                </div>
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
                ${task.dueDate ? `<p class="task-due">Выполнить до: ${new Date(task.dueDate).toLocaleString()}</p>` : ''}
                <div class="task-actions">
                    <button class="btn mark-done" data-task-id="${task.id}">
                        ${task.status === 'DONE' ? 'Вернуть в работу' : 'Выполнить'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.deleteBoard = async (boardId) => {
        if (confirm('Вы уверены, что хотите удалить эту доску?')) {
            try {
                const response = await fetch(`http://localhost:8081/api/v1/boards/${boardId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Ошибка при удалении');
                }

                if (response.status !== 204) {
                    await response.json();
                }

                const userId = await getCurrentUserId();
                await loadBoards(userId);
            } catch (error) {
                console.error('Ошибка удаления доски:', error);
                alert(`Ошибка при удалении: ${error.message}`);
            }
        }
    };

    window.markTaskDone = async (taskId) => {
        try {
            await fetchApi(`/api/v1/tasks/${taskId}/done`, 'PATCH');
            const userId = await getCurrentUserId();
            await loadBoards(userId);
        } catch (error) {
            alert('Ошибка изменения статуса: ' + error.message);
        }
    };
});

async function getCurrentUserId() {
    const user = await fetchApi('/api/v1/users/profile');
    return user.id;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
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

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:8081${endpoint}`, options);

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Session expired');
    }

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || 'Ошибка API');
        } catch {
            throw new Error(errorText || 'Ошибка API');
        }
    }

    return response.json();
}