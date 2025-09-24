// JavaScript для popup Chrome плагіна Freelance Response Generator
// Відповідає за налаштування API ключа та взаємодію з користувачем

// DOM елементи
const apiKeyInput = document.getElementById('apiKey');
const togglePasswordBtn = document.getElementById('togglePassword');
const saveKeyBtn = document.getElementById('saveKey');
const testKeyBtn = document.getElementById('testKey');
const statusDiv = document.getElementById('status');

// Ініціалізація при завантаженні popup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup завантажено');
    
    // Завантажуємо збережений API ключ
    await loadSavedApiKey();
    
    // Налаштовуємо обробники подій
    setupEventListeners();
});

// Функція для завантаження збереженого API ключа
async function loadSavedApiKey() {
    try {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
            showStatus('success', 'API ключ завантажено з локального сховища');
        }
    } catch (error) {
        console.error('Помилка при завантаженні API ключа:', error);
        showStatus('error', 'Помилка при завантаженні збереженого ключа');
    }
}

// Налаштування обробників подій
function setupEventListeners() {
    // Кнопка показати/приховати пароль
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // Кнопка збереження ключа
    saveKeyBtn.addEventListener('click', saveApiKey);
    
    // Кнопка тестування ключа
    testKeyBtn.addEventListener('click', testApiKey);
    
    // Обробка натискання Enter в полі вводу
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });
    
    // Очищення статусу при зміні вводу
    apiKeyInput.addEventListener('input', () => {
        hideStatus();
    });
}

// Функція для перемикання видимості пароля
function togglePasswordVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    
    if (isPassword) {
        apiKeyInput.type = 'text';
        togglePasswordBtn.textContent = '🙈';
        togglePasswordBtn.title = 'Приховати ключ';
    } else {
        apiKeyInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
        togglePasswordBtn.title = 'Показати ключ';
    }
}

// Функція для збереження API ключа
async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    // Валідація ключа
    if (!apiKey) {
        showStatus('error', 'Будь ласка, введіть API ключ');
        return;
    }
    
    // Базова перевірка формату ключа (Google API ключі зазвичай починаються з AIza)
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        showStatus('error', 'Невірний формат API ключа. Ключ повинен починатися з "AIza"');
        return;
    }
    
    try {
        // Показуємо індикатор завантаження
        showStatus('loading', 'Збереження ключа...');
        setButtonsDisabled(true);
        
        // Зберігаємо ключ в локальному сховищі
        await chrome.storage.local.set({ geminiApiKey: apiKey });
        
        // Показуємо повідомлення про успіх
        showStatus('success', 'API ключ успішно збережено!');
        
        console.log('API ключ збережено успішно');
        
    } catch (error) {
        console.error('Помилка при збереженні API ключа:', error);
        showStatus('error', 'Помилка при збереженні ключа');
    } finally {
        setButtonsDisabled(false);
    }
}

// Функція для тестування API ключа
async function testApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    // Валідація ключа
    if (!apiKey) {
        showStatus('error', 'Будь ласка, введіть API ключ для тестування');
        return;
    }
    
    try {
        // Показуємо індикатор завантаження
        showStatus('loading', 'Тестування API ключа...');
        setButtonsDisabled(true);
        
        // Відправляємо запит до background script для тестування
        const response = await chrome.runtime.sendMessage({
            action: 'testApiKey',
            apiKey: apiKey
        });
        
        if (response.success) {
            showStatus('success', `✅ ${response.result}`);
            console.log('API ключ протестовано успішно');
        } else {
            showStatus('error', `❌ ${response.error}`);
            console.error('Помилка тестування API ключа:', response.error);
        }
        
    } catch (error) {
        console.error('Помилка при тестуванні API ключа:', error);
        showStatus('error', 'Помилка при тестуванні ключа');
    } finally {
        setButtonsDisabled(false);
    }
}

// Функція для показу статусного повідомлення
function showStatus(type, message) {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
    
    // Автоматично приховуємо повідомлення через певний час
    if (type === 'success') {
        setTimeout(() => {
            hideStatus();
        }, 3000);
    } else if (type === 'error') {
        setTimeout(() => {
            hideStatus();
        }, 5000);
    }
}

// Функція для приховування статусного повідомлення
function hideStatus() {
    statusDiv.classList.add('hidden');
}

// Функція для вимкнення/увімкнення кнопок
function setButtonsDisabled(disabled) {
    saveKeyBtn.disabled = disabled;
    testKeyBtn.disabled = disabled;
    apiKeyInput.disabled = disabled;
    togglePasswordBtn.disabled = disabled;
}

// Функція для отримання інформації про плагін
function getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description
    };
}

// Функція для очищення збережених даних (для налагодження)
async function clearStoredData() {
    try {
        await chrome.storage.local.clear();
        apiKeyInput.value = '';
        showStatus('success', 'Всі дані очищено');
        console.log('Збережені дані очищено');
    } catch (error) {
        console.error('Помилка при очищенні даних:', error);
        showStatus('error', 'Помилка при очищенні даних');
    }
}

// Функція для експорту налаштувань (додаткова функціональність)
async function exportSettings() {
    try {
        const data = await chrome.storage.local.get(null);
        const exportData = {
            ...data,
            exportDate: new Date().toISOString(),
            version: getExtensionInfo().version
        };
        
        // Маскуємо API ключ для безпеки
        if (exportData.geminiApiKey) {
            exportData.geminiApiKey = exportData.geminiApiKey.substring(0, 10) + '***';
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'freelance-response-generator-settings.json';
        a.click();
        
        URL.revokeObjectURL(url);
        showStatus('success', 'Налаштування експортовано');
        
    } catch (error) {
        console.error('Помилка при експорті:', error);
        showStatus('error', 'Помилка при експорті налаштувань');
    }
}

// Додаткові утилітарні функції
const utils = {
    // Перевірка чи є рядок валідним API ключем
    isValidApiKey: (key) => {
        return key && typeof key === 'string' && key.startsWith('AIza') && key.length >= 30;
    },
    
    // Маскування API ключа для відображення
    maskApiKey: (key) => {
        if (!key || key.length < 10) return key;
        return key.substring(0, 10) + '*'.repeat(key.length - 10);
    },
    
    // Форматування дати
    formatDate: (date) => {
        return new Intl.DateTimeFormat('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
};

// Логування для налагодження
console.log('Popup script завантажено', getExtensionInfo());
