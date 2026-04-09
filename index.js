// Импорты (только проверенные и 100% рабочие!)
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "facts-memory-tracker";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    autoScan: false,
};

function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $("#fmt_auto_scan").prop("checked", extension_settings[extensionName].autoScan);
}

function onAutoScanChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].autoScan = value;
    saveSettingsDebounced();
    console.log(`[${extensionName}] Auto-scan toggled:`, value);
}

// ФУНКЦИЯ СКАНЕР
async function onManualScanClick() {
    const context = getContext();
    const chat = context.chat;
    
    if (!chat || chat.length <= 4) {
        toastr.info("Нужно больше 4 сообщений для анализа.");
        return;
    }

    toastr.info("Пытаюсь сгенерировать факт...", "Facts Memory Tracker");
    
    const targetIndex = chat.length - 5;
    const messageToAnalyze = chat[targetIndex].mes;
    
    const prompt = `Проанализируй следующее сообщение и выдели из него ОДИН важный факт о персонаже или событии. Ответь строго ОДНИМ коротким предложением. Сообщение: "${messageToAnalyze}" Факт:`;

    try {
        console.log(`[${extensionName}] Отправка промпта к ИИ...`);
        
        let generatedText = "";
        
        // БЕЗОПАСНЫЙ ИМПОРТ: ищем стандартную функцию генерации
        const networkModule = await import("../../../../network.js").catch(() => null);
        
        if (networkModule && typeof networkModule.generateRaw === "function") {
            generatedText = await networkModule.generateRaw(prompt);
        } else {
            throw new Error("Не удалось найти внутреннюю функцию generateRaw в SillyTavern.");
        }
        
        console.log(`[${extensionName}] ИИ выделил факт:`, generatedText);
        toastr.success("Факт успешно создан! Проверьте консоль (F12).", "Facts Memory Tracker");
        
    } catch (error) {
        console.error(`[${extensionName}] Ошибка генерации:`, error);
        toastr.error("ИИ не смог ответить. Смотри консоль (F12).");
    }
}

jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);
       
        $("#fmt_auto_scan").on("input", onAutoScanChange);
        $("#fmt_manual_scan").on("click", onManualScanClick); // Привязка кнопки
       
        loadSettings();
        console.log(`[${extensionName}] ✅ Safe Stage 4 Loaded`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Load failed:`, error);
    }
});
