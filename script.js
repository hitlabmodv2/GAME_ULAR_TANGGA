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
        this.pvbBotCount = 1; // Pemain vs Bot max 3
        this.bvbBotCount = 2; // Bot vs Bot max 4
        this.animationSpeed = 'medium';
        this.gameSpeed = 'medium'; // New game speed control
        this.soundEnabled = true;
        this.volume = 0.7;
        this.gameStartTime = null;
        this.isPaused = false;
        this.mapDesign = 'random'; // Map design selection

        // Stats spoiler click handler
        this.statsClickHandler = null;

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
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Theme selector buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTheme(e.target.dataset.theme));
        });

        // Difficulty selector
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Bot count selectors
        document.getElementById('pvbBotCountSelect').addEventListener('change', (e) => {
            this.pvbBotCount = parseInt(e.target.value);
            this.updateModeSettingsPreview();
        });

        document.getElementById('bvbBotCountSelect').addEventListener('change', (e) => {
            this.bvbBotCount = parseInt(e.target.value);
            this.updateModeSettingsPreview();
        });

        // Settings buttons
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('defaultSettings').addEventListener('click', () => this.resetToDefault());

        // Animation speed selector
        document.getElementById('animationSpeedSelect').addEventListener('change', (e) => {
            this.animationSpeed = e.target.value;
        });

        // Game speed selector
        document.getElementById('gameSpeedSelect').addEventListener('change', (e) => {
            this.gameSpeed = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Map design selector
        document.getElementById('mapDesignSelect').addEventListener('change', (e) => {
            this.mapDesign = e.target.value;
            this.updateModeSettingsPreview();
        });

        // Sound controls
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.toggleSound();
            this.updateModeSettingsPreview();
        });
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            document.getElementById('volumeValue').textContent = e.target.value + '%';
            this.updateModeSettingsPreview();
        });

        // Mode modal controls
        document.getElementById('openModeModal').addEventListener('click', () => this.openModeModal());
        document.getElementById('closeModeModal').addEventListener('click', () => this.closeModeModal());
        document.getElementById('showSettings').addEventListener('click', () => this.showSettings());

        // Developer modal controls
        document.getElementById('openDeveloperModal').addEventListener('click', () => this.openDeveloperModal());
        document.getElementById('closeDeveloperModal').addEventListener('click', () => this.closeDeveloperModal());

        // Mode selection
        document.getElementById('playerVsBot').addEventListener('click', () => {
            this.closeModeModal();
            this.startGame('pvb');
        });
        document.getElementById('botVsBot').addEventListener('click', () => {
            this.closeModeModal();
            this.startGame('bvb');
        });

        // Game controls
        document.getElementById('rollDice').addEventListener('click', () => this.rollDice());
        document.getElementById('autoPlay').addEventListener('click', () => this.toggleAutoPlay());
        document.getElementById('pauseGame').addEventListener('click', () => this.togglePause());
        document.getElementById('resetGame').addEventListener('click', () => this.resetGame());
        document.getElementById('backToMenu').addEventListener('click', () => this.backToMenu());
        document.getElementById('downloadLog').addEventListener('click', () => this.downloadLog());
        document.getElementById('clearLog').addEventListener('click', () => this.clearLog());

        // Modal controls
        document.getElementById('playAgain').addEventListener('click', () => this.resetGame());
        document.getElementById('backToMenuFromModal').addEventListener('click', () => this.backToMenu());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('snakeGameTheme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';

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
            animationSpeed: this.animationSpeed,
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
    }

    resetToDefault() {
        // Reset to default values
        this.difficulty = 'medium';
        this.pvbBotCount = 1;
        this.bvbBotCount = 2;
        this.animationSpeed = 'medium';
        this.gameSpeed = 'medium';
        this.soundEnabled = true;
        this.volume = 0.7;
        this.mapDesign = 'random';

        // Update UI elements
        document.getElementById('difficultySelect').value = 'medium';
        document.getElementById('pvbBotCountSelect').value = '1';
        document.getElementById('bvbBotCountSelect').value = '2';
        document.getElementById('animationSpeedSelect').value = 'medium';
        document.getElementById('gameSpeedSelect').value = 'medium';
        document.getElementById('mapDesignSelect').value = 'random';
        document.getElementById('volumeSlider').value = '70';
        document.getElementById('volumeValue').textContent = '70%';

        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = '🔊 Nyalakan';
        soundBtn.classList.add('active');

        // Clear saved settings
        localStorage.removeItem('snakeGameSettings');

        this.showNotification('🔄 Pengaturan dikembalikan ke default!', 'info');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('snakeGameSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            this.difficulty = settings.difficulty || 'medium';
            this.pvbBotCount = settings.pvbBotCount || 1;
            this.bvbBotCount = settings.bvbBotCount || 2;
            this.animationSpeed = settings.animationSpeed || 'medium';
            this.gameSpeed = settings.gameSpeed || 'medium';
            this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
            this.volume = settings.volume || 0.7;
            this.mapDesign = settings.mapDesign || 'random';

            // Update UI
            document.getElementById('difficultySelect').value = this.difficulty;
            document.getElementById('pvbBotCountSelect').value = this.pvbBotCount.toString();
            document.getElementById('bvbBotCountSelect').value = this.bvbBotCount.toString();
            document.getElementById('animationSpeedSelect').value = this.animationSpeed;
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
                position: 1
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

        // Show auto play button for bot vs bot
        const autoPlayBtn = document.getElementById('autoPlay');
        if (mode === 'bvb') {
            autoPlayBtn.style.display = 'inline-block';
        } else {
            autoPlayBtn.style.display = 'none';
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

        // Auto start only for player vs bot when it's bot's turn
        if (mode === 'pvb' && this.getCurrentPlayer().isBot) {
            setTimeout(() => this.rollDice(), 1500);
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

                // Check for special positions with enhanced visibility
                if (this.snakes[cellNumber]) {
                    cell.classList.add('snake-head');
                    cell.setAttribute('data-special', 'snake-head');
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-icon">🐍</div>
                        <div class="cell-info">${cellNumber}-${this.snakes[cellNumber]}</div>
                    `;
                    cell.title = `ULAR: ${cellNumber} turun ke ${this.snakes[cellNumber]}`;
                } else if (this.ladders[cellNumber]) {
                    cell.classList.add('ladder-bottom');
                    cell.setAttribute('data-special', 'ladder-bottom');
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-icon">🪜</div>
                        <div class="cell-info">${cellNumber}-${this.ladders[cellNumber]}</div>
                    `;
                    cell.title = `TANGGA: ${cellNumber} naik ke ${this.ladders[cellNumber]}`;
                } else if (Object.values(this.snakes).includes(cellNumber)) {
                    cell.classList.add('snake-tail');
                    cell.setAttribute('data-special', 'snake-tail');
                    // Find which snake this tail belongs to
                    const snakeHead = Object.keys(this.snakes).find(head => this.snakes[head] == cellNumber);
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-icon">🐍</div>
                        <div class="cell-info">${snakeHead}-${cellNumber}</div>
                    `;
                    cell.title = `EKOR ULAR: Dari ${snakeHead} turun ke ${cellNumber}`;
                } else if (Object.values(this.ladders).includes(cellNumber)) {
                    cell.classList.add('ladder-top');
                    cell.setAttribute('data-special', 'ladder-top');
                    // Find which ladder this top belongs to
                    const ladderBottom = Object.keys(this.ladders).find(bottom => this.ladders[bottom] == cellNumber);
                    cell.innerHTML = `
                        <div class="cell-number">${cellNumber}</div>
                        <div class="cell-icon">🪜</div>
                        <div class="cell-info">${ladderBottom}-${cellNumber}</div>
                    `;
                    cell.title = `ATAS TANGGA: Dari ${ladderBottom} naik ke ${cellNumber}`;
                } else {
                    // Check if it's a snake body segment
                    let isSnakeBody = false;
                    Object.values(this.longSnakes).forEach(snake => {
                        if (snake.segments && snake.segments.includes(cellNumber)) {
                            cell.classList.add('snake-body');
                            cell.setAttribute('data-special', 'snake-body');
                            cell.innerHTML = `
                                <div class="cell-number">${cellNumber}</div>
                                <div class="cell-icon">🐍</div>
                                <div class="cell-info">BADAN</div>
                            `;
                            cell.title = `BADAN ULAR`;
                            isSnakeBody = true;
                        }
                    });

                    if (!isSnakeBody) {
                        cell.innerHTML = `<div class="cell-number">${cellNumber}</div>`;
                        cell.title = `Kotak ${cellNumber}`;
                    }
                }

                board.appendChild(cell);
            }
        }

        this.updatePlayerPositions();
    }

    rollDice() {
        if (!this.isGameActive || this.isPaused || this.isRolling) return;

        // Check if current player is finished, skip to next active player
        if (this.getCurrentPlayer().finished) {
            this.switchToNextActivePlayer();
            return;
        }

        this.isRolling = true;
        const rollBtn = document.getElementById('rollDice');
        rollBtn.disabled = true;

        const dice = document.getElementById('dice');
        const diceResult = document.getElementById('diceResult');

        // Reset animations
        dice.classList.remove('rolling', 'shake');
        diceResult.style.opacity = '0';

        // Start simple shake animation
        dice.classList.add('shake');

        // Play dice sound
        this.playDiceSound();

        const diceValue = Math.floor(Math.random() * 6) + 1;
        const diceFace = document.querySelector('.dice-face');

        // Simple animation - just change face 3 times
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const randomFace = Math.floor(Math.random() * 6) + 1;
            diceFace.textContent = this.getDiceFace(randomFace);
            rollCount++;

            if (rollCount >= 3) {
                clearInterval(rollInterval);
                diceFace.textContent = this.getDiceFace(diceValue);
            }
        }, 200);

        const animationDuration = 600; // Fixed duration for performance

        setTimeout(() => {
            dice.classList.remove('shake');
            dice.classList.add('bounce');

            // Show result with enhanced animation
            diceResult.textContent = diceValue;
            diceResult.style.animation = 'diceResultPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';

            setTimeout(() => {
                dice.classList.remove('bounce');
                this.movePlayer(diceValue);
                this.isRolling = false;
                rollBtn.disabled = false;
            }, 300);
        }, animationDuration);
    }

    getDiceFace(value) {
        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return faces[value - 1];
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

        // Play move sound and animate
        this.playMoveSound();
        await this.animatePlayerMovement(this.currentPlayer, oldPosition, newPosition);

        // Check for snakes and ladders
        if (this.snakes[newPosition]) {
            const snakeEnd = this.snakes[newPosition];
            currentPlayer.position = snakeEnd;

            // Update snake statistics
            this.gameStats.snakeHits++;
            this.gameStats.playerStats[this.currentPlayer].snakeHits++;
            this.gameStats.playerStats[this.currentPlayer].position = snakeEnd;

            this.addToLog(`🐍 <strong>Oh tidak!</strong> ${currentPlayer.emoji} ${currentPlayer.name} terkena ular ${newPosition}→${snakeEnd} dan turun ke posisi <span class="position-log">${snakeEnd}</span>`, this.currentPlayer);

            // Play snake sound and animate slide down
            this.playSnakeSound();
            await this.animateSnakeSlide(this.currentPlayer, newPosition, snakeEnd);

        } else if (this.ladders[newPosition]) {
            const ladderEnd = this.ladders[newPosition];
            currentPlayer.position = ladderEnd;

            // Update ladder statistics
            this.gameStats.ladderClimbs++;
            this.gameStats.playerStats[this.currentPlayer].ladderClimbs++;
            this.gameStats.playerStats[this.currentPlayer].position = ladderEnd;

            this.addToLog(`🪜 <strong>Beruntung!</strong> ${currentPlayer.emoji} ${currentPlayer.name} naik tangga ${newPosition}→${ladderEnd} ke posisi <span class="position-log">${ladderEnd}</span>`, this.currentPlayer);

            // Play ladder sound and animate climb up
            this.playLadderSound();
            await this.animateLadderClimb(this.currentPlayer, newPosition, ladderEnd);
        }

        this.updatePlayerPositions();
        this.updateUI();
        this.updateStatistics();

        // Check for winner
        if (currentPlayer.position === 100) {
            this.handlePlayerFinish(this.currentPlayer);
            return;
        }

        // Switch players
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.updateUI();

        // Auto play for bot with speed control
        if (this.isGameActive && !this.isPaused) {
            const gameSpeedDelays = { fast: 1000, medium: 2500, slow: 5000 };
            const delay = gameSpeedDelays[this.gameSpeed];

            if (this.gameMode === 'bvb' && this.autoPlayInterval) {
                setTimeout(() => this.rollDice(), delay);
            } else if (this.gameMode === 'pvb' && this.getCurrentPlayer().isBot) {
                setTimeout(() => this.rollDice(), delay);
            }
        }
    }

    async animatePlayerMovement(playerIndex, from, to) {
        return new Promise(resolve => {
            const piece = document.querySelector(`.player-piece.player${playerIndex + 1}-piece`);
            if (piece) {
                piece.classList.add('moving');
                setTimeout(() => {
                    piece.classList.remove('moving');
                    resolve();
                }, 800);
            } else {
                resolve();
            }
        });
    }

    async animateSnakeSlide(playerIndex, from, to) {
        return new Promise(resolve => {
            // Highlight snake path
            if (this.longSnakes[from]) {
                const segments = [from, ...this.longSnakes[from].segments, to];
                this.highlightPath(segments, 'snake');
            }

            setTimeout(() => {
                this.clearHighlights();
                resolve();
            }, 1500);
        });
    }

    async animateLadderClimb(playerIndex, from, to) {
        return new Promise(resolve => {
            // Highlight ladder path
            const ladderCells = [from, to];
            this.highlightPath(ladderCells, 'ladder');

            setTimeout(() => {
                this.clearHighlights();
                resolve();
            }, 1200);
        });
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

        // Update roll button
        const rollBtn = document.getElementById('rollDice');
        if (this.gameMode === 'pvb') {
            if (this.getCurrentPlayer().isBot) {
                rollBtn.style.display = 'none';
            } else {
                rollBtn.style.display = 'inline-block';
                rollBtn.textContent = '🎲 Lempar Dadu';
                rollBtn.disabled = this.isPaused;
            }
        } else {
            rollBtn.textContent = '🎲 Lempar Dadu';
            rollBtn.disabled = this.isPaused;
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
            const gameSpeedDelays = { fast: 1000, medium: 2500, slow: 5000 };
            const interval = gameSpeedDelays[this.gameSpeed];

            this.autoPlayInterval = setInterval(() => {
                if (this.isGameActive && !this.isPaused) {
                    this.rollDice();
                } else if (!this.isGameActive) {
                    this.toggleAutoPlay();
                }
            }, interval);
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
        logText += `📅 Created: ${new Date().getFullYear()}\n`;
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

        // Create player ranking based on position and finish status
        const playerRanking = this.players
            .map((p, i) => ({
                ...p,
                index: i,
                stats: this.gameStats.playerStats[i],
                actualRank: p.finishRank || (p.finished ? 1 : 0)
            }))
            .sort((a, b) => {
                // Finished players first, then by finish rank
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                if (a.finished && b.finished) return a.finishRank - b.finishRank;
                // For unfinished players, sort by position
                return b.position - a.position;
            });

        let statsHTML = `
            <div class="stats-header">
                📊 Statistik Permainan Live
            </div>
            <div class="stats-content">
                <div class="stats-overview">
                    <div class="stat-item">⏱️ Waktu: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="stat-item">🎲 Total Lemparan: ${this.gameStats.totalMoves}</div>
                    <div class="stat-item">🐍 Total Kena Ular: ${this.gameStats.snakeHits}</div>
                    <div class="stat-item">🪜 Total Naik Tangga: ${this.gameStats.ladderClimbs}</div>
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
        if (!player.finished) {
            player.finished = true;
            player.finishRank = this.getFinishedPlayersCount() + 1;

            // Special animation for finishing player
            this.playWinSound();
            const piece = document.querySelector(`.player-piece.player${playerIndex + 1}-piece`);
            if (piece) {
                piece.style.animation = 'winnerCelebration 2s ease-in-out';
                piece.classList.add('finished-player');
            }

            this.addToLog(`🏆 ${player.emoji} <strong>${player.name}</strong> menyelesaikan permainan di peringkat ke-${player.finishRank}!`, playerIndex);

            // Check if all players finished or only one player left
            const activePlayersCount = this.players.filter(p => !p.finished).length;

            if (activePlayersCount === 0) {
                // All players finished
                setTimeout(() => this.endGame(), 2000);
                return;
            } else if (activePlayersCount === 1) {
                // Only one player left - they get last place and game ends
                const lastPlayer = this.players.find(p => !p.finished);
                if (lastPlayer) {
                    lastPlayer.finished = true;
                    lastPlayer.finishRank = this.getFinishedPlayersCount() + 1;
                    this.addToLog(`🥉 ${lastPlayer.emoji} ${lastPlayer.name} mendapat peringkat terakhir ke-${lastPlayer.finishRank}`);
                }
                setTimeout(() => this.endGame(), 2000);
                return;
            }
        }

        // Continue game with remaining active players
        this.switchToNextActivePlayer();
    }

    getFinishedPlayersCount() {
        return this.players.filter(p => p.finished).length;
    }

    switchToNextActivePlayer() {
        let attempts = 0;
        let originalPlayer = this.currentPlayer;

        // Find next active (unfinished) player
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
            attempts++;
        } while (this.players[this.currentPlayer].finished && attempts < this.players.length);

        // If we couldn't find any active players, end the game
        if (this.players[this.currentPlayer].finished) {
            this.addToLog('🎯 Semua pemain telah selesai!');
            setTimeout(() => this.endGame(), 1000);
            return;
        }

        this.updateUI();

        // Continue auto play if needed
        if (this.isGameActive && !this.isPaused && !this.players[this.currentPlayer].finished) {
            const gameSpeedDelays = { fast: 1000, medium: 2500, slow: 5000 };
            const delay = gameSpeedDelays[this.gameSpeed];

            if (this.gameMode === 'bvb' && this.autoPlayInterval) {
                setTimeout(() => this.rollDice(), delay);
            } else if (this.gameMode === 'pvb' && this.getCurrentPlayer().isBot) {
                setTimeout(() => this.rollDice(), delay);
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

        // Create final ranking based on position and finish order
        const finalRanking = this.players
            .map((p, i) => ({
                ...p,
                index: i,
                stats: this.gameStats.playerStats[i],
                actualRank: p.finishRank || (p.position === 100 ? 1 : this.players.length + 1)
            }))
            .sort((a, b) => {
                // First sort by finish status (finished players first)
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                // Then by finish rank for finished players
                if (a.finished && b.finished) return a.finishRank - b.finishRank;
                // Then by position for unfinished players
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

        // Show winner modal with detailed stats
        const averageSteps = winnerStats.moves > 0 ? Math.round(winnerStats.totalSteps / winnerStats.moves) : 0;
        const efficiency = winnerStats.moves > 0 ? Math.round((99 / winnerStats.totalSteps) * 100) : 0;

        document.getElementById('winnerText').innerHTML = `
            <div class="winner-stats">
                <h3>🎉 ${winner.name} Menang!</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div class="stat-label">Waktu Bermain</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">🎲 ${winnerStats.moves}</div>
                        <div class="stat-label">Total Lemparan</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">🚶 ${winnerStats.totalSteps}</div>
                        <div class="stat-label">Total Langkah</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">📊 ${averageSteps}</div>
                        <div class="stat-label">Rata-rata/Lemparan</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">🐍 ${winnerStats.snakeHits}</div>
                        <div class="stat-label">Kena Ular</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">🪜 ${winnerStats.ladderClimbs}</div>
                        <div class="stat-label">Naik Tangga</div>
                    </div>
                </div>
                <div class="performance-rating">
                    ${this.getPerformanceRating(winnerStats)}
                </div>
            </div>
        `;
        document.getElementById('winnerModal').style.display = 'flex';
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
        // Reset player positions
        this.players.forEach(player => {
            player.position = 1;
            player.finished = false;
            delete player.finishRank;
        });
        this.currentPlayer = Math.floor(Math.random() * this.players.length);
        this.isGameActive = true;
        this.isPaused = false;

        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            document.getElementById('autoPlay').textContent = '▶️ Auto Play';
        }

        // Reset pause button
        const pauseBtn = document.getElementById('pauseGame');
        pauseBtn.textContent = '⏸️ Jeda';
        pauseBtn.style.background = 'var(--accent-warning)';

        // Hide modal
        document.getElementById('winnerModal').style.display = 'none';

        // Reset dice
        document.getElementById('diceResult').textContent = '-';
        document.querySelector('.dice-face').textContent = '🎲';

        // Generate new random positions
        this.generateRandomPositions();

        // Clear and recreate board
        this.createBoard();
        this.updateUI();

        // Play start sound
        this.playStartSound();

        // Clear log and add start message
        document.getElementById('logContent').innerHTML = '';
        this.addToLog(`🔄 Game direset! Mode: ${this.gameMode === 'pvb' ? 'Pemain vs Bot' : 'Bot vs Bot'}`);
        this.addToLog(`⚙️ Tingkat kesulitan: ${this.getDifficultyName()}`);
        this.addToLog(`🐍 Ular: ${Object.keys(this.snakes).length} | 🪜 Tangga: ${Object.keys(this.ladders).length}`);
        this.addToLog(`🎲 ${this.getCurrentPlayer().name} bermain duluan!`);

        // Auto start only for player vs bot when it's bot's turn
        if (this.gameMode === 'pvb' && this.getCurrentPlayer().isBot) {
            setTimeout(() => this.rollDice(), 1500);
        }
    }

    backToMenu() {
        // Reset everything
        this.isGameActive = false;
        this.gameMode = null;
        this.players = [];
        this.currentPlayer = 0;
        this.isPaused = false;

        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }

        // Hide game area and modal, show setup
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('winnerModal').style.display = 'none';
        document.getElementById('gameSetup').style.display = 'block';

        // Reset dice
        document.getElementById('diceResult').textContent = '-';
        document.querySelector('.dice-face').textContent = '🎲';
        document.getElementById('logContent').innerHTML = '';
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

    getGameSpeedName() {
        const speeds = {
            fast: '🚀 Cepat (1 detik)',
            medium: '⏱️ Sedang (2 detik)',
            slow: '🐌 Lambat (4 detik)'
        };
        return speeds[this.gameSpeed] || 'Sedang';
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

    openDeveloperModal() {
        document.getElementById('developerModal').style.display = 'flex';
        this.playSound(523, 0.2, 'triangle');
    }

    closeDeveloperModal() {
        document.getElementById('developerModal').style.display = 'none';
        this.playSound(392, 0.2, 'triangle');
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
        `;
        document.head.appendChild(style);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SnakeAndLadderGame();
});