// Content script для Chrome плагіна Freelance Response Generator
// Відповідає за взаємодію з веб-сторінками, копіювання в буфер обміну та показ повідомлень

// Змінна для зберігання поточного повідомлення
let currentNotification = null;

// Слухач повідомлень від background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "copyToClipboard":
      copyTextToClipboard(request.text);
      sendResponse({success: true});
      break;
      
    case "showNotification":
      showNotification(request.type, request.message, request.response);
      sendResponse({success: true});
      break;
      
    default:
      sendResponse({success: false, error: "Невідома дія"});
  }
});

// Функція для копіювання тексту в буфер обміну
function copyTextToClipboard(text) {
  try {
    // Створюємо тимчасовий textarea елемент
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    
    // Додаємо елемент до DOM
    document.body.appendChild(textarea);
    
    // Виділяємо та копіюємо текст
    textarea.select();
    textarea.setSelectionRange(0, 99999); // Для мобільних пристроїв
    
    const successful = document.execCommand('copy');
    
    // Видаляємо тимчасовий елемент
    document.body.removeChild(textarea);
    
    if (!successful) {
      throw new Error('Не вдалося скопіювати текст');
    }
    
    console.log('Текст успішно скопійовано в буфер обміну');
    
  } catch (error) {
    console.error('Помилка при копіюванні:', error);
    
    // Альтернативний метод через Clipboard API (якщо доступний)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => console.log('Текст скопійовано через Clipboard API'))
        .catch(err => console.error('Помилка Clipboard API:', err));
    }
  }
}

// Функція для показу повідомлень користувачу
function showNotification(type, message, response = null) {
  // Видаляємо попереднє повідомлення, якщо воно існує
  if (currentNotification) {
    currentNotification.remove();
  }
  
  // Створюємо контейнер для повідомлення
  const notification = document.createElement('div');
  notification.id = 'freelance-response-notification';
  
  // Стилі для повідомлення
  const baseStyles = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    word-wrap: break-word;
    transition: all 0.3s ease;
    cursor: pointer;
  `;
  
  // Різні стилі залежно від типу повідомлення
  let typeStyles = '';
  let icon = '';
  
  switch (type) {
    case 'loading':
      typeStyles = 'background: #2196F3; color: white;';
      icon = '⏳';
      break;
    case 'success':
      typeStyles = 'background: #4CAF50; color: white;';
      icon = '✅';
      break;
    case 'error':
      typeStyles = 'background: #f44336; color: white;';
      icon = '❌';
      break;
    default:
      typeStyles = 'background: #333; color: white;';
      icon = 'ℹ️';
  }
  
  notification.style.cssText = baseStyles + typeStyles;
  
  // Створюємо вміст повідомлення
  let content = `<div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">${icon}</span>
    <span>${message}</span>
  </div>`;
  
  // Якщо є згенерована відповідь, додаємо її попередній перегляд
  if (response && type === 'success') {
    const previewText = response.length > 100 ? response.substring(0, 100) + '...' : response;
    content += `
      <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 12px; line-height: 1.4;">
        <strong>Згенерована відповідь:</strong><br>
        ${previewText}
      </div>
      <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
        Натисніть, щоб закрити
      </div>
    `;
  }
  
  notification.innerHTML = content;
  
  // Додаємо повідомлення до сторінки
  document.body.appendChild(notification);
  currentNotification = notification;
  
  // Обробник кліку для закриття повідомлення
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      if (currentNotification === notification) {
        currentNotification = null;
      }
    }, 300);
  });
  
  // Автоматичне закриття повідомлення
  let autoCloseTime = 5000; // 5 секунд за замовчуванням
  
  if (type === 'loading') {
    autoCloseTime = 30000; // 30 секунд для завантаження
  } else if (type === 'success' && response) {
    autoCloseTime = 10000; // 10 секунд для успішних повідомлень з відповіддю
  } else if (type === 'error') {
    autoCloseTime = 8000; // 8 секунд для помилок
  }
  
  setTimeout(() => {
    if (notification.parentNode && currentNotification === notification) {
      notification.click(); // Викликаємо закриття
    }
  }, autoCloseTime);
  
  // Анімація появи
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);
}

// Функція для отримання виділеного тексту (додаткова утиліта)
function getSelectedText() {
  let selectedText = '';
  
  if (window.getSelection) {
    selectedText = window.getSelection().toString();
  } else if (document.selection && document.selection.type !== "Control") {
    selectedText = document.selection.createRange().text;
  }
  
  return selectedText.trim();
}

// Додаткова функція для перевірки, чи є виділений текст
function hasSelectedText() {
  return getSelectedText().length > 0;
}

// Логування для налагодження
console.log('Freelance Response Generator content script завантажено');

// Додаємо обробник для відстеження виділення тексту (опціонально)
document.addEventListener('selectionchange', () => {
  const selectedText = getSelectedText();
  if (selectedText.length > 0) {
    console.log('Виділено текст:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
  }
});

// Функція для показу інформації про плагін при першому завантаженні
function showWelcomeMessage() {
  // Перевіряємо, чи показували вже вітальне повідомлення
  chrome.storage.local.get(['welcomeShown'], (result) => {
    if (!result.welcomeShown) {
      setTimeout(() => {
        showNotification('success', 'Freelance Response Generator активовано! Виділіть текст замовлення та натисніть правою кнопкою миші для генерації відповіді.');
        
        // Позначаємо, що вітальне повідомлення показано
        chrome.storage.local.set({welcomeShown: true});
      }, 1000);
    }
  });
}

// Показуємо вітальне повідомлення при першому завантаженні
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showWelcomeMessage);
} else {
  showWelcomeMessage();
}
