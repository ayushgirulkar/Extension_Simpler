let lastSummary = "";

// ✅ INIT
document.addEventListener('DOMContentLoaded', () => {

    chrome.storage.local.get(['researchNotes'], function (result) {
        if (result.researchNotes) {
            document.getElementById('notes').value = result.researchNotes;
        }
    });

    document.getElementById('summarize-btn')
        .addEventListener('click', () => handleAction("summarize"));

    document.getElementById('synonym-btn')
        .addEventListener('click', () => handleAction("synonym"));

    document.getElementById('save-notes-btn')
        .addEventListener('click', savedNotes);

    // 🔥 NEW: AUTO LANGUAGE CHANGE
    document.getElementById('language')
        .addEventListener('change', handleLanguageChange);
});


// ✅ SHOW LOADER
function showLoader() {
    document.getElementById('result').innerHTML =
        `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:90px;">
            <div class="loader"></div>
            <p style="margin-top:10px;font-size:13px;color:#888;">Generating...</p>
        </div>`;
}


// 🔥 NEW FUNCTION (AUTO LANGUAGE SUMMARY)
async function handleLanguageChange() {
    const language = document.getElementById('language').value;

    if (!language) return;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
        });

        if (!result || result.trim() === "") {
            showResult("⚠️ Please select text first");
            return;
        }

        toggleButtons(true);
        showLoader();

        const response = await fetch('http://localhost:8080/api/research/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: result,
                operation: "translate",
                language: language   // 🔥 IMPORTANT
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const text = await response.text();

        lastSummary = text;
        showResult(text.replace(/\n/g, '<br>'));

    } catch (error) {
        console.error(error);
        showResult("Error: " + error.message);
    } finally {
        toggleButtons(false);
        document.getElementById('language').value = ""; // reset dropdown
    }
}


// ✅ MAIN FUNCTION (UNCHANGED LOGIC)
async function handleAction(operation) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
        });

        if (!result || result.trim() === "") {
            showResult('Please select text first');
            return;
        }

        // 🔥 VALIDATION FOR SYNONYM
        if (operation === "synonym") {
            const wordCount = result.trim().split(/\s+/).length;
            if (wordCount !== 1) {
                showResult("⚠️ Please select only ONE word for synonyms");
                return;
            }
        }

        toggleButtons(true);
        showLoader();

        const response = await fetch('http://localhost:8080/api/research/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: result,
                operation: operation
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const text = await response.text();

        if (operation === "summarize") {
            lastSummary = text;
            showResult(text.replace(/\n/g, '<br>'));
        }

        else if (operation === "synonym") {
            const formatted = text
                .split(',')
                .map(w => `• ${w.trim()}`)
                .join('<br>');

            showResult(`<b>Synonyms:</b><br>${formatted}`);
        }

    } catch (error) {
        console.error(error);
        showResult('Error: ' + error.message);
    } finally {
        toggleButtons(false);
    }
}


// ✅ ENABLE/DISABLE BUTTONS
function toggleButtons(disabled) {
    document.getElementById('summarize-btn').disabled = disabled;
    document.getElementById('synonym-btn').disabled = disabled;
}


// ✅ SAVE NOTES
function savedNotes() {
    const notesArea = document.getElementById('notes');

    if (lastSummary) {
        notesArea.value += (notesArea.value ? "\n\n" : "") + lastSummary;
    }

    const notes = notesArea.value;

    chrome.storage.local.set({ researchNotes: notes }, function () {
        if (chrome.runtime.lastError) {
            showResult('Error saving notes: ' + chrome.runtime.lastError.message);
        } else {
            showResult('✅ Notes saved successfully!');
        }
    });
}


// ✅ SHOW RESULT
function showResult(content) {
    document.getElementById('result').innerHTML =
        `<div class="result-item">
            <div class="result-content">${content}</div>
        </div>`;
}