// ==UserScript==
// @name         Quiz Assistant (Gemini API)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Reads DOM questions, queries Gemini 3.1 Pro API, and overlays a modal
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CONFIGURATION ---
    const GEMINI_API_KEY = "AIzaSyC6QdC1rQhECO9rD8x-mIWl3VHSj2-fL4Q"; 
    // UPDATE THIS: Find the CSS selector for the question text on your specific quiz site.
    // Right-click the question -> Inspect Element -> find the class name (e.g., '.question-text')
    const QUESTION_SELECTOR = ".loaded"; 

    // --- 2. CREATE MODAL UI ---
    const modal = document.createElement('div');
    modal.id = 'gemini-assistant-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        zIndex: '999999',
        display: 'none', // Hidden by default
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '15px',
        lineHeight: '1.6',
        wordWrap: 'break-word'
    });
    
    const title = document.createElement('h3');
    title.innerText = '🧠 Gemini Assistant';
    title.style.marginTop = '0';
    title.style.borderBottom = '1px solid #444';
    title.style.paddingBottom = '10px';
    modal.appendChild(title);

    const contentDiv = document.createElement('div');
    contentDiv.id = 'gemini-response-content';
    contentDiv.innerText = 'Waiting for question to appear on screen...';
    modal.appendChild(contentDiv);

    document.body.appendChild(modal);

    // --- 3. KEYBOARD SHORTCUTS ---
    document.addEventListener('keydown', (e) => {
        // Show: Ctrl + M
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            modal.style.display = 'block';
        }
        // Hide: Ctrl + H (Warning: Browsers may override this to open History)
        if (e.ctrlKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            modal.style.display = 'none';
        }
    });

    // --- 4. API REQUEST LOGIC ---
    async function queryGemini(questionText) {
        contentDiv.innerText = '🤔 Thinking (High Level)...';
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:streamGenerateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `Please answer the following quiz question accurately:\n\n${questionText}` }]
            }],
            generationConfig: {
                thinkingConfig: {
                    thinkingLevel: "HIGH"
                }
            },
            tools: [{
                googleSearch: {}
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // `streamGenerateContent` typically returns an array of JSON chunks when called via standard HTTP POST
            let fullText = "";
            if (Array.isArray(data)) {
                data.forEach(chunk => {
                    if (chunk.candidates && chunk.candidates.length > 0) {
                        const parts = chunk.candidates[0].content.parts;
                        if (parts && parts.length > 0) {
                            // Extract text, handling potential Markdown formatting
                            fullText += parts.map(p => p.text).join("");
                        }
                    }
                });
            }
            
            contentDiv.innerHTML = fullText.replace(/\n/g, '<br>') || "No answer generated.";
        } catch (error) {
            contentDiv.innerText = `Error: ${error.message}\nCheck network tab and API key.`;
        }
    }

    // --- 5. DOM MUTATION OBSERVER (AUTO-DETECT CHANGES) ---
    let lastProcessedQuestion = "";

    function checkForNewQuestion() {
        const questionElement = document.querySelector(QUESTION_SELECTOR);
        if (questionElement) {
            const currentQuestionText = questionElement.innerText.trim();
            // If the text exists and is different from the last checked question
            if (currentQuestionText && currentQuestionText !== lastProcessedQuestion) {
                lastProcessedQuestion = currentQuestionText;
                queryGemini(currentQuestionText);
            }
        }
    }

    // Set up an observer to watch the entire page body for structural/text changes
    const observer = new MutationObserver(() => {
        checkForNewQuestion();
    });

    // Start observing
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        characterData: true 
    });

    // Run a manual check on initial script load just in case
    setTimeout(checkForNewQuestion, 1500);

})();