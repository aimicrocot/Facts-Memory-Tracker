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
}

// ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ
async function onManualScanClick() {
    const context = getContext();
    const chat = context.chat;
    
    if (!chat || chat.length === 0) {
        toastr.info("Чат пуст. Напишите что-нибудь.");
        return;
    }

    toastr.info("Связываюсь с ИИ...", "Facts Memory Tracker");
    
    const lastMessage = chat[chat.length - 1].mes;
    const promptText = `Analyze the following text and extract one short factual statement about the character. Respond ONLY with the fact: "${lastMessage}"`;

    try {
        console.log(`[${extensionName}] Отправка запроса (Object format)...`);
        
        // Передаем строго объект, как того требует консоль
        const response = await window.SillyTavern.getContext().generateRaw({
            prompt: promptText,
            text: promptText 
        });
        
        if (response) {
            console.log(`[${extensionName}] ИИ ответил:`, response);
            // Выводим текст в наш блок в интерфейсе
            $("#fmt_last_fact_display").text(response.trim());
            toastr.success("Факт успешно извлечен!");
        } else {
            throw new Error("Пустой ответ от ИИ");
        }
        
    } catch (error) {
        console.error(`[${extensionName}] Ошибка генерации:`, error);
        toastr.error("ИИ не смог ответить. Проверь консоль.");
    }
}

jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);
       
        $("#fmt_auto_scan").on("input", onAutoScanChange);
        $("#fmt_manual_scan").on("click", onManualScanClick);
       
        loadSettings();
        console.log(`[${extensionName}] ✅ Stage 4 (Display) Loaded`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Load failed:`, error);
    }
});
