class SnakeAndLadderGame {
    constructor() {
        this.boardSize = 100;
        this.currentPlayer = 1;
        this.gameMode = null;
        this.isGameActive = false;
        this.isRolling = false;
        this.autoPlayInterval = null;
        this.difficulty = 'medium';
        this.currentTheme = 'light';
        this.pvbBotCount = 3; // Pemain vs Bot max 3
        this.bvbBotCount = 4; // Bot vs Bot max 4
        this.gameSpeed = '3'; // Game speed control in seconds
        this.soundEnabled = true;
        this.volume = 0.5;
        this.gameStartTime = null;
        this.isPaused = false;
        this.mapDesign = 'random'; // Map design selection

        // Stats spoiler click handler
        this.statsClickHandler = null;

        // Animation flags
        this.winSoundPlayed = false;

        // Player positions and data
        this.players = [];

        // Game statistics
        this.gameStats = {
            totalMoves: 0,
            snakeHits: 0,
            ladderClimbs: 0,
            playerStats: {}
        };

        // Will be generated randomly based on difficulty
        this.snakes = {};
        this.ladders = {};
        this.longSnakes = {}; // For snakes with body segments

        // Sound effects using Web Audio API
        this.audioContext = null;
        this.initializeAudio();

        this.initializeEventListeners();
        this.initializeTheme();
        this.loadSettings();
        this.addNotificationCSS();
    }

    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSound(frequency, duration, type = 'sine') {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Sound playback failed:', e);
        }
    }

    playDiceSound() {
        // Dice roll sound - multiple quick notes
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playSound(400 + Math.random() * 200, 0.1, 'square');
            }, i * 50);
        }
    }

    playMoveSound() {
        // Move sound - ascending note
        this.playSound(523, 0.2, 'triangle');
    }

    playSnakeSound() {
        // Snake sound - descending notes
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playSound(800 - i * 100, 0.15, 'sawtooth');
            }, i * 100);
        }
    }

    playLadderSound() {
        // Ladder sound - ascending notes
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playSound(262 + i * 131, 0.2, 'triangle');
            }, i * 150);
        }
    }

    playWinSound() {
        // Victory fanfare
        const notes = [523, 659, 784, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => {
                this.playSound(note, 0.4, 'triangle');
            }, i * 200);
        });
    }

    playStartSound() {
        // Game start sound
        this.playSound(440, 0.3, 'triangle');
        setTimeout(() => this.playSound(554, 0.3, 'triangle'), 150);
        setTimeout(() => this.playSound(659, 0.5, 'triangle'), 300);
    }

    initializeEventListeners() {
        // Helper function untuk safely add event listener
        const safeAddEventListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element dengan ID '${id}' tidak ditemukan`);
            }
        };

        // Theme toggle
        safeAddEventListener('themeToggle', 'click', () => this.toggleTheme());

        // Theme selector buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTheme(e.target.dataset.theme));
        });

        // Difficulty selector
        safeAddEventListener('difficultySelect', 'change', (e) => {
            this.difficulty = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Bot count selectors
        safeAddEventListener('pvbBotCountSelect', 'change', (e) => {
            this.pvbBotCount = parseInt(e.target.value);
            this.updateModeSettingsPreview();
        });

        safeAddEventListener('bvbBotCountSelect', 'change', (e) => {
            this.bvbBotCount = parseInt(e.target.value);
            this.updateModeSettingsPreview();
        });

        // Settings buttons
        safeAddEventListener('saveSettings', 'click', () => this.saveSettings());
        safeAddEventListener('defaultSettings', 'click', () => this.resetToDefault());

        // Game speed selector
        safeAddEventListener('gameSpeedSelect', 'change', (e) => {
            this.gameSpeed = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Map design selector
        safeAddEventListener('mapDesignSelect', 'change', (e) => {
            this.mapDesign = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Sound controls
        safeAddEventListener('soundToggle', 'click', () => {
            this.toggleSound();
            this.updateModeSettingsPreview();
        });
        safeAddEventListener('volumeSlider', 'input', (e) => {
            this.volume = e.target.value / 100;
            const volumeValue = document.getElementById('volumeValue');
            if (volumeValue) {
                volumeValue.textContent = e.target.value + '%';
            }
            this.updateModeSettingsPreview();
        });

        // Mode modal controls
        safeAddEventListener('openModeModal', 'click', () => this.openModeModal());
        safeAddEventListener('closeModeModal', 'click', () => this.closeModeModal());
        safeAddEventListener('showSettings', 'click', () => this.showSettings());

        // Info modal controls
        safeAddEventListener('openInfoModal', 'click', () => this.openInfoModal());
        safeAddEventListener('closeInfoModal', 'click', () => this.closeInfoModal());

        // Server modal controls
        safeAddEventListener('openServerModal', 'click', () => this.openServerModal());
        safeAddEventListener('closeServerModal', 'click', () => this.closeServerModal());

        // Settings modal controls  
        safeAddEventListener('openSettingsModal', 'click', () => this.toggleSettingsModal());

        // Developer modal controls
        safeAddEventListener('openDeveloperModal', 'click', () => this.openDeveloperModal());
        safeAddEventListener('closeDeveloperModal', 'click', () => this.closeDeveloperModal());



        // Mode selection
        safeAddEventListener('playerVsBot', 'click', () => {
            this.closeModeModal();
            this.startGame('pvb');
        });
        safeAddEventListener('botVsBot', 'click', () => {
            this.closeModeModal();
            this.startGame('bvb');
        });

        // Tombol kembali ke menu dari modal
        safeAddEventListener('backToMenuFromInfo', 'click', () => this.closeInfoModal());
        safeAddEventListener('backToMenuFromServer', 'click', () => this.closeServerModal());

        // Game controls
        safeAddEventListener('rollDice', 'click', () => this.rollDice());
        safeAddEventListener('autoPlay', 'click', () => this.toggleAutoPlay());
        safeAddEventListener('pauseGame', 'click', () => this.togglePause());
        safeAddEventListener('resetGame', 'click', () => this.resetGame());
        safeAddEventListener('backToMenu', 'click', () => this.backToMenu());
        safeAddEventListener('downloadLog', 'click', () => this.downloadLog());
        safeAddEventListener('clearLog', 'click', () => this.clearLog());

        // Modal controls
        safeAddEventListener('playAgain', 'click', () => this.resetGame());
        safeAddEventListener('backToMenuFromModal', 'click', () => this.backToMenu());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('snakeGameTheme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });

        // Update preview if modal is open
        this.updateModeSettingsPreview();

        localStorage.setItem('snakeGameTheme', theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = this.soundEnabled ? '🔊 Nyalakan' : '🔇 Matikan';
        soundBtn.classList.toggle('active', this.soundEnabled);
    }

    saveSettings() {
        const settings = {
            difficulty: this.difficulty,
            pvbBotCount: this.pvbBotCount,
            bvbBotCount: this.bvbBotCount,
            gameSpeed: this.gameSpeed,
            soundEnabled: this.soundEnabled,
            volume: this.volume,
            mapDesign: this.mapDesign,
            theme: this.currentTheme
        };

        localStorage.setItem('snakeGameSettings', JSON.stringify(settings));

        // Update preview if modal is open
        if (document.getElementById('modeModal').style.display === 'flex') {
            this.updateModeSettingsPreview();
        }

        // Show notification
        this.showNotification('✅ Pengaturan berhasil disimpan!', 'success');

        // Auto close settings panel
        setTimeout(() => {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel && settingsPanel.style.display === 'block') {
                settingsPanel.style.display = 'none';
                this.playSound(392, 0.2, 'triangle'); // Close sound
            }
        }, 1500); // Delay 1.5 detik untuk memberi waktu baca notifikasi
    }

    resetToDefault() {
        // Reset to default values
        this.difficulty = 'medium';
        this.pvbBotCount = 3;
        this.bvbBotCount = 4;
        this.gameSpeed = '3';
        this.soundEnabled = true;
        this.volume = 0.5;
        this.mapDesign = 'random';

        // Update UI elements
        document.getElementById('difficultySelect').value = 'medium';
        document.getElementById('pvbBotCountSelect').value = '3';
        document.getElementById('bvbBotCountSelect').value = '4';
        document.getElementById('gameSpeedSelect').value = '3';
        document.getElementById('mapDesignSelect').value = 'random';
        document.getElementById('volumeSlider').value = '50';
        document.getElementById('volumeValue').textContent = '50%';

        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = '🔊 Nyalakan';
        soundBtn.classList.add('active');

        // Clear saved settings
        localStorage.removeItem('snakeGameSettings');

        this.showNotification('🔄 Pengaturan dikembalikan ke default!', 'info');

        // Auto close settings panel
        setTimeout(() => {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel && settingsPanel.style.display === 'block') {
                settingsPanel.style.display = 'none';
                this.playSound(392, 0.2, 'triangle'); // Close sound
            }
        }, 1500); // Delay 1.5 detik untuk memberi waktu baca notifikasi
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('snakeGameSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            this.difficulty = settings.difficulty || 'medium';
            this.pvbBotCount = settings.pvbBotCount || 3;
            this.bvbBotCount = settings.bvbBotCount || 4;
            this.gameSpeed = settings.gameSpeed || '3';
            this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
            this.volume = settings.volume || 0.5;
            this.mapDesign = settings.mapDesign || 'random';

            // Update UI
            document.getElementById('difficultySelect').value = this.difficulty;
            document.getElementById('pvbBotCountSelect').value = this.pvbBotCount.toString();
            document.getElementById('bvbBotCountSelect').value = this.bvbBotCount.toString();
            document.getElementById('gameSpeedSelect').value = this.gameSpeed;
            document.getElementById('mapDesignSelect').value = this.mapDesign;
            document.getElementById('volumeSlider').value = (this.volume * 100).toString();
            document.getElementById('volumeValue').textContent = Math.round(this.volume * 100) + '%';

            const soundBtn = document.getElementById('soundToggle');
            soundBtn.textContent = this.soundEnabled ? '🔊 Nyalakan' : '🔇 Matikan';
            soundBtn.classList.toggle('active', this.soundEnabled);

            if (settings.theme) {
                this.setTheme(settings.theme);
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: 'bold',
            animation: 'slideInNotification 0.3s ease-out'
        });

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    generateRandomPositions() {
        this.snakes = {};
        this.ladders = {};
        this.longSnakes = {};

        if (this.mapDesign === 'random') {
            this.generateRandomMap();
        } else if (this.mapDesign === 'default') {
            this.generateDefaultMap();
        } else {
            this.generatePresetMap(parseInt(this.mapDesign));
        }
    }

    generateDefaultMap() {
        // Classic default snake and ladder positions
        this.snakes = {
            98: 78, 95: 75, 93: 73, 87: 24, 64: 60, 62: 19, 56: 53, 49: 11, 47: 26, 16: 6
        };
        this.ladders = {
            1: 38, 4: 14, 9: 21, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 99
        };
    }

    generateRandomMap() {
        const snakeCounts = { easy: 4, medium: 7, hard: 10 };
        const ladderCounts = { easy: 8, medium: 6, hard: 4 };

        const snakeCount = snakeCounts[this.difficulty];
        const ladderCount = ladderCounts[this.difficulty];

        const usedPositions = new Set([1, 100]); // Protect start and end

        // Generate random snakes
        for (let i = 0; i < snakeCount; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const head = Math.floor(Math.random() * 80) + 20; // Between 20-99
                const tail = Math.floor(Math.random() * (head - 10)) + 1; // At least 10 positions lower

                if (!usedPositions.has(head) && !usedPositions.has(tail) && head - tail >= 10) {
                    this.snakes[head] = tail;
                    usedPositions.add(head);
                    usedPositions.add(tail);
                    break;
                }
                attempts++;
            }
        }

        // Generate random ladders
        for (let i = 0; i < ladderCount; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const bottom = Math.floor(Math.random() * 80) + 5; // Between 5-84
                const top = Math.min(bottom + Math.floor(Math.random() * 30) + 10, 99); // At least 10 positions higher

                if (!usedPositions.has(bottom) && !usedPositions.has(top) && top - bottom >= 10) {
                    this.ladders[bottom] = top;
                    usedPositions.add(bottom);
                    usedPositions.add(top);
                    break;
                }
                attempts++;
            }
        }
    }

    generatePresetMap(mapNumber) {
        const presetMaps = {
            1: {
                snakes: { 98: 78, 95: 75, 87: 24, 64: 45, 56: 37, 49: 11, 16: 6 },
                ladders: { 4: 14, 9: 31, 21: 42, 28: 84, 36: 57, 51: 67, 71: 91, 80: 100 }
            },
            2: {
                snakes: { 99: 80, 93: 73, 87: 36, 62: 18, 56: 53, 49: 11, 48: 26, 32: 10 },
                ladders: { 3: 22, 8: 26, 20: 29, 27: 83, 35: 44, 50: 67, 70: 90, 88: 99 }
            },
            3: {
                snakes: { 97: 76, 92: 51, 83: 27, 69: 33, 54: 34, 43: 17, 37: 3, 24: 5 },
                ladders: { 6: 25, 11: 40, 23: 67, 45: 84, 52: 68, 61: 79, 74: 92, 85: 97 }
            },
            4: {
                snakes: { 96: 42, 89: 53, 77: 16, 65: 52, 47: 19, 39: 5, 31: 14 },
                ladders: { 2: 23, 13: 46, 24: 56, 35: 64, 41: 77, 58: 91, 66: 85 }
            },
            5: {
                snakes: { 94: 72, 86: 59, 75: 32, 58: 37, 46: 25, 34: 12, 29: 7 },
                ladders: { 5: 18, 15: 44, 26: 48, 38: 81, 49: 63, 57: 76, 69: 88 }
            },
            6: {
                snakes: { 91: 68, 84: 63, 73: 41, 59: 38, 45: 22, 33: 15, 26: 9 },
                ladders: { 7: 29, 16: 47, 28: 52, 40: 62, 53: 74, 65: 82, 78: 95 }
            },
            7: {
                snakes: { 88: 67, 81: 60, 71: 49, 57: 35, 44: 21, 32: 13, 25: 8 },
                ladders: { 10: 33, 17: 50, 30: 55, 42: 66, 54: 75, 67: 86, 79: 96 }
            },
            8: {
                snakes: { 85: 64, 78: 57, 68: 46, 55: 34, 42: 20, 30: 11, 24: 6 },
                ladders: { 12: 35, 19: 51, 32: 58, 44: 69, 56: 77, 70: 87, 81: 97 }
            },
            9: {
                snakes: { 82: 61, 76: 54, 66: 43, 53: 31, 41: 18, 28: 10, 22: 4 },
                ladders: { 14: 37, 21: 53, 34: 61, 46: 71, 59: 79, 72: 89, 83: 98 }
            },
            10: {
                snakes: { 79: 58, 74: 52, 63: 40, 51: 29, 39: 16, 27: 8, 21: 3 },
                ladders: { 1: 20, 18: 45, 36: 64, 48: 73, 60: 81, 75: 90, 85: 99 }
            }
        };

        const selectedMap = presetMaps[mapNumber] || presetMaps[1];
        this.snakes = { ...selectedMap.snakes };
        this.ladders = { ...selectedMap.ladders };

        // Apply difficulty modifications
        if (this.difficulty === 'easy') {
            // Remove some snakes for easy mode
            const snakeKeys = Object.keys(this.snakes);
            const toRemove = Math.floor(snakeKeys.length * 0.3);
            for (let i = 0; i < toRemove; i++) {
                delete this.snakes[snakeKeys[i]];
            }
        } else if (this.difficulty === 'hard') {
            // Add more snakes for hard mode
            const extraSnakes = [
                { head: 16, tail: 6 },
                { head: 47, tail: 26 },
                { head: 49, tail: 11 }
            ];
            extraSnakes.forEach(snake => {
                if (!this.snakes[snake.head] && !this.ladders[snake.head]) {
                    this.snakes[snake.head] = snake.tail;
                }
            });
        }
    }

    startGame(mode) {
        this.gameMode = mode;
        this.isGameActive = true;
        this.gameStartTime = new Date();

        // Update games played counter
        const gamesPlayed = parseInt(localStorage.getItem('totalGamesPlayed') || '0') + 1;
        localStorage.setItem('totalGamesPlayed', gamesPlayed.toString());

        // Initialize game statistics
        this.gameStats = {
            totalMoves: 0,
            snakeHits: 0,
            ladderClimbs: 0,
            playerStats: {}
        };

        // Initialize players
        this.players = [];
        const botEmojis = ['🤖', '🚀', '⚡', '🔥'];
        const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];

        if (mode === 'pvb') {
            // Player vs multiple bots
            this.players.push({ name: 'Pemain', position: 1, isBot: false, emoji: '👤', color: 'player1', finished: false });
            for (let i = 0; i < this.pvbBotCount; i++) {
                this.players.push({
                    name: `Bot ${botNames[i]}`,
                    position: 1,
                    isBot: true,
                    emoji: botEmojis[i],
                    color: `player${i + 2}`,
                    finished: false
                });
            }
        } else {
            for (let i = 0; i < this.bvbBotCount; i++) {
                this.players.push({
                    name: `Bot ${botNames[i]}`,
                    position: 1,
                    isBot: true,
                    emoji: botEmojis[i],
                    color: `player${i + 1}`,
                    finished: false
                });
            }
        }

        // Initialize player statistics
        this.players.forEach((player, index) => {
            this.gameStats.playerStats[index] = {
                moves: 0,
                snakeHits: 0,
                ladderClimbs: 0,
                totalSteps: 0,
                position: 1,
                playDuration: 0 // Initialize play duration
            };
        });

        // Generate random positions based on difficulty
        this.generateRandomPositions();

        // Random first player
        this.currentPlayer = Math.floor(Math.random() * this.players.length);

        // Update UI
        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';

        this.setupPlayersUI();

        // Show auto play button HANYA untuk bot vs bot
        const autoPlayBtn = document.getElementById('autoPlay');
        if (mode === 'bvb') {
            autoPlayBtn.style.display = 'inline-block';
        } else {
            autoPlayBtn.style.display = 'none'; // SEMBUNYIKAN di mode PvB
        }

        this.createBoard();
        this.updateUI();

        // Play start sound
        this.playStartSound();

        this.addToLog(`🎮 Game dimulai! Mode: ${mode === 'pvb' ? 'Pemain vs Bot' : 'Bot vs Bot'}`);
        this.addToLog(`⚙️ Tingkat kesulitan: ${this.getDifficultyName()}`);
        this.addToLog(`🗺️ Desain Map: ${this.getMapName()}`);
        this.addToLog(`🐍 Ular: ${Object.keys(this.snakes).length} | 🪜 Tangga: ${Object.keys(this.ladders).length}`);
        this.addToLog(`🎲 ${this.getCurrentPlayer().name} bermain duluan!`);

        // Auto start logic untuk mode PvB jika bot main duluan
        if (mode === 'pvb' && this.getCurrentPlayer().isBot) {
            this.addToLog(`🎯 Permainan siap! Bot akan bergerak otomatis...`);
            // Bot bergerak otomatis dengan delay
            setTimeout(() => {
                if (this.isGameActive && !this.isPaused && this.getCurrentPlayer().isBot) {
                    this.rollDice();
                }
            }, this.getGameSpeedDelay());
        } else if (mode === 'bvb') {
            this.addToLog(`🎯 Permainan siap! Klik "Auto Play" untuk memulai simulasi bot.`);
        } else {
            this.addToLog(`🎯 Permainan siap! Klik "Lempar Dadu" untuk memulai.`);
        }
    }

    setupPlayersUI() {
        const playersInfo = document.getElementById('playersInfo');
        playersInfo.innerHTML = '';

        // Set grid class based on player count
        playersInfo.className = 'players-info';
        if (this.players.length === 2) {
            playersInfo.classList.add('two-players');
        } else if (this.players.length === 3) {
            playersInfo.classList.add('three-players');
        } else if (this.players.length === 4) {
            playersInfo.classList.add('four-players');
        }

        this.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.color}`;
            playerCard.id = `player${index + 1}Card`;

            playerCard.innerHTML = `
                <h3 id="player${index + 1}Name">${player.name}</h3>
                <div class="position">Posisi: <span id="player${index + 1}Pos">1</span></div>
                <div class="turn-indicator" id="player${index + 1}Turn"></div>
            `;

            playersInfo.appendChild(playerCard);
        });
    }

    getDifficultyName() {
        const names = {
            easy: 'Mudah 😊',
            medium: 'Sedang 😐',
            hard: 'Sulit 😤'
        };
        return names[this.difficulty];
    }

    getMapName() {
        if (this.mapDesign === 'random') return 'Random (Acak)';
        if (this.mapDesign === 'default') return 'Default (Standar)';
        return `Map #${this.mapDesign}`;
    }

    createBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';

        for (let row = 9; row >= 0; row--) {
            for (let col = 0; col < 10; col++) {
                let cellNumber;

                if (row % 2 === 1) {
                    cellNumber = row * 10 + col + 1;
                } else {
                    cellNumber = row * 10 + (9 - col) + 1;
                }

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `cell-${cellNumber}`;

                // Enhanced cell display tanpa emoji, hanya nomor dan arah
                if (this.snakes[cellNumber]) {
                    // KEPALA ULAR - Hanya menampilkan arah turun
                    cell.classList.add('snake-head');
                    cell.setAttribute('data-special', 'snake-head');
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-info">${cellNumber}→${this.snakes[cellNumber]}</div>
                    `;
                    cell.title = `ULAR: ${cellNumber} turun ke ${this.snakes[cellNumber]}`;
                } else if (this.ladders[cellNumber]) {
                    // DASAR TANGGA - Hanya menampilkan arah naik
                    cell.classList.add('ladder-bottom');
                    cell.setAttribute('data-special', 'ladder-bottom');
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-info">${cellNumber}→${this.ladders[cellNumber]}</div>
                    `;
                    cell.title = `TANGGA: ${cellNumber} naik ke ${this.ladders[cellNumber]}`;
                } else if (Object.values(this.snakes).includes(cellNumber)) {
                    // EKOR ULAR - Hanya menampilkan dari mana asalnya
                    cell.classList.add('snake-tail');
                    cell.setAttribute('data-special', 'snake-tail');
                    const snakeHead = Object.keys(this.snakes).find(head => this.snakes[head] == cellNumber);
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-info">${snakeHead}→${cellNumber}</div>
                    `;
                    cell.title = `EKOR ULAR: Dari ${snakeHead} turun ke ${cellNumber}`;
                } else if (Object.values(this.ladders).includes(cellNumber)) {
                    // ATAS TANGGA - Hanya menampilkan dari mana asalnya
                    cell.classList.add('ladder-top');
                    cell.setAttribute('data-special', 'ladder-top');
                    const ladderBottom = Object.keys(this.ladders).find(bottom => this.ladders[bottom] == cellNumber);
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-info">${ladderBottom}→${cellNumber}</div>
                    `;
                    cell.title = `ATAS TANGGA: Dari ${ladderBottom} naik ke ${cellNumber}`;
                } else {
                    // SEL BIASA - Hanya nomor
                    cell.innerHTML = `<div class="cell-number">${cellNumber}</div>`;
                    cell.title = `Kotak ${cellNumber}`;
                }

                board.appendChild(cell);
            }
        }

        this.updatePlayerPositions();
    }

    rollDice() {
        if (!this.isGameActive || this.isPaused || this.isRolling) return;

        // Track total clicks
        const totalClicks = parseInt(localStorage.getItem('totalClicks') || '0') + 1;
        localStorage.setItem('totalClicks', totalClicks.toString());

        // Check if current player is finished, skip to next active player
        if (this.getCurrentPlayer().finished) {
            this.switchToNextActivePlayer();
            return;
        }

        this.isRolling = true;
        const rollBtn = document.getElementById('rollDice');
        rollBtn.disabled = true;

        // Play dice sound
        this.playDiceSound();

        const diceValue = Math.floor(Math.random() * 6) + 1;
        const diceFace = document.querySelector('.dice-face');
        const diceResult = document.getElementById('diceResult');

        // LANGSUNG TAMPILKAN HASIL TANPA ANIMASI BERAT
        diceFace.textContent = this.getDiceFace(diceValue);
        diceResult.textContent = `Hasil: ${diceValue}`;
        diceResult.style.animation = 'diceResultPop 0.6s ease-out';

        // Reset animation after completion
        setTimeout(() => {
            diceResult.style.animation = '';
        }, 600);

        setTimeout(() => {
            this.movePlayer(diceValue);
            this.isRolling = false;
            rollBtn.disabled = false;
        }, 100); // Lebih cepat untuk responsivitas
    }

    switchToNextPlayer() {
        // Apply pending effects SEBELUM switch player
        const currentPlayer = this.getCurrentPlayer();

        if (currentPlayer.pendingSnakeEffect) {
            this.addToLog(`🐍 ${currentPlayer.emoji} ${currentPlayer.name} turun dari ${currentPlayer.position} ke ${currentPlayer.pendingSnakeEffect}`);
            currentPlayer.position = currentPlayer.pendingSnakeEffect;
            this.gameStats.playerStats[this.currentPlayer].position = currentPlayer.pendingSnakeEffect;
            delete currentPlayer.pendingSnakeEffect;
            this.updatePlayerPositions();
            this.updateUI();
            this.updateStatistics();
        }

        if (currentPlayer.pendingLadderEffect) {
            this.addToLog(`🪜 ${currentPlayer.emoji} ${currentPlayer.name} naik dari posisi sebelumnya ke ${currentPlayer.pendingLadderEffect}`);
            currentPlayer.position = currentPlayer.pendingLadderEffect;
            this.gameStats.playerStats[this.currentPlayer].position = currentPlayer.pendingLadderEffect;
            delete currentPlayer.pendingLadderEffect;
            this.updatePlayerPositions();
            this.updateUI();
            this.updateStatistics();

            // Check winner setelah naik tangga
            if (currentPlayer.position === 100 && !currentPlayer.finished) {
                this.handlePlayerFinish(this.currentPlayer);
                return;
            }
        }

        // Switch to next player
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.updateUI();

        // Auto play logic - PERBAIKAN DI SINI
        if (this.isGameActive && !this.isPaused) {
            const exactDelay = this.getGameSpeedDelay();

            // Mode Bot vs Bot - hanya jika auto play aktif
            if (this.gameMode === 'bvb' && this.autoPlayInterval) {
                setTimeout(() => {
                    if (this.isGameActive && !this.isPaused && this.autoPlayInterval && !this.getCurrentPlayer().finished) {
                        this.rollDice();
                    }
                }, exactDelay);
            }
            // Mode Pemain vs Bot - bot SELALU jalan otomatis setelah player
            else if (this.gameMode === 'pvb') {
                // Cek apakah pemain saat ini adalah bot
                const nextPlayer = this.getCurrentPlayer();
                if (nextPlayer && nextPlayer.isBot && !nextPlayer.finished) {
                    // Bot bergerak otomatis dengan delay
                    setTimeout(() => {
                        if (this.isGameActive && !this.isPaused && this.getCurrentPlayer().isBot && !this.getCurrentPlayer().finished) {
                            this.rollDice();
                        }
                    }, exactDelay);
                }
            }
        }
    }

    getDiceFace(value) {
        // Menggunakan angka biasa yang lebih jelas daripada unicode dice
        return value.toString();
    }

    async movePlayer(steps) {
        const currentPlayer = this.getCurrentPlayer();

        // Check if current player is already finished
        if (currentPlayer.finished) {
            this.addToLog(`⚠️ ${currentPlayer.emoji} ${currentPlayer.name} sudah selesai, melewati giliran.`);
            this.switchToNextActivePlayer();
            return;
        }

        const oldPosition = currentPlayer.position;
        let newPosition;

        // Handle backward movement if player is at 98+ and dice exceeds 100
        if (oldPosition >= 98) {
            const targetPosition = oldPosition + steps;
            if (targetPosition > 100) {
                // Move backward from 100
                newPosition = 100 - (targetPosition - 100);
                this.addToLog(`⚠️ ${currentPlayer.emoji} <strong>${currentPlayer.name}</strong> melempar dadu: <span class="dice-result-log">${steps}</span>, mundur ke posisi <span class="position-log">${newPosition}</span> karena melebihi 100!`, this.currentPlayer);
            } else {
                newPosition = targetPosition;
                this.addToLog(`${currentPlayer.emoji} <strong>${currentPlayer.name}</strong> melempar dadu: <span class="dice-result-log">${steps}</span>, pindah ke posisi <span class="position-log">${newPosition}</span>`, this.currentPlayer);
            }
        } else {
            newPosition = Math.min(oldPosition + steps, 100);
            this.addToLog(`${currentPlayer.emoji} <strong>${currentPlayer.name}</strong> melempar dadu: <span class="dice-result-log">${steps}</span>, pindah ke posisi <span class="position-log">${newPosition}</span>`, this.currentPlayer);
        }

        currentPlayer.position = newPosition;

        // Update statistics
        this.gameStats.totalMoves++;
        this.gameStats.playerStats[this.currentPlayer].moves++;
        this.gameStats.playerStats[this.currentPlayer].totalSteps += steps;
        this.gameStats.playerStats[this.currentPlayer].position = newPosition;

        // Play move sound and simple animate
        this.playMoveSound();
        this.updatePlayerPositions();
        this.updateUI();
        this.updateStatistics();

        // Check for snakes and ladders after updating position - TETAP POSISI SAMPAI GILIRAN BERIKUTNYA
        if (this.snakes[newPosition]) {
            const snakeEnd = this.snakes[newPosition];

            // Update snake statistics
            this.gameStats.snakeHits++;
            this.gameStats.playerStats[this.currentPlayer].snakeHits++;

            this.addToLog(`🐍 <strong>Oh tidak!</strong> ${currentPlayer.emoji} ${currentPlayer.name} terkena ular ${newPosition}→${snakeEnd}, tunggu giliran berikutnya untuk turun!`, this.currentPlayer);
            this.playSnakeSound();

            // TIDAK TURUN OTOMATIS - TUNGGU SWITCH PLAYER
            currentPlayer.pendingSnakeEffect = snakeEnd;

        } else if (this.ladders[newPosition]) {
            const ladderEnd = this.ladders[newPosition];

            // Update ladder statistics
            this.gameStats.ladderClimbs++;
            this.gameStats.playerStats[this.currentPlayer].ladderClimbs++;

            this.addToLog(`🪜 <strong>Beruntung!</strong> ${currentPlayer.emoji} ${currentPlayer.name} naik tangga ${newPosition}→${ladderEnd}, tunggu giliran berikutnya untuk naik!`, this.currentPlayer);
            this.playLadderSound();

            // TIDAK NAIK OTOMATIS - TUNGGU SWITCH PLAYER
            currentPlayer.pendingLadderEffect = ladderEnd;
        }

        // Check for winner
        if (currentPlayer.position === 100 && !currentPlayer.finished) {
            this.handlePlayerFinish(this.currentPlayer);
            return;
        }

        // Switch players dan apply pending effects
        this.switchToNextPlayer();
    }

    // Animasi sederhana untuk performa lebih baik
    animatePlayerMovement(playerIndex, from, to) {
        // Simple animation - langsung update tanpa delay
        return Promise.resolve();
    }

    animateSnakeSlide(playerIndex, from, to) {
        // Simple animation - langsung update tanpa delay
        return Promise.resolve();
    }

    animateLadderClimb(playerIndex, from, to) {
        // Simple animation - langsung update tanpa delay
        return Promise.resolve();
    }

    highlightPath(positions, type) {
        positions.forEach((pos, index) => {
            setTimeout(() => {
                const cell = document.getElementById(`cell-${pos}`);
                if (cell) {
                    cell.style.boxShadow = type === 'snake'
                        ? '0 0 20px rgba(255, 0, 0, 0.8)'
                        : '0 0 20px rgba(0, 255, 0, 0.8)';
                }
            }, index * 200);
        });
    }

    clearHighlights() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.boxShadow = '';
        });
    }

    updatePlayerPositions() {
        // Clear all player pieces
        document.querySelectorAll('.player-piece, .player-pieces-container').forEach(element => element.remove());

        // Group players by position
        const positionGroups = {};
        this.players.forEach((player, index) => {
            if (!positionGroups[player.position]) {
                positionGroups[player.position] = [];
            }
            positionGroups[player.position].push({ player, index });
        });

        // Add player pieces
        Object.entries(positionGroups).forEach(([position, playersAtPosition]) => {
            const cell = document.getElementById(`cell-${position}`);
            if (!cell) return;

            if (playersAtPosition.length === 1) {
                // Single player
                const { player, index } = playersAtPosition[0];
                const piece = document.createElement('div');
                piece.className = `player-piece player${index + 1}-piece`;
                piece.textContent = player.emoji;
                cell.appendChild(piece);
            } else {
                // Multiple players - create container
                const container = document.createElement('div');
                container.className = 'player-pieces-container';

                playersAtPosition.forEach(({ player, index }) => {
                    const piece = document.createElement('div');
                    piece.className = `player-piece player${index + 1}-piece`;
                    piece.textContent = player.emoji;
                    container.appendChild(piece);
                });

                cell.appendChild(container);
            }
        });
    }

    updateUI() {
        // Update player positions
        this.players.forEach((player, index) => {
            const posElement = document.getElementById(`player${index + 1}Pos`);
            if (posElement) {
                posElement.textContent = player.position;
            }
        });

        // Update turn indicators and card highlights
        this.players.forEach((player, index) => {
            const turnIndicator = document.getElementById(`player${index + 1}Turn`);
            const playerCard = document.getElementById(`player${index + 1}Card`);

            if (turnIndicator && playerCard) {
                const isActive = this.currentPlayer === index;
                turnIndicator.classList.toggle('active', isActive);
                playerCard.classList.toggle('active', isActive);
            }
        });

        // Update roll button visibility
        const rollBtn = document.getElementById('rollDice');
        if (rollBtn) {
            if (this.gameMode === 'pvb') {
                // Mode Pemain vs Bot: hanya tampilkan tombol saat giliran pemain (bukan bot)
                if (this.getCurrentPlayer().isBot) {
                    rollBtn.style.display = 'none'; // SEMBUNYIKAN saat giliran bot
                } else {
                    rollBtn.style.display = 'inline-block'; // TAMPILKAN saat giliran pemain
                    rollBtn.textContent = '🎲 Lempar Dadu';
                    rollBtn.disabled = this.isPaused || this.isRolling;
                }
            } else if (this.gameMode === 'bvb') {
                // Mode Bot vs Bot: selalu tampilkan untuk kontrol manual
                rollBtn.style.display = 'inline-block';
                rollBtn.textContent = '🎲 Lempar Dadu';
                rollBtn.disabled = this.isPaused || this.isRolling;
            } else {
                rollBtn.style.display = 'inline-block';
                rollBtn.textContent = '🎲 Lempar Dadu';
                rollBtn.disabled = this.isPaused || this.isRolling;
            }
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    toggleAutoPlay() {
        const autoBtn = document.getElementById('autoPlay');

        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            autoBtn.textContent = '▶️ Auto Play';
            autoBtn.style.background = 'var(--accent-player2)';
        } else {
            autoBtn.textContent = '⏸️ Stop Auto';
            autoBtn.style.background = 'var(--accent-danger)';

            // Set flag auto play dan mulai permainan dengan timing EKSAK
            this.autoPlayInterval = true;

            // Mulai auto play dengan timing SANGAT AKURAT sesuai pengaturan
            const exactDelay = this.getGameSpeedDelay();
            setTimeout(() => {
                if (this.isGameActive && !this.isPaused && this.autoPlayInterval) {
                    this.rollDice();
                }
            }, exactDelay);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseGame');
        const rollBtn = document.getElementById('rollDice');

        if (this.isPaused) {
            pauseBtn.textContent = '▶️ Lanjutkan';
            pauseBtn.style.background = 'var(--accent-success)';
            rollBtn.disabled = true;
            this.addToLog('⏸️ Permainan dijeda');
        } else {
            pauseBtn.textContent = '⏸️ Jeda';
            pauseBtn.style.background = 'var(--accent-warning)';
            rollBtn.disabled = false;
            this.addToLog('▶️ Permainan dilanjutkan');

            // PERBAIKAN: Restart auto play untuk bot setelah resume
            if (this.isGameActive && !this.isPaused) {
                const currentPlayer = this.getCurrentPlayer();
                const exactDelay = this.getGameSpeedDelay();

                // Mode Bot vs Bot - restart auto play jika masih aktif
                if (this.gameMode === 'bvb' && this.autoPlayInterval) {
                    setTimeout(() => {
                        if (this.isGameActive && !this.isPaused && this.autoPlayInterval && !this.getCurrentPlayer().finished) {
                            this.rollDice();
                        }
                    }, exactDelay);
                }
                // Mode Pemain vs Bot - restart auto play untuk bot
                else if (this.gameMode === 'pvb' && currentPlayer && currentPlayer.isBot && !currentPlayer.finished) {
                    setTimeout(() => {
                        if (this.isGameActive && !this.isPaused && this.getCurrentPlayer().isBot && !this.getCurrentPlayer().finished) {
                            this.rollDice();
                        }
                    }, exactDelay);
                }
            }
        }
    }

    addToLog(message, playerIndex = null) {
        const logContent = document.getElementById('logContent');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        if (playerIndex !== null && this.players[playerIndex]) {
            logEntry.classList.add(this.players[playerIndex].color);
        }

        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;

        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    downloadLog() {
        const logContent = document.getElementById('logContent');
        const logEntries = Array.from(logContent.children);

        if (logEntries.length === 0) {
            this.showNotification('❌ Log kosong, tidak ada yang didownload!', 'error');
            return;
        }

        // Generate log content
        let logText = `========================================\n`;
        logText += `🎮 GAME ULAR TANGGA - LOG PERMAINAN\n`;
        logText += `========================================\n`;
        logText += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
        logText += `⏰ Waktu Download: ${new Date().toLocaleTimeString('id-ID')}\n`;
        logText += `🎯 Mode: ${this.gameMode === 'pvb' ? 'Pemain vs Bot' : 'Bot vs Bot'}\n`;
        logText += `⚡ Kesulitan: ${this.getDifficultyName()}\n`;
        logText += `🗺️ Map: ${this.getMapName()}\n`;
        logText += `========================================\n\n`;

        // Add log entries
        logEntries.forEach((entry, index) => {
            const cleanText = entry.textContent.replace(/\s+/g, ' ').trim();
            logText += `${index + 1}. ${cleanText}\n`;
        });

        // Add footer with developer info
        logText += `\n========================================\n`;
        logText += `👨‍💻 DEVELOPER INFORMATION\n`;
        logText += `========================================\n`;
        logText += `🌟 Nama: Bang Wily (Wilykun)\n`;
        logText += `📱 WhatsApp: +62 896-8820-6739\n`;
        logText += `📧 Email: kunwily1994@gmail.com\n`;
        logText += `📺 YouTube: @ukosamasomoni1956\n`;
        logText += `📢 Channel: https://whatsapp.com/channel/0029VaiyhS37IUYSuDJoJj1L\n`;
        logText += `🎮 Game: Ular Tangga Interactive\n`;
        logText += `📅 Created: 2025\n`;
        logText += `========================================\n`;
        logText += `💝 Terima kasih telah bermain!\n`;
        logText += `🚀 Follow untuk update game terbaru!\n`;
        logText += `========================================\n`;

        // Create and download file
        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const filename = `UlarTangga_Log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_BangWily.txt`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('✅ Log berhasil didownload!', 'success');
        this.addToLog(`💾 Log permainan didownload: ${filename}`);
    }

    clearLog() {
        document.getElementById('logContent').innerHTML = '';
        this.addToLog('📋 Log dibersihkan');
    }

    updateStatistics() {
        const statsContainer = document.getElementById('statisticsContent');
        if (!statsContainer) return;

        const gameTime = this.gameStartTime ? Math.floor((new Date() - this.gameStartTime) / 1000) : 0;
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;

        // Calculate accurate totals from all players
        let totalMoves = 0;
        let totalSnakeHits = 0;
        let totalLadderClimbs = 0;
        let totalSteps = 0;

        this.players.forEach((player, index) => {
            const stats = this.gameStats.playerStats[index];
            totalMoves += stats.moves || 0;
            totalSnakeHits += stats.snakeHits || 0;
            totalLadderClimbs += stats.ladderClimbs || 0;
            totalSteps += stats.totalSteps || 0;
        });

        // Update main stats object to ensure consistency
        this.gameStats.totalMoves = totalMoves;
        this.gameStats.snakeHits = totalSnakeHits;
        this.gameStats.ladderClimbs = totalLadderClimbs;

        // Create player ranking yang akurat
        const playerRanking = this.players
            .map((p, i) => ({
                ...p,
                index: i,
                stats: this.gameStats.playerStats[i]
            }))
            .sort((a, b) => {
                // Jika keduanya sudah selesai, urutkan berdasarkan finish rank
                if (a.finished && b.finished) {
                    return a.finishRank - b.finishRank;
                }
                // Yang sudah selesai selalu di atas yang belum
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                // Yang belum selesai diurutkan berdasarkan posisi tertinggi
                return b.position - a.position;
            });

        // Hitung bot yang sudah selesai
        const finishedPlayersCount = this.players.filter(p => p.finished).length;
        const totalPlayers = this.players.length;

        let statsHTML = `
            <div class="stats-header">
                📊 Statistik Permainan Live
            </div>
            <div class="stats-content">
                <div class="stats-overview">
                    <div class="stat-item">⏱️ Waktu: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="stat-item">🎲 Total Lemparan: ${totalMoves}</div>
                    <div class="stat-item">🚶 Total Langkah: ${totalSteps}</div>
                    <div class="stat-item">🐍 Total Kena Ular: ${totalSnakeHits}</div>
                    <div class="stat-item">🪜 Total Naik Tangga: ${totalLadderClimbs}</div>
                    <div class="stat-item">🏁 Bot Selesai: ${finishedPlayersCount}/${totalPlayers}</div>
                </div>
                <div class="player-stats">
        `;

        playerRanking.forEach((player, rankIndex) => {
            const stats = player.stats;
            const rank = rankIndex + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
            const statusText = player.finished ? 'SELESAI' : 'BERMAIN';
            const statusClass = player.finished ? 'finished' : 'playing';

            statsHTML += `
                <div class="player-stat ${player.color} rank-${rank}" style="animation-delay: ${rankIndex * 0.2}s">
                    <div class="player-stat-header">
                        <div class="rank-badge">${rankEmoji} Peringkat #${rank}</div>
                        <div class="player-info">
                            ${player.emoji} ${player.name}
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="player-stat-details">
                        <span class="stat-highlight">📍 Posisi: ${stats.position}</span>
                        <span>🎲 Lemparan: ${stats.moves}</span>
                        <span>🚶 Total Langkah: ${stats.totalSteps}</span>
                        <span>🐍 Kena Ular: ${stats.snakeHits}</span>
                        <span>🪜 Naik Tangga: ${stats.ladderClimbs}</span>
                        <span>⏱️ Waktu: ${this.formatPlayDuration(player.finished ? (stats.playDuration || 0) : this.getCurrentPlayDuration(player.index))}</span>
                    </div>
                </div>
            `;
        });

        statsHTML += `
                </div>
            </div>
        `;

        // Update content
        statsContainer.innerHTML = statsHTML;
    }



    handlePlayerFinish(playerIndex) {
        const player = this.players[playerIndex];

        // Prevent duplicate finish handling
        if (player.finished) {
            this.switchToNextActivePlayer();
            return;
        }

        // Mark player as finished and set rank berdasarkan jumlah yang sudah finish
        player.finished = true;
        const alreadyFinishedCount = this.players.filter(p => p.finished && p.finishRank).length;
        player.finishRank = alreadyFinishedCount + 1;

        // Record play duration when finished - calculate from game start
        const currentTime = new Date();
        const playDuration = this.gameStartTime ? Math.floor((currentTime - this.gameStartTime) / 1000) : 0;
        this.gameStats.playerStats[playerIndex].playDuration = playDuration;

        // Store finish time for accurate duration tracking
        player.finishTime = currentTime;


        // Play win sound only once - check if already played
        if (!this.winSoundPlayed) {
            this.playWinSound();
            this.winSoundPlayed = true;

            // Reset flag after sound duration
            setTimeout(() => {
                this.winSoundPlayed = false;
            }, 2000);
        }

        // Add finish animation only once with better check
        const piece = document.querySelector(`.player-piece.player${playerIndex + 1}-piece`);
        if (piece && !piece.classList.contains('finished-player') && !piece.hasAttribute('data-animated')) {
            piece.style.animation = 'winnerCelebration 1.5s ease-in-out';
            piece.classList.add('finished-player');
            piece.setAttribute('data-animated', 'true');
        }

        this.addToLog(`🏆 ${player.emoji} <strong>${player.name}</strong> menyelesaikan permainan di peringkat ke-${player.finishRank}!`, playerIndex);

        // Check remaining active players
        const activePlayers = this.players.filter(p => !p.finished);
        const activePlayersCount = activePlayers.length;

        if (activePlayersCount === 0) {
            // All players finished
            setTimeout(() => this.endGame(), 2000);
            return;
        } else if (activePlayersCount === 1) {
            // Only one player left - they get last place and game ends
            const lastPlayer = activePlayers[0];
            const lastPlayerIndex = this.players.findIndex(p => p === lastPlayer);
            lastPlayer.finished = true;
            const currentFinishedCount = this.getFinishedPlayersCount();
            lastPlayer.finishRank = currentFinishedCount + 1;

            // Record play duration for last player
            const currentTime = new Date();
            const playDuration = this.gameStartTime ? Math.floor((currentTime - this.gameStartTime) / 1000) : 0;
            this.gameStats.playerStats[lastPlayerIndex].playDuration = playDuration;
            lastPlayer.finishTime = currentTime;

            this.addToLog(`🥉 ${lastPlayer.emoji} ${lastPlayer.name} mendapat peringkat terakhir ke-${lastPlayer.finishRank}`);
            setTimeout(() => this.endGame(), 2000);
            return;
        }

        // Continue game with remaining active players
        this.switchToNextActivePlayer();
    }

    getFinishedPlayersCount() {
        return this.players.filter(p => p.finished).length;
    }

    switchToNextActivePlayer() {
        // Check if there are any active players left
        const activePlayers = this.players.filter(p => !p.finished);

        if (activePlayers.length === 0) {
            this.addToLog('🎯 Semua pemain telah selesai!');
            setTimeout(() => this.endGame(), 1000);
            return;
        }

        // Find next active player
        let attempts = 0;
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
            attempts++;
        } while (this.players[this.currentPlayer].finished && attempts < this.players.length);

        // Double check - if current player is still finished, find first unfinished player
        if (this.players[this.currentPlayer].finished) {
            for (let i = 0; i < this.players.length; i++) {
                if (!this.players[i].finished) {
                    this.currentPlayer = i;
                    break;
                }
            }
        }

        this.updateUI();

        // Continue auto play logic
        if (this.isGameActive && !this.isPaused && !this.players[this.currentPlayer].finished) {
            const exactDelay = this.getGameSpeedDelay();

            // Mode Bot vs Bot - hanya jika auto play aktif
            if (this.gameMode === 'bvb' && this.autoPlayInterval) {
                setTimeout(() => {
                    if (this.isGameActive && !this.isPaused && this.autoPlayInterval && !this.getCurrentPlayer().finished) {
                        this.rollDice();
                    }
                }, exactDelay);
            } 
            // Mode Pemain vs Bot - bot SELALU jalan otomatis
            else if (this.gameMode === 'pvb' && this.getCurrentPlayer().isBot && !this.getCurrentPlayer().finished) {
                setTimeout(() => {
                    if (this.isGameActive && !this.isPaused && this.getCurrentPlayer().isBot && !this.getCurrentPlayer().finished) {
                        this.rollDice();
                    }
                }, exactDelay);
            }
        }
    }

    endGame() {
        this.isGameActive = false;

        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            document.getElementById('autoPlay').textContent = '▶️ Auto Play';
        }

        // Play win sound
        this.playWinSound();

        // Calculate final statistics
        const gameTime = this.gameStartTime ? Math.floor((new Date() - this.gameStartTime) / 1000) : 0;
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;

        // Create final ranking based on finish order and position
        const finalRanking = this.players
            .map((p, i) => ({
                ...p,
                index: i,
                stats: this.gameStats.playerStats[i]
            }))
            .sort((a, b) => {
                // Players who finished are ranked by their finish order
                if (a.finished && b.finished) {
                    return a.finishRank - b.finishRank;
                }
                // Finished players always rank higher than unfinished
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                // Unfinished players ranked by position
                return b.position - a.position;
            });

        // Find winner (first in ranking)
        const winner = finalRanking[0];
        const winnerStats = this.gameStats.playerStats[winner.index];

        this.addToLog(`🎉 Game selesai! ${winner.name} menang!`);
        this.addToLog(`⏱️ Waktu permainan: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        this.addToLog(`🏆 Ranking final:`);

        finalRanking.forEach((player, rank) => {
            const rankEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '🏅';
            this.addToLog(`${rankEmoji} ${rank + 1}. ${player.emoji} ${player.name} - Posisi ${player.position} (${player.stats.moves} lemparan)`);
        });

        // Show new victory page instead of modal
        this.showVictoryPage(finalRanking, gameTime);
    }

    showVictoryPage(finalRanking, gameTime) {
        // Hide game area
        document.getElementById('gameArea').style.display = 'none';

        // Create victory page
        this.createVictoryPage(finalRanking, gameTime);

        // Show victory page
        document.getElementById('victoryPage').style.display = 'block';
    }

    createVictoryPage(finalRanking, gameTime) {
        const winner = finalRanking[0];
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;

        // Remove existing victory page if exists
        const existingPage = document.getElementById('victoryPage');
        if (existingPage) {
            existingPage.remove();
        }

        // Create victory page HTML
        const victoryPageHTML = `
            <div id="victoryPage" class="victory-page" style="display: none;">
                <div class="victory-container">
                    <div class="victory-header">
                        <div class="winner-crown">👑</div>
                        <h1 class="victory-title">🎉 PERMAINAN SELESAI!</h1>
                        <div class="winner-info">
                            <div class="winner-emoji">${winner.emoji}</div>
                            <h2 class="winner-name">${winner.name} MENANG!</h2>
                        </div>
                    </div>

                    <div class="victory-content">
                        <div class="game-summary">
                            <h3>📊 Ringkasan Permainan</h3>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <div class="summary-icon">⏱️</div>
                                    <div class="summary-text">
                                        <span class="summary-value">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                                        <span class="summary-label">Total Waktu</span>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-icon">🎲</div>
                                    <div class="summary-text">
                                        <span class="summary-value">${this.gameStats.totalMoves}</span>
                                        <span class="summary-label">Total Lemparan</span>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-icon">🐍</div>
                                    <div class="summary-text">
                                        <span class="summary-value">${this.gameStats.snakeHits}</span>
                                        <span class="summary-label">Total Kena Ular</span>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-icon">🪜</div>
                                    <div class="summary-text">
                                        <span class="summary-value">${this.gameStats.ladderClimbs}</span>
                                        <span class="summary-label">Total Naik Tangga</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="ranking-section">
                            <h3>🏆 Peringkat Final</h3>
                            <div class="ranking-list">
                                ${finalRanking.map((player, index) => {
                                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                                    const stats = this.gameStats.playerStats[player.index];
                                    return `
                                        <div class="rank-item ${player.color} rank-${index + 1} ${index === 0 ? 'winner-rank' : ''}">
                                            <div class="rank-position">
                                                <span class="rank-emoji">${rankEmoji}</span>
                                                <span class="rank-number">#${index + 1}</span>
                                            </div>
                                            <div class="rank-player">
                                                <span class="rank-player-emoji">${player.emoji}</span>
                                                <span class="rank-player-name">${player.name}</span>
                                            </div>
                                            <div class="rank-stats">
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Posisi:</span>
                                                    <span class="rank-stat-value">${player.position}</span>
                                                </div>
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Lemparan:</span>
                                                    <span class="rank-stat-value">${stats.moves}</span>
                                                </div>
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Langkah:</span>
                                                    <span class="rank-stat-value">${stats.totalSteps}</span>
                                                </div>
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Ular:</span>
                                                    <span class="rank-stat-value">${stats.snakeHits}</span>
                                                </div>
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Tangga:</span>
                                                    <span class="rank-stat-value">${stats.ladderClimbs}</span>
                                                </div>
                                                <div class="rank-stat">
                                                    <span class="rank-stat-label">Waktu:</span>
                                                    <span class="rank-stat-value">${this.formatPlayDuration(player.finished ? (this.gameStats.playerStats[player.index].playDuration || 0) : this.getCurrentPlayDuration(player.index))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="victory-log-section">
                            <h3>📋 Riwayat Permainan</h3>
                            <div class="victory-log-content">
                                ${document.getElementById('logContent').innerHTML}
                            </div>
                            <div class="victory-log-actions">
                                <button id="victoryDownloadLog" class="victory-btn victory-download-btn">
                                    📥 Download Log Lengkap
                                </button>
                            </div>
                        </div>

                        <div class="victory-actions">
                            <button id="victoryPlayAgain" class="victory-btn victory-primary-btn">
                                🎮 Main Lagi
                            </button>
                            <button id="victoryBackToMenu" class="victory-btn victory-secondary-btn">
                                🏠 Kembali ke Menu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.insertAdjacentHTML('beforeend', victoryPageHTML);

        // Add event listeners
        document.getElementById('victoryPlayAgain').addEventListener('click', () => {
            const victoryPage = document.getElementById('victoryPage');
            if (victoryPage) {
                victoryPage.style.display = 'none';
            }
            this.resetGame();
        });

        document.getElementById('victoryBackToMenu').addEventListener('click', () => {
            const victoryPage = document.getElementById('victoryPage');
            if (victoryPage) {
                victoryPage.style.display = 'none';
            }
            this.backToMenu();
        });

        document.getElementById('victoryDownloadLog').addEventListener('click', () => {
            this.downloadVictoryLog(finalRanking, gameTime);
        });
    }

    downloadVictoryLog(finalRanking, gameTime) {
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        const winner = finalRanking[0];

        // Generate comprehensive log
        let logText = `========================================\n`;
        logText += `🎮 GAME ULAR TANGGA - HASIL AKHIR\n`;
        logText += `========================================\n`;
        logText += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
        logText += `⏰ Waktu Selesai: ${new Date().toLocaleTimeString('id-ID')}\n`;
        logText += `🎯 Mode: ${this.gameMode === 'pvb' ? 'Pemain vs Bot' : 'Bot vs Bot'}\n`;
        logText += `⚡ Kesulitan: ${this.getDifficultyName()}\n`;
        logText += `🗺️ Map: ${this.getMapName()}\n`;
        logText += `========================================\n\n`;

        logText += `🏆 PEMENANG: ${winner.emoji} ${winner.name}\n`;
        logText += `⏱️ Waktu Permainan: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
        logText += `🎲 Total Lemparan: ${this.gameStats.totalMoves}\n`;
        logText += `🐍 Total Kena Ular: ${this.gameStats.snakeHits}\n`;
        logText += `🪜 Total Naik Tangga: ${this.gameStats.ladderClimbs}\n\n`;

        logText += `========================================\n`;
        logText += `🏆 PERINGKAT FINAL\n`;
        logText += `========================================\n`;
        finalRanking.forEach((player, index) => {
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            const stats = this.gameStats.playerStats[player.index];
            logText += `${rankEmoji} ${index + 1}. ${player.emoji} ${player.name}\n`;
            logText += `   📍 Posisi Akhir: ${player.position}\n`;
            logText += `   🎲 Lemparan: ${stats.moves}\n`;
            logText += `   🚶 Total Langkah: ${stats.totalSteps}\n`;
            logText += `   🐍 Kena Ular: ${stats.snakeHits}\n`;
            logText += `   🪜 Naik Tangga: ${stats.ladderClimbs}\n`;
            logText += `   📊 Rata-rata Langkah: ${stats.moves > 0 ? Math.round(stats.totalSteps / stats.moves) : 0}\n\n`;
        });

        logText += `========================================\n`;
        logText += `📋 RIWAYAT PERMAINAN LENGKAP\n`;
        logText += `========================================\n`;
        const logEntries = Array.from(document.getElementById('logContent').children);
        logEntries.forEach((entry, index) => {
            const cleanText = entry.textContent.replace(/\s+/g, ' ').trim();
            logText += `${index + 1}. ${cleanText}\n`;
        });

        logText += `\n========================================\n`;
        logText += `👨‍💻 DEVELOPER INFORMATION\n`;
        logText += `========================================\n`;
        logText += `🌟 Nama: Bang Wily (Wilykun)\n`;
        logText += `📱 WhatsApp: +62 896-8820-6739\n`;
        logText += `📧 Email: kunwily1994@gmail.com\n`;
        logText += `📺 YouTube: @ukosamasomoni1956\n`;
        logText += `📢 Channel: https://whatsapp.com/channel/0029VaiyhS37IUYSuDJoJj1L\n`;
        logText += `🎮 Game: Ular Tangga Interactive v2.0\n`;
        logText += `📅 Created: 2025\n`;
        logText += `========================================\n`;
        logText += `💝 Terima kasih telah bermain!\n`;
        logText += `🚀 Follow untuk update game terbaru!\n`;
        logText += `========================================\n`;

        // Create and download file
        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const filename = `UlarTangga_Hasil_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_BangWily.txt`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('✅ Log hasil permainan berhasil didownload!', 'success');
    }

    getPerformanceRating(stats) {
        const efficiency = stats.totalSteps / stats.moves;
        let rating = '';
        let emoji = '';

        if (efficiency >= 5) {
            rating = 'Luar Biasa!';
            emoji = '🌟';
        } else if (efficiency >= 4) {
            rating = 'Sangat Baik!';
            emoji = '⭐';
        } else if (efficiency >= 3.5) {
            rating = 'Baik!';
            emoji = '👍';
        } else {
            rating = 'Cukup Baik!';
            emoji = '👌';
        }

        return `<div class="performance-badge">${emoji} ${rating}</div>`;
    }

    resetGame() {
        // Reset player positions and states
        this.players.forEach(player => {
            player.position = 1;
            player.finished = false;
            delete player.finishRank;
            // Reset stats for the new game
            if (this.gameStats.playerStats[player.index]) {
                this.gameStats.playerStats[player.index] = {
                    moves: 0,
                    snakeHits: 0,
                    ladderClimbs: 0,
                    totalSteps: 0,
                    position: 1,
                    playDuration: 0 // Reset play duration
                };
            }
        });

        // Reset game state
        this.currentPlayer = Math.floor(Math.random() * this.players.length);
        this.isGameActive = true;
        this.isPaused = false;
        this.gameStartTime = new Date();

        // Reset statistics
        this.gameStats.totalMoves = 0;
        this.gameStats.snakeHits = 0;
        this.gameStats.ladderClimbs = 0;
        // playerStats are reset above

        // Reset auto play COMPLETELY
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            const autoBtn = document.getElementById('autoPlay');
            if (autoBtn) {
                autoBtn.textContent = '▶️ Auto Play';
                autoBtn.style.background = 'var(--accent-player2)';
            }
        }

        // Clear all auto play flags and timeouts
        this.autoPlayInterval = null;

        // Reset pause button
        const pauseBtn = document.getElementById('pauseGame');
        if (pauseBtn) {
            pauseBtn.textContent = '⏸️ Jeda';
            pauseBtn.style.background = 'var(--accent-warning)';
        }

        // Hide modals and victory page
        const winnerModal = document.getElementById('winnerModal');
        if (winnerModal) winnerModal.style.display = 'none';

        const victoryPage = document.getElementById('victoryPage');
        if (victoryPage) victoryPage.style.display = 'none';

        // Show game area
        document.getElementById('gameArea').style.display = 'block';

        // Reset dice
        document.getElementById('diceResult').textContent = '-';
        document.querySelector('.dice-face').textContent = '🎲';

        // Generate new random positions
        this.generateRandomPositions();

        // Clear and recreate board
        this.createBoard();
        this.updateUI();
        this.updateStatistics();

        // Play start sound
        this.playStartSound();

        // Clear log and add start message
        document.getElementById('logContent').innerHTML = '';
        this.addToLog(`🔄 Game direset! Mode: ${this.gameMode === 'pvb' ? 'Pemain vs Bot' : 'Bot vs Bot'}`);
        this.addToLog(`⚙️ Tingkat kesulitan: ${this.getDifficultyName()}`);
        this.addToLog(`🗺️ Desain Map: ${this.getMapName()}`);
        this.addToLog(`🐍 Ular: ${Object.keys(this.snakes).length} | 🪜 Tangga: ${Object.keys(this.ladders).length}`);
        this.addToLog(`🎲 ${this.getCurrentPlayer().name} bermain duluan!`);

        // SETELAH RESET - auto start hanya untuk bot di mode PvB
        if (this.gameMode === 'pvb' && this.getCurrentPlayer().isBot) {
            this.addToLog(`🎯 Game direset! Bot akan bergerak otomatis...`);
            // Bot bergerak otomatis dengan delay setelah reset
            setTimeout(() => {
                if (this.isGameActive && !this.isPaused && this.getCurrentPlayer().isBot) {
                    this.rollDice();
                }
            }, this.getGameSpeedDelay());
        } else if (this.gameMode === 'bvb') {
            this.addToLog(`🎯 Game direset! Klik "Auto Play" untuk memulai simulasi bot.`);
        } else {
            this.addToLog(`🎯 Game direset! Klik "Lempar Dadu" untuk memulai.`);
        }
    }

    backToMenu() {
        // Reset everything
        this.isGameActive = false;
        this.gameMode = null;
        this.players = [];
        this.currentPlayer = 0;
        this.isPaused = false;
        this.gameStartTime = null;

        // Clear auto play
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }

        // Hide all game-related elements
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('winnerModal').style.display = 'none';

        const victoryPage = document.getElementById('victoryPage');
        if (victoryPage) {
            victoryPage.style.display = 'none';
        }

        // Show setup
        document.getElementById('gameSetup').style.display = 'block';

        // Reset dice
        document.getElementById('diceResult').textContent = '-';
        document.querySelector('.dice-face').textContent = '🎲';
        document.getElementById('logContent').innerHTML = '';

        // Reset game statistics
        this.gameStats = {
            totalMoves: 0,
            snakeHits: 0,
            ladderClimbs: 0,
            playerStats: {}
        };
    }

    openModeModal() {
        document.getElementById('modeModal').style.display = 'flex';
        this.updateModeSettingsPreview();
        this.playSound(523, 0.2, 'triangle');
    }

    updateModeSettingsPreview() {
        // Update Player vs Bot settings
        const pvbPreview = document.querySelector('#playerVsBot .mode-settings-preview');
        if (pvbPreview) {
            pvbPreview.innerHTML = `
                <div class="settings-preview-header">🎮 Pengaturan Aktif</div>
                <div class="setting-preview">
                    <span class="setting-label">🤖 Jumlah Bot:</span>
                    <span class="setting-value">${this.pvbBotCount} Bot</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">⚡ Tingkat Kesulitan:</span>
                    <span class="setting-value">${this.getDifficultyName()}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">🗺️ Desain Map:</span>
                    <span class="setting-value">${this.getMapName()}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">🎨 Tema:</span>
                    <span class="setting-value">${this.currentTheme === 'light' ? '☀️ Cerah' : '🌙 Gelap'}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">🔊 Suara:</span>
                    <span class="setting-value">${this.soundEnabled ? `Aktif (${Math.round(this.volume * 100)}%)` : 'Nonaktif'}</span>
                </div>
            `;
        }

        // Update Bot vs Bot settings
        const bvbPreview = document.querySelector('#botVsBot .mode-settings-preview');
        if (bvbPreview) {
            bvbPreview.innerHTML = `
                <div class="settings-preview-header">🤖 Pengaturan Aktif</div>
                <div class="setting-preview">
                    <span class="setting-label">🤖 Jumlah Bot:</span>
                    <span class="setting-value">${this.bvbBotCount} Bot</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">⚡ Kecepatan Game:</span>
                    <span class="setting-value">${this.getGameSpeedName()}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">⚡ Tingkat Kesulitan:</span>
                    <span class="setting-value">${this.getDifficultyName()}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">🗺️ Desain Map:</span>
                    <span class="setting-value">${this.getMapName()}</span>
                </div>
                <div class="setting-preview">
                    <span class="setting-label">🎨 Tema:</span>
                    <span class="setting-value">${this.currentTheme === 'light' ? '☀️ Cerah' : '🌙 Gelap'}</span>
                </div>
            `;
        }
    }

    getGameSpeedDelay() {
        const speed = parseFloat(this.gameSpeed);
        if (speed >= 1) {
            return speed * 1000; // Convert seconds to milliseconds
        } else {
            return speed * 1000; // For sub-second speeds
        }
    }

    getGameSpeedName() {
        const speed = parseFloat(this.gameSpeed);
        if (speed === 0.25) return '⚡⚡ 0.25 Detik (Ultra Cepat)';
        if (speed === 0.5) return '🚀⚡ 0.5 Detik (Super Cepat)';
        if (speed === 0.75) return '🚀 0.75 Detik (Sangat Cepat+)';
        if (speed === 1) return '🚀 1 Detik (Sangat Cepat)';
        if (speed === 2) return '⚡ 2 Detik (Cepat)';
        if (speed === 3) return '⏱️ 3 Detik (Sedang)';
        if (speed === 4) return '🐌 4 Detik (Lambat)';
        if (speed === 5) return '🐢 5 Detik (Sangat Lambat)';
        return '⏱️ 3 Detik (Default)';
    }

    closeModeModal() {
        document.getElementById('modeModal').style.display = 'none';
        this.playSound(392, 0.2, 'triangle');
    }

    showSettings() {
        document.getElementById('modeModal').style.display = 'none';
        document.getElementById('settingsPanel').style.display = 'block';
        this.playSound(440, 0.2, 'triangle');
    }

    openInfoModal() {
        document.getElementById('infoModal').style.display = 'flex';
        this.playSound(523, 0.2, 'triangle');
    }

    closeInfoModal() {
        document.getElementById('infoModal').style.display = 'none';
        this.playSound(392, 0.2, 'triangle');
    }

    openServerModal() {
        document.getElementById('serverModal').style.display = 'flex';
        this.loadServerInfo();
        this.playSound(523, 0.2, 'triangle');
    }

    closeServerModal() {
        document.getElementById('serverModal').style.display = 'none';
        this.playSound(392, 0.2, 'triangle');
    }

    toggleSettingsModal() {
        const settingsPanel = document.getElementById('settingsPanel');
        const isVisible = settingsPanel.style.display === 'block';

        if (isVisible) {
            settingsPanel.style.display = 'none';
            this.playSound(392, 0.2, 'triangle'); // Lower pitch for close
        } else {
            settingsPanel.style.display = 'block';
            this.playSound(440, 0.2, 'triangle'); // Higher pitch for open
        }
    }

    openDeveloperModal() {
        document.getElementById('developerModal').style.display = 'flex';
        this.playSound(523, 0.2, 'triangle');
    }

    closeDeveloperModal() {
        document.getElementById('developerModal').style.display = 'none';
        this.playSound(392, 0.2, 'triangle');
    }



    loadServerInfo() {
        const startTime = performance.now();
        const sessionStart = new Date().toLocaleString('id-ID');

        // Helper function untuk safely update element content
        const safeUpdateElement = (id, content) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = content;
            }
        };

        // Update basic info immediately
        safeUpdateElement('currentDate', new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));

        safeUpdateElement('serverTime', new Date().toLocaleTimeString('id-ID'));
        safeUpdateElement('timezone',Intl.DateTimeFormat().resolvedOptions().timeZone);
        safeUpdateElement('sessionStart', sessionStart);
        safeUpdateElement('serverStartDate', new Date().toLocaleDateString('id-ID'));

        // CPU Info
        document.getElementById('cpuCores').textContent = navigator.hardwareConcurrency || 'Unknown';
        document.getElementById('platform').textContent = navigator.platform || 'Unknown';
        document.getElementById('architecture').textContent = navigator.userAgentData?.platform || 'Unknown';

        // Memory info (estimated)
        if (navigator.deviceMemory) {
            const totalRam = navigator.deviceMemory * 1024; // MB
            const usedRam = Math.floor(Math.random() * (totalRam * 0.7 - totalRam * 0.3) + totalRam * 0.3);
            const availableRam = totalRam - usedRam;
            const percentage = Math.round((usedRam / totalRam) * 100);

            document.getElementById('totalRam').textContent = `${totalRam} MB`;
            document.getElementById('usedRam').textContent = `${usedRam} MB`;
            document.getElementById('availableRam').textContent = `${availableRam} MB`;
            document.getElementById('ramPercentage').textContent = `${percentage}%`;

            const ramProgress = document.getElementById('ramProgress');
            ramProgress.style.width = `${percentage}%`;
        } else {
            document.getElementById('totalRam').textContent = 'Not Available';
            document.getElementById('usedRam').textContent = 'Not Available';
            document.getElementById('availableRam').textContent = 'Not Available';
            document.getElementById('ramPercentage').textContent = 'N/A';
        }

        // Network info
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        document.getElementById('connectionType').textContent = connection ? 
            `${connection.effectiveType || 'Unknown'} (${connection.downlink || 'Unknown'} Mbps)` : 'Unknown';

        document.getElementById('userAgent').textContent = navigator.userAgent.substring(0, 50) + '...';
        document.getElementById('screenResolution').textContent = `${screen.width}x${screen.height}`;

        // Performance info
        const loadTime = performance.timing ? 
            Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart) : 'Unknown';
        const domReady = performance.timing ? 
            Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart) : 'Unknown';

        document.getElementById('pageLoadTime').textContent = loadTime !== 'Unknown' ? `${loadTime}ms` : 'Unknown';
        document.getElementById('domReadyTime').textContent = domReady !== 'Unknown' ? `${domReady}ms` : 'Unknown';

        // Browser engine detection
        let browserEngine = 'Unknown';
        if (window.chrome) browserEngine = 'Blink (Chrome/Chromium)';
        else if (window.safari) browserEngine = 'WebKit (Safari)';
        else if (window.mozInnerScreenX !== undefined) browserEngine = 'Gecko (Firefox)';
        else if (window.MSStream) browserEngine = 'EdgeHTML (Edge Legacy)';

        document.getElementById('browserEngine').textContent = browserEngine;

        // WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        document.getElementById('webglSupport').textContent = gl ? 'Supported' : 'Not Supported';

        // Audio support
        const audio = new Audio();
        const audioSupport = audio.canPlayType('audio/mpeg') ? 'MP3 Supported' : 'Limited Support';
        document.getElementById('audioSupport').textContent = audioSupport;

        // Processor info (estimated)
        document.getElementById('processorInfo').textContent = this.detectProcessor();

        // Start uptime counter
        this.startUptimeCounter();

        // Start real-time updates
        this.startServerInfoUpdates();
    }

    detectProcessor() {
        const cores = navigator.hardwareConcurrency || 4;
        const platform = navigator.platform.toLowerCase();

        if (platform.includes('win')) {
            return `Intel/AMD ${cores}-Core (Windows)`;
        } else if (platform.includes('mac')) {
            return `Apple Silicon/Intel ${cores}-Core (macOS)`;
        } else if (platform.includes('linux')) {
            return `Intel/AMD ${cores}-Core (Linux)`;
        } else if (platform.includes('arm')) {
            return `ARM ${cores}-Core Processor`;
        } else {
            return `Multi-Core Processor (${cores} cores)`;
        }
    }

    startUptimeCounter() {
        const startTime = new Date();

        setInterval(() => {
            const now = new Date();
            const uptime = Math.floor((now - startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;

            const uptimeText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            const uptimeElement = document.getElementById('serverUptime');
            if (uptimeElement) {
                uptimeElement.textContent = uptimeText;
            }
        }, 1000);
    }

    startServerInfoUpdates() {
        // Update time every second
        setInterval(() => {
            const timeElement = document.getElementById('serverTime');
            if (timeElement && document.getElementById('serverModal').style.display === 'flex') {
                timeElement.textContent = new Date().toLocaleTimeString('id-ID');
            }
        }, 1000);

        // Update game statistics
        const updateGameStats = () => {
            const gamesPlayedElement = document.getElementById('gamesPlayed');
            const totalClicksElement = document.getElementById('totalClicks');

            if (gamesPlayedElement && this.gameStats) {
                const gamesPlayed = localStorage.getItem('totalGamesPlayed') || '0';
                gamesPlayedElement.textContent = gamesPlayed;
            }

            if (totalClicksElement) {
                const totalClicks = localStorage.getItem('totalClicks') || '0';
                totalClicksElement.textContent = totalClicks;
            }
        };

        updateGameStats();
        setInterval(updateGameStats, 5000);
    }

    addNotificationCSS() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInNotification {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutNotification {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @keyframes winnerCelebration {
                0% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.3) rotate(10deg); }
                50% { transform: scale(1.5) rotate(-10deg); }
                75% { transform: scale(1.3) rotate(5deg); }
                100% { transform: scale(1.2) rotate(0deg); }
            }

            .finished-player {
                animation: winnerCelebration 2s ease-in-out !important;
                z-index: 100;
                filter: drop-shadow(0 0 10px gold);
            }
        `;
        document.head.appendChild(style);
    }

    // Helper function to format play duration
    formatPlayDuration(totalSeconds) {
        if (!totalSeconds || totalSeconds < 0) return '0:00';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Helper function to get current play duration for a player
    getCurrentPlayDuration(playerIndex) {
        if (!this.gameStartTime || !this.players[playerIndex]) return 0;

        // Ensure player stats exist
        if (!this.gameStats.playerStats[playerIndex]) {
            this.gameStats.playerStats[playerIndex] = {
                moves: 0,
                snakeHits: 0,
                ladderClimbs: 0,
                totalSteps: 0,
                position: 1,
                playDuration: 0
            };
        }

        const player = this.players[playerIndex];
        const stats = this.gameStats.playerStats[playerIndex];

        // If player is finished, use their recorded finish time or calculated duration
        if (player.finished) {
            if (stats.playDuration && stats.playDuration > 0) {
                return stats.playDuration;
            } else if (player.finishTime) {
                return Math.floor((player.finishTime - this.gameStartTime) / 1000);
            } else {
                // Fallback: calculate from current time
                return Math.floor((new Date() - this.gameStartTime) / 1000);
            }
        }

        // For active players, calculate duration from game start to now
        return Math.floor((new Date() - this.gameStartTime) / 1000);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SnakeAndLadderGame();
});