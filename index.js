import { extension_settings, getContext, loadExtensionSettings, eventSource, event_types } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "facts-memory-tracker"; // Убедись, что это имя папки
const extensionPath = `extensions/third-party/${extensionName}`;

const defaultSettings = {
    autoScan: false,
    skipCount: 2,
    facts: []
};

// 1. Загрузка настроек
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }

    $("#fmt_auto_scan").prop("checked", extension_settings[extensionName].autoScan);
    $("#fmt_skip_count").val(extension_settings[extensionName].skipCount);
    
    renderFacts();
}

// 2. Отрисовка списка фактов в боковой панели
function renderFacts() {
    const listContainer = $("#fmt_facts_list");
    const facts = extension_settings[extensionName].facts;

    if (!facts || facts.length === 0) {
        listContainer.html('<small style="opacity:0.5;">Список пуст...</small>');
        applyVisualHiding(); // Обновляем видимость, даже если пусто
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    facts.forEach((fact, index) => {
        html += `
            <div class="fmt-fact-item" style="display: flex; justify-content: space-between; align-items: flex-start; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);">
                <div class="fmt-fact-text" style="font-size: 0.9em; flex-grow: 1; margin-right: 10px; word-break: break-word; color: var(--text-color);">${fact}</div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <i class="fa-solid fa-trash fmt-delete-btn" data-index="${index}" style="cursor: pointer; color: #ff5555; font-size: 0.9em;"></i>
                </div>
            </div>`;
    });
    html += '</div>';
    listContainer.html(html);

    $(".fmt-delete-btn").on("click", function() {
        const idx = $(this).data("index");
        extension_settings[extensionName].facts.splice(idx, 1);
        saveSettingsDebounced();
        renderFacts();
    });

    applyVisualHiding(); // Скрываем сообщения в чате согласно новым фактам
}

// 3. Логика визуального скрытия сообщений в чате
function applyVisualHiding() {
    const chat = getContext().chat;
    const skipCount = parseInt(extension_settings[extensionName].skipCount) || 2;
    const facts = extension_settings[extensionName].facts;
    const cutOffIndex = chat.length - skipCount;

    // Скрываем старые сообщения
    $(".mes").each(function() {
        const mesId = parseInt($(this).attr("mesid"));
        if (mesId >= 0 && mesId < cutOffIndex) {
            $(this).addClass("fmt-hidden-message");
        } else {
            $(this).removeClass("fmt-hidden-message");
        }
    });

    // Управляем блоком саммари
    $("#fmt_summary_in_chat").remove();
    if (facts.length > 0 && cutOffIndex > 0) {
        const summaryHtml = `
            <div id="fmt_summary_in_chat" class="fmt-chat-summary-block">
                <div class="fmt-summary-header">
                    <span><i class="fa-solid fa-brain"></i> MEMORY TRACKER SUMMARY</span>
                    <span>${facts.length} facts preserved</span>
                </div>
                <div class="fmt-summary-content">${facts.join(" ")}</div>
                <div style="text-align: center; margin-top: 10px; font-size: 0.75em; opacity: 0.5;">(Нажми, чтобы временно развернуть историю)</div>
            </div>`;
        $("#chat").prepend(summaryHtml);
        $("#fmt_summary_in_chat").on("click", function() {
            $(".fmt-hidden-message").removeClass("fmt-hidden-message");
            $(this).fadeOut();
        });
    }
}

// 4. Последовательное сканирование (без ошибки 429)
async function runAutoScan() {
    const context = getContext();
    const chat = context.chat;
    const skipCount = parseInt(extension_settings[extensionName].skipCount) || 2;
    if (!chat || chat.length <= skipCount) return;

    const endIndex = chat.length - skipCount;
    const messagesToScan = [];
    for (let i = 0; i < endIndex; i++) {
        if (chat[i] && chat[i].mes) {
            const speaker = chat[i].is_user ? "User" : (chat[i].name || "Character");
            messagesToScan.push({ speaker, text: chat[i].mes });
        }
    }
    if (messagesToScan.length === 0) return;

    toastr.info(`Сканирование ${messagesToScan.length} сообщений...`, "Facts Tracker");

    try {
        for (const msg of messagesToScan) {
            const promptText = `Extract key facts about User/Character from this message. Concise paragraph. If none, reply "No new facts".\n\nMESSAGE: ${msg.speaker}: ${msg.text}`;
            const response = await window.SillyTavern.getContext().generateRaw({ prompt: promptText });
            const newFact = response ? response.trim() : "No new facts";

            if (newFact.length > 5 && !newFact.toLowerCase().includes("no new facts")) {
                extension_settings[extensionName].facts.push(newFact);
                renderFacts(); // Сразу показываем в UI
            }
        }
        saveSettingsDebounced();
        toastr.success("Готово", "Facts Tracker");
    } catch (e) { console.error(e); }
}

// 5. Подмена контекста для ИИ
eventSource.on(event_types.GENERATE_BEFORE_COMMANDS, async () => {
    const context = getContext();
    const skipCount = parseInt(extension_settings[extensionName].skipCount) || 2;
    const facts = extension_settings[extensionName].facts;

    if (facts.length > 0 && context.chat.length > skipCount) {
        const cutOffIndex = context.chat.length - skipCount;
        const factsSummary = "System Note: Key facts from previous conversation:\n" + facts.join("\n");
        const summaryMessage = { is_user: false, is_system: true, mes: factsSummary };
        
        const recentMessages = context.chat.slice(cutOffIndex);
        context.chat = [summaryMessage, ...recentMessages];
    }
});

// Инициализация
$(document).ready(async () => {
    const settingsHtml = await $.get(`${extensionPath}/example.html`);
    $("#extensions_settings").append(settingsHtml);

    $("#fmt_auto_scan").on("change", function() {
        extension_settings[extensionName].autoScan = $(this).prop("checked");
        saveSettingsDebounced();
    });

    $("#fmt_skip_count").on("change", function() {
        extension_settings[extensionName].skipCount = $(this).val();
        saveSettingsDebounced();
        applyVisualHiding();
    });

    $("#fmt_manual_scan").on("click", runAutoScan);
    $("#fmt_clear_facts").on("click", () => {
        extension_settings[extensionName].facts = [];
        saveSettingsDebounced();
        renderFacts();
    });

    loadExtensionSettings().then(loadSettings);
    
    eventSource.on(event_types.CHAT_COMPLETED, applyVisualHiding);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, applyVisualHiding);
});
