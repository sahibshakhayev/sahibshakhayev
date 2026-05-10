// ==UserScript==
// @name         Quiz Assistant (Hugging Face)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Reads questions and queries DeepSeek-V4 via Hugging Face Router
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CONFIGURATION ---
    const HF_TOKEN = "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"; 
    const MODEL_ID = "deepseek-ai/DeepSeek-V4-Pro:novita";
    // UPDATE THIS: Use the inspector to find the class/ID of the question text
    const QUESTION_SELECTOR = ".loaded"; 

    // --- 2. CREATE MODAL UI ---
    const modal = document.createElement('div');
    modal.id = 'hf-assistant-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '420px',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: '#0f172a', // Deep navy
        color: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        zIndex: '999999',
        display: 'none',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        lineHeight: '1.6',
        border: '1px solid #334155'
    });
    
    const title = document.createElement('div');
    title.innerHTML = '<span style="color:#38bdf8">◈</span> <strong>DeepSeek Assistant</strong>';
    title.style.marginBottom = '15px';
    title.style.paddingBottom = '10px';
    title.style.borderBottom = '1px solid #334155';
    modal.appendChild(title);

    const contentDiv = document.createElement('div');
    contentDiv.id = 'hf-response-content';
    contentDiv.innerText = 'Waiting for question text...';
    modal.appendChild(contentDiv);

    document.body.appendChild(modal);

    // --- 3. KEYBOARD SHORTCUTS ---
    document.addEventListener('keydown', (e) => {
        // Show: Ctrl + M
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            modal.style.display = 'block';
        }
        // Hide: Ctrl + H
        if (e.ctrlKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            modal.style.display = 'none';
        }
    });

    // --- 4. HUGGING FACE API LOGIC ---
    async function queryHuggingFace(questionText) {
        contentDiv.innerHTML = '<span style="color:#94a3b8">Analyzing question...</span>';
        
        const payload = {
            model: MODEL_ID,
            messages: [
                {
                    role: "user",
                    content: `Provide the correct answer for this quiz question. If it is multiple choice, state the correct option. Question: ${questionText}`,
                },
            ],
        };

        try {
            const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HF Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const answer = result.choices[0].message.content;
            
            contentDiv.innerHTML = `<strong>Result:</strong><br>${answer.replace(/\n/g, '<br>')}`;
        } catch (error) {
            contentDiv.innerHTML = `<span style="color:#ef4444;">Error: ${error.message}</span>`;
            console.error("HF Router Error:", error);
        }
    }

    // --- 5. AUTOMATION LOGIC ---
    let lastProcessedQuestion = "";

    function checkForNewQuestion() {
        const questionElement = document.querySelector(QUESTION_SELECTOR);
        if (questionElement) {
            const currentQuestionText = questionElement.innerText.trim();
            // Only trigger if text exists and it's different from the last one
            if (currentQuestionText && currentQuestionText !== lastProcessedQuestion) {
                lastProcessedQuestion = currentQuestionText;
                queryHuggingFace(currentQuestionText);
            }
        }
    }

    // Monitor for changes in the DOM (e.g., clicking "Next Question")
    const observer = new MutationObserver(checkForNewQuestion);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        characterData: true 
    });

    // Initial check on load
    setTimeout(checkForNewQuestion, 2000);

})();
