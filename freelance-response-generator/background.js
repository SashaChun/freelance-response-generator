// Background script для Chrome плагіна Freelance Response Generator
// Відповідає за створення контекстного меню та обробку запитів до Gemini API

// Створення контекстного меню при встановленні плагіна
chrome.runtime.onInstalled.addListener(() => {
  // Створюємо пункт контекстного меню, який з'являється при виділенні тексту
  chrome.contextMenus.create({
    id: "generateResponse",
    title: "Генерувати відповідь замовнику",
    contexts: ["selection"] // Показувати тільки при виділенні тексту
  });
  
  console.log("Freelance Response Generator встановлено успішно!");
});

// Обробка натискання на пункт контекстного меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generateResponse") {
    const selectedText = info.selectionText;
    
    if (selectedText) {
      try {
        // Показуємо індикатор завантаження
        await showLoadingNotification(tab.id);
        
        // Генеруємо відповідь за допомогою Gemini API
        const response = await generateResponseWithGemini(selectedText);
        
        // Копіюємо відповідь в буфер обміну
        await copyToClipboard(response, tab.id);
        
        // Показуємо повідомлення про успіх
        await showSuccessNotification(tab.id, response);
        
      } catch (error) {
        console.error("Помилка при генерації відповіді:", error);
        await showErrorNotification(tab.id, error.message);
      }
    }
  }
});

// Функція для генерації відповіді за допомогою Gemini API
async function generateResponseWithGemini(selectedText) {
  // Отримуємо API ключ з локального сховища
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey;
  
  if (!apiKey) {
    throw new Error("API ключ Gemini не налаштований. Будь ласка, додайте його в налаштуваннях плагіна.");
  }
  
  // URL для Gemini API
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Промпт для генерації професійної відповіді замовнику
  const prompt = `Ти - досвідчений фрилансер. Створи професійну, ввічливу та переконливу відповідь замовнику на фриланс біржі на основі наступного тексту замовлення:

"${selectedText}"

Відповідь повинна:
1. Показувати розуміння завдання
2. Підкреслювати твій досвід та компетентність
3. Бути конкретною та по суті
4. Містити пропозицію щодо співпраці
5. Бути написаною українською мовою
6. Бути не більше 200 слів

Відповідь:`;

  // Тіло запиту для Gemini API
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };
  
  // Відправляємо запит до Gemini API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Помилка API: ${errorData.error?.message || 'Невідома помилка'}`);
  }
  
  const data = await response.json();
  
  // Витягуємо згенерований текст з відповіді
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text.trim();
  } else {
    throw new Error("Не вдалося отримати відповідь від Gemini API");
  }
}

// Функція для копіювання тексту в буфер обміну
async function copyToClipboard(text, tabId) {
  // Використовуємо content script для копіювання в буфер обміну
  await chrome.tabs.sendMessage(tabId, {
    action: "copyToClipboard",
    text: text
  });
}

// Функція для показу повідомлення про завантаження
async function showLoadingNotification(tabId) {
  await chrome.tabs.sendMessage(tabId, {
    action: "showNotification",
    type: "loading",
    message: "Генерую відповідь..."
  });
}

// Функція для показу повідомлення про успіх
async function showSuccessNotification(tabId, response) {
  await chrome.tabs.sendMessage(tabId, {
    action: "showNotification",
    type: "success",
    message: "Відповідь згенеровано та скопійовано в буфер обміну!",
    response: response
  });
}

// Функція для показу повідомлення про помилку
async function showErrorNotification(tabId, errorMessage) {
  await chrome.tabs.sendMessage(tabId, {
    action: "showNotification",
    type: "error",
    message: `Помилка: ${errorMessage}`
  });
}

// Обробка повідомлень від content script або popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "testApiKey") {
    // Тестування API ключа
    testGeminiApiKey(request.apiKey)
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // Асинхронна відповідь
  }
});

// Функція для тестування API ключа
async function testGeminiApiKey(apiKey) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const testRequestBody = {
    contents: [{
      parts: [{
        text: "Привіт! Це тест API ключа."
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 10,
    }
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testRequestBody)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Невірний API ключ');
  }
  
  return "API ключ працює коректно!";
}
