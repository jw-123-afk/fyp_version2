/**
 * DLP Chatbot - Main Application Logic (Multi-Threaded Upgrade)
 */

class DLPChatbotApp {
    constructor() {
        this.conversations = [];
        this.activeChatId = null;
        this.apiBaseUrl = '/api';
        this.selectedRating = 0;
        this.currentUtterance = null;
        this.currentBase64Image = null;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadSavedData();
    }

    cacheElements() {
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.conversationListEl = document.getElementById('conversationList');
        this.newChatBtn = document.getElementById('newChatBtn');
        
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.welcomeScreen = document.getElementById('welcomeScreen');

        this.backToChatBtn = document.getElementById('backToChatBtn');

        this.assessmentForm = document.getElementById('assessmentForm');
        this.assessmentResult = document.getElementById('assessmentResult');
        this.feedbackForm = document.getElementById('feedbackForm');
        this.feedbackStatus = document.getElementById('feedbackStatus');
        this.stars = document.querySelectorAll('.star');
        this.ratingInput = document.getElementById('rating');

        this.clearDataBtn = document.getElementById('clearAllData');
        this.toggleThemeBtn = document.getElementById('toggleTheme');
        this.notification = document.getElementById('notification');

        this.uploadArea = document.getElementById('uploadArea');
        this.defectImage = document.getElementById('defectImage');
        this.previewArea = document.getElementById('previewArea');
        this.imagePreview = document.getElementById('imagePreview');
        this.removeImageBtn = document.getElementById('removeImageBtn');
        this.scanBtn = document.getElementById('scanBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.scanResult = document.getElementById('scanResult');

        this.pdfUploadArea = document.getElementById('pdfUploadArea');
        this.pdfFile = document.getElementById('pdfFile');
        this.pdfPreviewArea = document.getElementById('pdfPreviewArea');
        this.pdfFileName = document.getElementById('pdfFileName');
        this.removePdfBtn = document.getElementById('removePdfBtn');
        this.scanPdfBtn = document.getElementById('scanPdfBtn');
        this.pdfLoadingIndicator = document.getElementById('pdfLoadingIndicator');
        this.pdfScanResult = document.getElementById('pdfScanResult');
    }

    attachEventListeners() {
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        if(this.newChatBtn) this.newChatBtn.addEventListener('click', () => this.startNewChat());
        if(this.sendBtn) this.sendBtn.addEventListener('click', () => this.sendMessage());

        if(this.userInput) {
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.userInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        if (this.backToChatBtn) {
            this.backToChatBtn.addEventListener('click', () => this.switchTab('chat'));
        }

        const addNoticeDefectBtn = document.getElementById('addNoticeDefectBtn');
        if (addNoticeDefectBtn) addNoticeDefectBtn.addEventListener('click', () => this.addNoticeDefectRow());
        
        const noticeForm = document.getElementById('noticeLetterForm');
        if (noticeForm) noticeForm.addEventListener('submit', (e) => this.generateNoticeLetter(e));

        if (this.clearDataBtn) this.clearDataBtn.addEventListener('click', () => this.clearAllData());
        if (this.toggleThemeBtn) this.toggleThemeBtn.addEventListener('click', () => this.toggleTheme());

        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', () => this.defectImage.click());
            
            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });
            this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    this.defectImage.files = e.dataTransfer.files;
                    this.handleImageUpload();
                }
            });
            
            this.defectImage.addEventListener('change', () => this.handleImageUpload());
        }

        if (this.removeImageBtn) this.removeImageBtn.addEventListener('click', () => this.removeScannerImage());
        if (this.scanBtn) this.scanBtn.addEventListener('click', () => this.analyzeDefectImage());

        const addDefectBtn = document.getElementById('addDefectBtn');
        if (addDefectBtn) addDefectBtn.addEventListener('click', () => this.addDefectRow());
        
        const dlpForm = document.getElementById('dlpCalculatorForm');
        if (dlpForm) dlpForm.addEventListener('submit', (e) => this.generateDlpReport(e));

        if (this.pdfUploadArea) {
            this.pdfUploadArea.addEventListener('click', () => this.pdfFile.click());
            
            this.pdfUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.pdfUploadArea.classList.add('dragover');
            });
            this.pdfUploadArea.addEventListener('dragleave', () => this.pdfUploadArea.classList.remove('dragover'));
            this.pdfUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.pdfUploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    this.pdfFile.files = e.dataTransfer.files;
                    this.handlePdfUpload();
                }
            });
            
            this.pdfFile.addEventListener('change', () => this.handlePdfUpload());
        }

        if (this.removePdfBtn) this.removePdfBtn.addEventListener('click', () => this.removePdf());
        if (this.scanPdfBtn) this.scanPdfBtn.addEventListener('click', () => this.analyzePdf());
    }

    // ==========================================================
    // 1. SECURE DATABASE CONVERSATION MANAGEMENT
    // ==========================================================
    async loadSavedData() {
        if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
        localStorage.removeItem('dlp_conversations'); // Clear old ghost data

        try {
            const response = await fetch('/api/history');
            if (response.status === 401) return;
            
            const data = await response.json();
            
            if (data.history && data.history.length > 0) {
                const groups = {};
                data.history.forEach(msg => {
                    const chatId = msg.chat_id || 'legacy_chat';
                    if (!groups[chatId]) {
                        groups[chatId] = { id: chatId, title: "New Chat", messages: [] };
                    }
                    groups[chatId].messages.push(msg);
                });

                this.conversations = Object.values(groups).map(chat => {
                    const firstUserMsg = chat.messages.find(m => m.sender === 'user');
                    if (firstUserMsg) {
                        chat.title = firstUserMsg.text.substring(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
                    }
                    return chat;
                });

                this.conversations.sort((a, b) => b.id - a.id);
                this.loadChat(this.conversations[0].id);
            } else {
                this.startNewChat();
            }
            this.renderSidebarHistory();
        } catch (error) {
            console.error("Error fetching history:", error);
            this.startNewChat();
        }
    }

    saveData() {
        this.renderSidebarHistory();
    }

    startNewChat() {
        const newChatId = Date.now().toString(); 
        this.conversations.unshift({
            id: newChatId,
            title: "New Chat",
            messages: []
        });
        this.loadChat(newChatId);
        this.saveData();
        this.switchTab('chat');
    }

    loadChat(chatId) {
        this.stopSpeaking();
        this.activeChatId = chatId;
        const chat = this.conversations.find(c => c.id === chatId);
        if (!chat) return;

        this.chatMessages.innerHTML = '';
        chat.messages.forEach(msg => {
            this.renderMessageHTML(msg.text, msg.sender);
        });

        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = chat.messages.length === 0 ? 'flex' : 'none';
        }
        this.renderSidebarHistory();
    }

    renderSidebarHistory() {
        if(!this.conversationListEl) return;
        this.conversationListEl.innerHTML = '';

        this.conversations.forEach(chat => {
            const row = document.createElement('div');
            row.className = `history-item-row ${chat.id === this.activeChatId ? 'active' : ''}`;
            
            row.addEventListener('click', (e) => {
                if (e.target.closest('.history-actions') || e.target.tagName === 'INPUT') return;
                this.loadChat(chat.id);
                this.switchTab('chat');
            });

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title-text';
            titleSpan.textContent = chat.title || 'New Chat';

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon-action btn-delete';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = "Delete Chat";
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id); 
            });

            actionsDiv.appendChild(deleteBtn);
            row.appendChild(titleSpan);
            row.appendChild(actionsDiv);
            this.conversationListEl.appendChild(row);
        });
    }

    async deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this specific conversation?')) return;

        try {
            const response = await fetch(`/api/delete-chat/${chatId}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                this.conversations = this.conversations.filter(c => c.id !== chatId);
                if (chatId === this.activeChatId) {
                    if (this.conversations.length > 0) {
                        this.loadChat(this.conversations[0].id);
                    } else {
                        this.startNewChat();
                    }
                } else {
                    this.renderSidebarHistory();
                }
            } else {
                alert("Could not delete chat. " + data.error);
            }
        } catch (e) {
            console.error("Error deleting chat", e);
        }
    }

    // ==========================================================
    // 2. MESSAGING LOGIC & HELPER FUNCTIONS
    // ==========================================================
    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text) return;

        this.userInput.style.height = 'auto';
        this.userInput.value = '';

        this.addMessageToActiveChat(text, 'user', false);
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    chat_id: this.activeChatId ? this.activeChatId.toString() : Date.now().toString()
                })
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            this.removeTypingIndicator();
            this.addMessageToActiveChat(data.response || "I didn't understand that.", 'bot', true);

        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator();
            this.addMessageToActiveChat(`Error: ${error.message || "Connection failed"}`, 'bot', false);
        }
    }

    addMessageToActiveChat(text, sender, animate = false) {
        const chat = this.conversations.find(c => c.id === this.activeChatId);
        if (!chat) return;

        chat.messages.push({ text, sender, timestamp: new Date() });

        if (chat.messages.length === 1 && sender === 'user') {
            chat.title = text.substring(0, 25) + (text.length > 25 ? '...' : '');
        }

        this.saveData();

        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }

        if (animate && sender === 'bot') {
            this.renderMessageTypewriter(text);
        } else {
            this.renderMessageHTML(text, sender);
        }
    }

    renderMessageHTML(message, sender) {
        const messageDiv = this.createMessageStructure(message, sender);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    renderMessageTypewriter(text) {
        const messageDiv = this.createMessageStructure('', 'bot'); 
        const bubble = messageDiv.querySelector('.message-bubble');
        const readBtn = messageDiv.querySelector('.btn-read-aloud');
        
        if(readBtn) readBtn.classList.add('hidden');
        this.chatMessages.appendChild(messageDiv);
        
        let i = 0;
        const speed = 15; 

        const typeLoop = () => {
            if (i < text.length) {
                bubble.textContent += text.charAt(i);
                i++;
                this.scrollToBottom(); 
                setTimeout(typeLoop, speed);
            } else {
                if(readBtn) readBtn.classList.remove('hidden');
            }
        };

        typeLoop();
    }

    createMessageStructure(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'chat-avatar';
            avatar.innerHTML = '🤖';
            messageDiv.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = text;
        messageDiv.appendChild(bubble);

        if (sender === 'bot') {
            const readBtn = document.createElement('button');
            readBtn.className = 'btn-read-aloud';
            readBtn.innerHTML = '🔊';
            readBtn.title = "Read Aloud";
            
            readBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const finalText = bubble.textContent; 
                this.toggleSpeech(finalText, readBtn, messageDiv);
            });

            messageDiv.appendChild(readBtn);
        }

        return messageDiv;
    }

    showTypingIndicator() {
        const div = document.createElement('div');
        div.id = 'typingIndicator';
        div.className = 'chat-message bot';
        div.innerHTML = `
            <div class="chat-avatar">🤖</div>
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        this.chatMessages.appendChild(div);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    scrollToBottom() {
        const chatContainer = this.chatMessages.parentElement;
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // ==========================================================
    // 3. COMPREHENSIVE DLP ASSESSMENT TOOLS
    // ==========================================================
    
    addDefectRow() {
        const container = document.getElementById('defectItemsContainer');
        const row = document.createElement('div');
        row.className = 'form-group defect-row';
        row.style.display = 'flex';
        row.style.gap = '15px';
        row.style.marginTop = '15px';
        
        row.innerHTML = `
            <input type="text" class="defect-desc" placeholder="Defect Description" style="flex: 2;" required>
            <input type="number" class="defect-cost" placeholder="Est. Cost (RM)" style="flex: 1;" min="0" required>
            <button type="button" class="btn-secondary remove-defect-btn" style="padding: 0 15px; color: #ef4444; border-color: #ef4444;">X</button>
        `;
        
        row.querySelector('.remove-defect-btn').addEventListener('click', function() {
            row.remove();
        });
        
        container.appendChild(row);
    }

    generateDlpReport(e) {
        e.preventDefault();
        
        const vpDateInput = document.getElementById('vpDate').value;
        const noticeDateInput = document.getElementById('noticeDate').value;
        const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
        
        const vpDate = new Date(vpDateInput);
        const dlpEndDate = new Date(vpDate);
        dlpEndDate.setMonth(dlpEndDate.getMonth() + 24);
        
        const today = new Date();
        const timeDiff = dlpEndDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let dlpStatus = "";
        let dlpAdvice = "";
        
        if (daysRemaining < 0) {
            dlpStatus = `<span style="color: #ef4444;">EXPIRED</span>`;
            dlpAdvice = "Your official DLP has ended. You may need to rely on hidden defect laws (Latent Defects) or cover costs yourself.";
        } else if (daysRemaining <= 30) {
            dlpStatus = `<span style="color: #f59e0b;">EXPIRING SOON (${daysRemaining} Days Left)</span>`;
            dlpAdvice = "Submit all remaining defect reports officially immediately before the deadline!";
        } else {
            dlpStatus = `<span style="color: var(--neon-green);">VALID (${daysRemaining} Days Left)</span>`;
            dlpAdvice = "You are safely within the DLP. Keep documenting and submitting defects as they arise.";
        }

        let deadlineHtml = "";
        if (noticeDateInput) {
            const noticeDate = new Date(noticeDateInput);
            const deadlineDate = new Date(noticeDate);
            deadlineDate.setDate(deadlineDate.getDate() + 30);
            
            const deadlineDiff = deadlineDate.getTime() - today.getTime();
            const deadlineDays = Math.ceil(deadlineDiff / (1000 * 3600 * 24));
            
            if (deadlineDays < 0) {
                deadlineHtml = `
                    <p><strong>Developer Deadline:</strong> ${deadlineDate.toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span style="color: #ef4444;">OVERDUE</span></p>
                    <p><strong>Action:</strong> The 30 days have passed. Under Malaysian Law, you may now hire your own contractor, repair the defect, and deduct the cost from the stakeholder sum.</p>
                `;
            } else {
                deadlineHtml = `
                    <p><strong>Developer Deadline:</strong> ${deadlineDate.toLocaleDateString()}</p>
                    <p><strong>Status:</strong> Pending (${deadlineDays} Days Left)</p>
                    <p><strong>Action:</strong> Allow the developer to complete repairs within this timeframe.</p>
                `;
            }
        } else {
            deadlineHtml = `<p>No official notice date provided. Remember to send a formal written notice to start the 30-day clock.</p>`;
        }

        const retentionSum = purchasePrice * 0.05;

        let totalClaim = 0;
        let defectListHtml = "<ul>";
        const costInputs = document.querySelectorAll('.defect-cost');
        const descInputs = document.querySelectorAll('.defect-desc');
        
        for(let i = 0; i < costInputs.length; i++) {
            const cost = parseFloat(costInputs[i].value) || 0;
            totalClaim += cost;
            defectListHtml += `<li>${descInputs[i].value}: <strong>RM ${cost.toLocaleString()}</strong></li>`;
        }
        defectListHtml += "</ul>";

        let tribunalWarning = "";
        if (totalClaim > 50000) {
            tribunalWarning = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 10px; border-radius: 8px; margin-top: 10px;">
                    <strong style="color: #ef4444;">⚠️ TRIBUNAL LIMIT EXCEEDED</strong><br>
                    Your estimated claim is <strong>RM ${totalClaim.toLocaleString()}</strong>. The maximum claim allowed in the Tribunal for Homebuyer Claims (TTPR) is RM 50,000. You may need to waive the excess amount or file your case in a civil court.
                </div>
            `;
        }

        const reportArea = document.getElementById('assessmentReportArea');
        
        reportArea.innerHTML = `
            <div style="text-align: center; border-bottom: 1px solid var(--border-dim); padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="color: var(--text-primary); margin: 0;">Comprehensive DLP Report</h2>
                <p style="color: var(--neon-green); margin-top: 5px;">Generated on ${today.toLocaleDateString()}</p>
            </div>

            <h3>📅 1. Timeline Analysis</h3>
            <p><strong>VP Date:</strong> ${vpDate.toLocaleDateString()}</p>
            <p><strong>DLP Expiry Date:</strong> ${dlpEndDate.toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${dlpStatus}</p>
            <p><strong>Legal Advice:</strong> ${dlpAdvice}</p>

            <h3>⏳ 2. Developer Action Deadline</h3>
            ${deadlineHtml}

            <h3>💰 3. Stakeholder Retention Funds</h3>
            <p>Based on your SPA price of RM ${purchasePrice.toLocaleString()}, the stakeholder lawyer is holding a 5% retention sum.</p>
            <p><strong>Total Retention Sum:</strong> <span style="color: var(--neon-green); font-weight: bold; font-size: 1.1em;">RM ${retentionSum.toLocaleString()}</span></p>
            <p>If the developer fails to repair defects within 30 days of notice, you have the legal right to claim your repair costs from this specific fund.</p>

            <h3>🛠️ 4. Claim Estimation</h3>
            <p>Your logged defects and estimated costs:</p>
            ${defectListHtml}
            <p style="font-size: 1.2em; margin-top: 10px;"><strong>Total Estimated Claim:</strong> RM ${totalClaim.toLocaleString()}</p>
            ${tribunalWarning}
            
            <div style="margin-top: 30px; text-align: center;">
                <button class="btn-secondary" onclick="window.print()" style="width: 100%;">🖨️ Print / Save as PDF</button>
            </div>
        `;

        reportArea.style.display = 'block';
        reportArea.scrollIntoView({ behavior: 'smooth' });
        
        if (this.showNotification) {
            this.showNotification('Report Generated Successfully!', 'success');
        }
    }

    // ==========================================================
    // 4. FORMAL NOTICE LETTER GENERATOR
    // ==========================================================
    addNoticeDefectRow() {
        const container = document.getElementById('noticeDefectsContainer');
        const row = document.createElement('div');
        row.className = 'form-group defect-notice-row';
        row.style.display = 'flex';
        row.style.gap = '15px';
        row.style.marginTop = '15px';
        
        row.innerHTML = `
            <input type="text" class="nl-defect-location" placeholder="Location" style="flex: 1;" required>
            <input type="text" class="nl-defect-desc" placeholder="Issue" style="flex: 2;" required>
            <button type="button" class="btn-secondary remove-nl-defect-btn" style="padding: 0 15px; color: #ef4444; border-color: #ef4444;">X</button>
        `;
        
        row.querySelector('.remove-nl-defect-btn').addEventListener('click', function() {
            row.remove();
        });
        
        container.appendChild(row);
    }

    generateNoticeLetter(e) {
        e.preventDefault();
        
        const buyerName = document.getElementById('nlBuyerName').value.trim();
        const buyerIC = document.getElementById('nlBuyerIC').value.trim();
        const buyerAddress = document.getElementById('nlBuyerAddress').value.replace(/\n/g, '<br>');
        const buyerContact = document.getElementById('nlBuyerContact').value.trim();
        
        const devName = document.getElementById('nlDevName').value.trim();
        const devAddress = document.getElementById('nlDevAddress').value.replace(/\n/g, '<br>');
        
        const projectName = document.getElementById('nlProjectName').value.trim();
        const unitNo = document.getElementById('nlUnitNo').value.trim();
        const vpDate = new Date(document.getElementById('nlVPDate').value).toLocaleDateString();
        const spaRef = document.getElementById('nlSPARef').value.trim();

        const today = new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const locations = document.querySelectorAll('.nl-defect-location');
        const descs = document.querySelectorAll('.nl-defect-desc');
        let defectListHTML = "<ol style='margin-left: 20px; margin-bottom: 20px;'>";
        
        for(let i = 0; i < locations.length; i++) {
            defectListHTML += `<li><strong>${locations[i].value}:</strong> ${descs[i].value}</li>`;
        }
        defectListHTML += "</ol>";

        const letterHTML = `
            <div style="margin-bottom: 40px;">
                <strong>${buyerName.toUpperCase()}</strong><br>
                ${buyerAddress}
            </div>

            <div style="margin-bottom: 20px;">
                <strong>Date:</strong> ${today}
            </div>

            <div style="margin-bottom: 30px;">
                <strong>TO:</strong><br>
                <strong>${devName.toUpperCase()}</strong><br>
                ${devAddress}
            </div>

            <div style="margin-bottom: 20px; text-decoration: underline; font-weight: bold;">
                RE: NOTICE OF DEFECTS AND REQUEST FOR RECTIFICATION UNDER THE DEFECT LIABILITY PERIOD
            </div>

            <table style="margin-bottom: 30px; font-weight: bold; text-align: left;">
                <tr><td style="padding-right: 20px;">PROPERTY</td><td>: ${unitNo}, ${projectName}</td></tr>
                <tr><td>SPA REF/DATE</td><td>: ${spaRef}</td></tr>
                <tr><td>DATE OF VP</td><td>: ${vpDate}</td></tr>
            </table>

            <p style="margin-bottom: 15px;">Dear Sir/Madam,</p>

            <p style="margin-bottom: 15px; text-align: justify;">
                I/We, the purchaser(s) of the above-mentioned property, write to formally notify you of defects, shrinkage, or other faults in the property which have become apparent within the Defect Liability Period, in accordance with the Housing Development (Control and Licensing) Act 1966 and the Sale and Purchase Agreement (SPA).
            </p>

            <p style="margin-bottom: 15px;">Please find below the schedule of defects requiring immediate rectification:</p>

            ${defectListHTML}

            <p style="margin-bottom: 15px; text-align: justify;">
                Kindly arrange for your representatives or contractors to inspect the property and carry out the necessary rectification works within <strong>thirty (30) days</strong> from the date of this notice.
            </p>

            <p style="margin-bottom: 15px; text-align: justify;">
                Please be reminded that in the event you fail to rectify the said defects within the stipulated thirty (30) days, I/we reserve the right to carry out the rectification works ourselves and recover the costs from the stakeholder holding the retention sum, as provided under the SPA.
            </p>

            <p style="margin-bottom: 40px;">
                We look forward to your prompt response and action. Please contact me at <strong>${buyerContact}</strong> to arrange an appointment for inspection.
            </p>

            <p style="margin-bottom: 60px;">Yours faithfully,</p>

            <p style="margin-bottom: 5px;">______________________________</p>
            <p style="margin-bottom: 2px;"><strong>${buyerName.toUpperCase()}</strong></p>
            <p>NRIC / Passport: ${buyerIC}</p>

            <hr style="margin-top: 50px; margin-bottom: 20px; border: 0; border-top: 1px solid var(--border-dim);">
            
            <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #ef4444; text-align: center;">
                <em><strong>Disclaimer:</strong> This is an auto-generated template provided for general reference only and does not constitute legal advice. Please ensure all details are correct before sending. Consult a qualified legal professional if you require specific legal assistance.</em>
            </p>
        `;

        document.getElementById('letterContent').innerHTML = letterHTML;
        document.getElementById('noticeLetterOutputArea').style.display = 'block';
        
        document.getElementById('noticeLetterOutputArea').scrollIntoView({ behavior: 'smooth' });
        
        if (this.showNotification) {
            this.showNotification('Formal Notice Generated Successfully!', 'success');
        }
    }

    // ==========================================================
    // 5. AI IMAGE SCANNER & PDF LOGIC
    // ==========================================================
    handleImageUpload() {
        const file = this.defectImage.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentBase64Image = e.target.result;
                this.imagePreview.src = this.currentBase64Image;
                this.uploadArea.style.display = 'none';
                this.previewArea.style.display = 'block';
                this.scanResult.style.display = 'none'; 
            };
            reader.readAsDataURL(file);
        }
    }

    removeScannerImage() {
        this.defectImage.value = '';
        this.currentBase64Image = null;
        this.previewArea.style.display = 'none';
        this.scanResult.style.display = 'none';
        this.uploadArea.style.display = 'block';
    }

    async analyzeDefectImage() {
        if (!this.currentBase64Image) return;

        this.scanBtn.style.display = 'none';
        this.removeImageBtn.style.display = 'none';
        this.loadingIndicator.style.display = 'block';
        this.scanResult.style.display = 'none';

        try {
            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: this.currentBase64Image })
            });
            
            const data = await response.json();
            
            if(data.error) {
                this.scanResult.innerHTML = `<span style="color:#ef4444;">Error: ${data.error}</span>`;
            } else {
                let formattedText = data.response;
                formattedText = formattedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                formattedText = formattedText.replace(/^## (.*$)/gim, '<h3>$1</h3>');
                formattedText = formattedText.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
                formattedText = formattedText.replace(/\n/gim, '<br>');
                
                this.scanResult.innerHTML = formattedText;
            }
        } catch (err) {
            this.scanResult.innerHTML = `<span style="color:#ef4444;">Connection Error: ${err.message}</span>`;
        } finally {
            this.loadingIndicator.style.display = 'none';
            this.scanBtn.style.display = 'inline-block';
            this.removeImageBtn.style.display = 'inline-block';
            this.scanResult.style.display = 'block';
        }
    }

    handlePdfUpload() {
        const file = this.pdfFile.files[0];
        if (file && file.type === "application/pdf") {
            this.pdfFileName.textContent = file.name;
            this.pdfUploadArea.style.display = 'none';
            this.pdfPreviewArea.style.display = 'block';
            this.pdfScanResult.style.display = 'none'; 
        } else {
            alert("Please upload a valid PDF file.");
        }
    }

    removePdf() {
        this.pdfFile.value = '';
        this.pdfPreviewArea.style.display = 'none';
        this.pdfScanResult.style.display = 'none';
        this.pdfUploadArea.style.display = 'block';
    }

    async analyzePdf() {
        const file = this.pdfFile.files[0];
        if (!file) return;

        this.scanPdfBtn.style.display = 'none';
        this.removePdfBtn.style.display = 'none';
        this.pdfLoadingIndicator.style.display = 'block';
        this.pdfScanResult.style.display = 'none';

        const formData = new FormData();
        formData.append("pdf", file);

        try {
            const response = await fetch('/api/analyze-pdf', {
                method: 'POST',
                body: formData 
            });
            
            const data = await response.json();
            
            if(data.error) {
                this.pdfScanResult.innerHTML = `<span style="color:#ef4444;">Error: ${data.error}</span>`;
            } else {
                let formattedText = data.response;
                formattedText = formattedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                formattedText = formattedText.replace(/^## (.*$)/gim, '<h3>$1</h3>');
                formattedText = formattedText.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
                formattedText = formattedText.replace(/\n/gim, '<br>');
                
                this.pdfScanResult.innerHTML = formattedText;
            }
        } catch (err) {
            this.pdfScanResult.innerHTML = `<span style="color:#ef4444;">Connection Error: ${err.message}</span>`;
        } finally {
            this.pdfLoadingIndicator.style.display = 'none';
            this.scanPdfBtn.style.display = 'inline-block';
            this.removePdfBtn.style.display = 'inline-block';
            this.pdfScanResult.style.display = 'block';
        }
    }

    // ==========================================================
    // 6. UTILITIES
    // ==========================================================
    switchTab(tabName) {
        this.stopSpeaking();
        this.navTabs.forEach(tab => tab.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        if(activeBtn) activeBtn.classList.add('active');

        this.tabContents.forEach(content => content.classList.remove('active'));
        const activeContent = document.getElementById(tabName);
        if(activeContent) activeContent.classList.add('active');

        if (tabName === 'chat') {
            setTimeout(() => this.scrollToBottom(), 50);
        }
    }

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isDark = !document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    async clearAllData() {
        if(confirm("Delete all your secure chat history permanently?")) {
            try {
                const response = await fetch('/api/clear-history', { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    this.conversations = [];
                    this.startNewChat();
                    if (this.showNotification) this.showNotification('History cleared from database!', 'success');
                } else {
                    alert("Failed to clear history: " + data.error);
                }
            } catch (e) {
                console.error("Error clearing history", e);
            }
        }
    }

    showNotification(message, type = 'info') {
        if (!this.notification) return;
        this.notification.className = `notification show ${type}`;
        this.notification.textContent = message;
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    setRating(value) {
        this.selectedRating = parseInt(value);
        if(this.ratingInput) this.ratingInput.value = this.selectedRating;
        this.updateStarDisplay();
    }

    hoverRating(value) {
        this.stars.forEach((star, index) => {
            star.style.color = index < value ? 'var(--accent-color)' : 'var(--text-muted)';
        });
    }

    unhoverRating() {
        this.updateStarDisplay();
    }

    updateStarDisplay() {
        this.stars.forEach((star, index) => {
            if (index < this.selectedRating) {
                star.classList.add('active');
                star.style.color = 'var(--accent-color)';
            } else {
                star.classList.remove('active');
                star.style.color = 'var(--text-muted)';
            }
        });
    }

    stopSpeaking() {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
        
        document.querySelectorAll('.btn-read-aloud').forEach(btn => {
            btn.textContent = '🔊';
            btn.classList.remove('speaking');
            btn.title = "Read Aloud";
        });

        document.querySelectorAll('.chat-message').forEach(msg => {
            msg.classList.remove('reading');
        });

        this.currentUtterance = null;
    }

    toggleSpeech(text, btn, messageDiv) {
        if (this.currentUtterance && btn.classList.contains('speaking')) {
            this.stopSpeaking();
            return;
        }

        this.stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.onstart = () => {
            btn.textContent = '⏹️'; 
            btn.classList.add('speaking');
            messageDiv.classList.add('reading');
        };

        utterance.onend = () => {
            this.stopSpeaking(); 
        };

        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            this.stopSpeaking();
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dlpChatbot = new DLPChatbotApp();
});