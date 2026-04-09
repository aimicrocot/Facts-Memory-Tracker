async function onManualScanClick() {
    const context = getContext();
    const chat = context.chat;
    
    if (!chat || chat.length <= 4) {
        toastr.info("Нужно больше 4 сообщений для анализа.");
        return;
    }

    toastr.info("Пытаюсь сгенерировать факт...", "Facts Memory Tracker");
    
    const targetIndex = chat.length - 1; // Берем самое последнее сообщение для теста
    const messageToAnalyze = chat[targetIndex].mes;
    
    const prompt = `Проанализируй текст и выдели 1 факт о персонаже: "${messageToAnalyze}". Ответь коротко.`;

    try {
        console.log(`[${extensionName}] Пробую альтернативный метод генерации...`);
        
        // Попытка использовать глобальную функцию SillyTavern
        // Это самый современный и безопасный способ для расширений
        const generatedText = await window.SillyTavern.getContext().generateRaw(prompt);
        
        if (generatedText) {
            console.log(`[${extensionName}] ИИ ответил:`, generatedText);
            toastr.success("Факт получен! См. консоль.", "Facts Memory Tracker");
        } else {
            throw new Error("ИИ вернул пустой ответ.");
        }
        
    } catch (error) {
        console.error(`[${extensionName}] Ошибка метода SillyTavern:`, error);
        
        // Если метод выше не сработал, пробуем последний "дикий" вариант
        try {
            console.log(`[${extensionName}] Пробую прямой вызов API...`);
            const { generateRaw } = await import("../../../../script.js");
            const altResult = await generateRaw(prompt);
            console.log(`[${extensionName}] ИИ ответил (метод 2):`, altResult);
            toastr.success("Факт получен через script.js!", "Facts Memory Tracker");
        } catch (finalError) {
            console.error(`[${extensionName}] Все методы генерации провалены.`);
            toastr.error("Не удалось подключиться к ИИ. Проверь консоль.");
        }
    }
}
