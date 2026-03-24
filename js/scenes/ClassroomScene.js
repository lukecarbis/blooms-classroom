window.BloomGame = window.BloomGame || {};

BloomGame.ClassroomScene = class ClassroomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Classroom' });
    }

    init(data) {
        this.levelIndex = data.level || 0;
        this.levelConfig = BloomGame.LevelConfig[this.levelIndex];
        // Reset powerup state to prevent carryover on retry
        this.acActive = false;
        this.acTimer = 0;
        this.coffeeBoosted = false;
        this.coffeeTimer = 0;
        this.ictActive = false;
    }

    create() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const C = BloomGame.COLORS;
        const cfg = this.levelConfig;

        this.cameras.main.setBackgroundColor(C.BACKGROUND);
        this.cameras.main.fadeIn(500);

        this.gameTime = cfg.duration;
        this.gameRunning = true;
        this.averageAttention = 100;
        this.synthesisCount = 0;
        this.presentCount = 0;
        this.students = [];
        this.stations = [];
        this.links = [];
        this.projectStudents = [];
        this.presenterActive = null;
        this.presenterColumn = null;
        this.columnGlowGraphics = [];
        this.deskPositions = [];
        this.jigsawGroups = []; // { students: [], hostX, hostY, timer }

        // Draw classroom
        this.drawClassroom();

        // Create desks and students
        this.createStudents();

        // Create special elements
        if (cfg.hasStations) this.createStations();
        if (cfg.hasLinks) this.createLinks();
        if (cfg.hasProjectBoard) this.createProjectBoard();
        if (cfg.hasPodium) this.createPodium();

        // Create teacher (starts at front of room near whiteboard)
        this.teacher = new BloomGame.Teacher(this, W / 2, 100);
        this.teacher.body.setCollideWorldBounds(true);
        this.physics.world.setBounds(50, 60, W - 100, H - 100);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

        // HUD
        this.createHUD();

        // Question timer
        if (cfg.hasQuestions) {
            this.questionTimer = this.time.addEvent({
                delay: cfg.questionInterval,
                callback: () => this.spawnQuestion(),
                loop: true,
            });
        }

        // Coffee mug power-ups
        this.coffeeMugs = [];
        this.coffeeBoosted = false;
        this.coffeeTimer = 0;
        this.coffeeMaxDuration = 12000;
        this.coffeeSpawnCount = 0;
        const powerupCount = cfg.powerupFrequency || 2;
        this.coffeeMaxSpawns = powerupCount;
        // Schedule spawns at random times during the lesson
        for (let i = 0; i < this.coffeeMaxSpawns; i++) {
            const delay = (Math.random() * 0.7 + 0.1) * cfg.duration * 1000;
            this.time.delayedCall(delay, () => this.spawnCoffeeMug());
        }

        // Air conditioner
        this.acActive = false;
        this.acTimer = 0;
        this.acMaxDuration = 30000; // 30 seconds

        // ICT power-up
        this.ictPickups = [];
        this.ictActive = false; // whiteboard flashing
        this.ictTimer = 0;
        this.ictMaxDuration = 3000;
        // Schedule ICT spawns at random times during the lesson
        const ictCount = Math.max(1, Math.floor(powerupCount / 2));
        for (let i = 0; i < ictCount; i++) {
            const ictDelay = (Math.random() * 0.5 + 0.2) * cfg.duration * 1000;
            this.time.delayedCall(ictDelay, () => this.spawnICT());
        }

        // Start announcement
        this.showAnnouncement(`Level ${cfg.level}: ${cfg.title}`, cfg.bloomLabel, 2000);
    }

    drawClassroom() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const C = BloomGame.COLORS;
        const bg = this.add.graphics();

        // Floor
        bg.fillStyle(C.FLOOR);
        bg.fillRect(50, 60, W - 100, H - 100);

        // Floor tiles pattern
        bg.lineStyle(1, 0xDDD5C5, 0.3);
        for (let x = 50; x < W - 50; x += 32) {
            bg.lineBetween(x, 60, x, H - 40);
        }
        for (let y = 60; y < H - 40; y += 32) {
            bg.lineBetween(50, y, W - 50, y);
        }

        // Walls
        bg.fillStyle(C.WALL);
        bg.fillRect(46, 56, W - 92, 8);
        bg.fillRect(46, 56, 8, H - 92);
        bg.fillRect(W - 54, 56, 8, H - 92);

        // Whiteboard
        bg.fillStyle(C.WHITEBOARD_BORDER);
        bg.fillRoundedRect(W / 2 - 120, 60, 240, 6, 2);
        bg.fillStyle(C.WHITEBOARD);
        bg.fillRoundedRect(W / 2 - 116, 62, 232, 30, 4);

        // Whiteboard text
        this.whiteboardText = this.add.text(W / 2, 78, this.levelConfig.bloomLabel, {
            fontSize: '14px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#264653',
        }).setOrigin(0.5).setDepth(1);

        bg.setDepth(0);

        // Air conditioner unit at front-right of room (mounted on front wall)
        this.acX = W / 2 + 200;
        this.acY = 68;
        const acGfx = this.add.graphics().setDepth(2);
        // AC body - wall-mounted unit
        acGfx.fillStyle(0xDDDDDD);
        acGfx.fillRoundedRect(this.acX - 22, this.acY - 6, 44, 14, 3);
        // Vent slats
        acGfx.lineStyle(1, 0xBBBBBB, 0.8);
        for (let i = 0; i < 5; i++) {
            acGfx.lineBetween(this.acX - 16 + i * 8, this.acY + 2, this.acX - 16 + i * 8, this.acY + 6);
        }
        // Status light (drawn separately so we can update it)
        this.acLight = this.add.graphics().setDepth(3);
        this.drawACLight();

        // Air particles container (for blowing animation)
        this.acAirParticles = [];
    }

    createStudents() {
        const cfg = this.levelConfig;
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const CL = BloomGame.DIMENSIONS.CLASSROOM;

        // Calculate desk grid positions
        const marginX = 120;
        const marginTop = 140;
        const availableHeight = H - marginTop - 120; // Leave room for teacher at bottom
        const spacingX = (W - 2 * marginX) / Math.max(cfg.cols - 1, 1);
        const spacingY = Math.min(90, availableHeight / Math.max(cfg.rows - 1, 1));

        // Build type array
        const types = [];
        for (const [type, count] of Object.entries(cfg.studentTypes)) {
            for (let i = 0; i < count; i++) types.push(type);
        }
        // Shuffle
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }

        let idx = 0;
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                if (idx >= cfg.studentCount) break;

                const x = marginX + c * spacingX;
                const y = marginTop + r * spacingY;

                // Desk sprite
                const desk = this.add.image(x, y + 12, 'desk').setDepth(2);
                this.deskPositions.push({ x, y: y + 12 });

                // Student
                const student = new BloomGame.Student(this, x, y - 4, {
                    type: types[idx] || 'normal',
                    color: BloomGame.STUDENT_COLORS[idx % BloomGame.STUDENT_COLORS.length],
                    decayRate: cfg.decayRate,
                    index: idx,
                    zoneAffinity: idx % 3,
                });

                this.students.push(student);
                idx++;
            }
        }
    }

    createStations() {
        const cfg = this.levelConfig;
        const W = BloomGame.DIMENSIONS.WIDTH;
        const count = cfg.stationCount || 3;

        for (let i = 0; i < count; i++) {
            const x = 100 + i * ((W - 200) / (count - 1 || 1));
            const y = BloomGame.DIMENSIONS.HEIGHT - 100;

            // Draw activity table (bigger than a desk)
            const tableGfx = this.add.graphics().setDepth(1);
            tableGfx.fillStyle(0xC4A882);
            tableGfx.fillRoundedRect(x - 30, y - 12, 60, 28, 5);
            tableGfx.lineStyle(1, 0xA0785A, 0.6);
            tableGfx.strokeRoundedRect(x - 30, y - 12, 60, 28, 5);
            // Table top highlight
            tableGfx.fillStyle(0xD4B892, 0.5);
            tableGfx.fillRoundedRect(x - 26, y - 8, 52, 10, 3);

            const label = this.add.text(x, y + 4, 'ACTIVITY', {
                fontSize: '7px',
                fontFamily: '"Press Start 2P", monospace',
                color: '#8B7355',
            }).setOrigin(0.5).setDepth(2);

            this.stations.push({ x, y, sprite: tableGfx, label, occupied: false });
        }
    }

    createLinks() {
        const cfg = this.levelConfig;
        const count = Math.min(cfg.linkCount || 3, Math.floor(this.students.length / 2));
        const available = [...this.students];

        // Shuffle available
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }

        this.linkGraphics = this.add.graphics().setDepth(3);

        for (let i = 0; i < count * 2; i += 2) {
            if (i + 1 >= available.length) break;
            const a = available[i];
            const b = available[i + 1];
            a.linkedTo = b;
            b.linkedTo = a;
            a.linkPositive = false;
            b.linkPositive = false;
            this.links.push({ a, b, positive: false });
        }
    }

    createProjectBoard() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const cfg = this.levelConfig;

        this.projectBoard = this.add.graphics().setDepth(2);
        this.projectBoardX = W / 2;
        this.projectBoardY = 108;

        const g = this.projectBoard;
        g.fillStyle(0xE8E0D0, 0.8);
        g.fillRoundedRect(W / 2 - 140, 96, 280, 40, 6);
        g.lineStyle(2, BloomGame.COLORS.ACCENT, 0.6);
        g.strokeRoundedRect(W / 2 - 140, 96, 280, 40, 6);

        if (cfg.hasColorZones) {
            const zoneColors = [BloomGame.COLORS.PROJECT_ZONE_1, BloomGame.COLORS.PROJECT_ZONE_2, BloomGame.COLORS.PROJECT_ZONE_3];
            for (let i = 0; i < 3; i++) {
                g.fillStyle(zoneColors[i], 0.3);
                g.fillRoundedRect(W / 2 - 130 + i * 90, 100, 80, 32, 4);
            }
        }

        this.add.text(W / 2, 116, 'PROJECT BOARD', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#264653',
        }).setOrigin(0.5).setDepth(3);

        this.synthesisProgress = this.add.graphics().setDepth(3);
        this.updateSynthesisDisplay();
    }

    createPodium() {
        const W = BloomGame.DIMENSIONS.WIDTH;

        this.podiumX = W - 120;
        this.podiumY = 110;

        const g = this.add.graphics().setDepth(2);
        g.fillStyle(0x8B7355);
        g.fillRoundedRect(this.podiumX - 20, this.podiumY - 10, 40, 30, 4);
        g.fillStyle(BloomGame.COLORS.DESK_TOP);
        g.fillRoundedRect(this.podiumX - 18, this.podiumY - 8, 36, 14, 3);

        this.add.text(this.podiumX, this.podiumY + 26, 'PODIUM', {
            fontSize: '9px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#8B7355',
        }).setOrigin(0.5).setDepth(3);
    }

    createHUD() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const C = BloomGame.COLORS;
        const cfg = this.levelConfig;

        // Top bar background
        const topBar = this.add.graphics().setDepth(50);
        topBar.fillStyle(C.UI_DARK, 0.85);
        topBar.fillRect(0, 0, W, 52);

        // Level info
        this.add.text(12, 8, `Level ${cfg.level}`, {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setDepth(51);

        this.add.text(12, 30, cfg.bloomLabel, {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
        }).setDepth(51);

        // Timer
        this.timerText = this.add.text(W / 2, 16, '', {
            fontSize: '22px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(51);

        // Average attention
        this.avgText = this.add.text(W / 2, 38, '', {
            fontSize: '13px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#F5F0E8',
        }).setOrigin(0.5).setDepth(51);

        // Threshold indicator
        this.add.text(W - 12, 8, `Goal: ${cfg.attentionThreshold}%`, {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
        }).setOrigin(1, 0).setDepth(51);

        // Technique bar
        this.techBar = this.add.graphics().setDepth(50);
        this.techCooldownBar = this.add.graphics().setDepth(51);
        this.techTexts = [];
        this.drawTechBar();

        // Synthesis / Present counters
        if (cfg.hasProjectBoard) {
            this.synthesisText = this.add.text(W - 12, 28, '', {
                fontSize: '11px', fontFamily: '"Press Start 2P", monospace', color: '#F5F0E8',
            }).setOrigin(1, 0).setDepth(51);
        }
        if (cfg.hasPodium) {
            this.presentText = this.add.text(W - 12, 40, '', {
                fontSize: '11px', fontFamily: '"Press Start 2P", monospace', color: '#F5F0E8',
            }).setOrigin(1, 0).setDepth(51);
        }

        // Powerup decay bar (shared between coffee and AC)
        const H = BloomGame.DIMENSIONS.HEIGHT;
        this.powerupDecayBar = this.add.graphics().setDepth(51);
        this.powerupDecayLabel = this.add.text(W / 2, H - 70, '', {
            fontSize: '8px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
        }).setOrigin(0.5).setDepth(51);
        this.powerupDecayLabel.setVisible(false);
    }

    drawTechBar() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const cfg = this.levelConfig;
        const techs = cfg.techniques;

        // Clear old texts
        this.techTexts.forEach(t => t.destroy());
        this.techTexts = [];

        const barY = H - 52;
        this.techBar.clear();
        this.techBar.fillStyle(BloomGame.COLORS.UI_DARK, 0.75);
        this.techBar.fillRect(0, barY - 4, W, 56);

        const startX = 12;
        const fontSize = techs.length > 4 ? '8px' : '9px';

        let curX = startX;
        techs.forEach((techId, i) => {
            const tech = BloomGame.Techniques[techId];
            if (!tech) return;

            const text = this.add.text(curX, barY + 4, `[${tech.key}] ${tech.name}`, {
                fontSize,
                fontFamily: '"Press Start 2P", monospace',
                color: '#F5F0E8',
            }).setDepth(51);

            this.techTexts.push(text);
            curX += text.width + 14;
        });

    }

    showAnnouncement(title, subtitle, duration) {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;

        const bg = this.add.graphics().setDepth(100).setAlpha(0);
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(W / 2 - 200, H / 2 - 50, 400, 100, 12);

        const t1 = this.add.text(W / 2, H / 2 - 15, title, {
            fontSize: '26px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(101).setAlpha(0);

        const t2 = this.add.text(W / 2, H / 2 + 18, subtitle, {
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
        }).setOrigin(0.5).setDepth(101).setAlpha(0);

        this.tweens.add({
            targets: [bg, t1, t2],
            alpha: 1,
            duration: 300,
        });

        this.time.delayedCall(duration, () => {
            this.tweens.add({
                targets: [bg, t1, t2],
                alpha: 0,
                duration: 500,
                onComplete: () => { bg.destroy(); t1.destroy(); t2.destroy(); },
            });
        });
    }

    // === AIR CONDITIONER ===

    drawACLight() {
        this.acLight.clear();
        const color = this.acActive ? 0x00FF00 : 0xFF0000;
        this.acLight.fillStyle(color);
        this.acLight.fillCircle(this.acX + 18, this.acY - 2, 2);
        if (this.acActive) {
            this.acLight.fillStyle(color, 0.3);
            this.acLight.fillCircle(this.acX + 18, this.acY - 2, 4);
        }
    }

    toggleAC() {
        if (this.acActive) return;

        this.acActive = true;
        this.acTimer = this.acMaxDuration;
        this.drawACLight();
    }

    spawnAirParticle() {
        const x = this.acX - 16 + Math.random() * 32;
        const y = this.acY + 10;
        const particle = this.add.graphics().setDepth(1);
        particle.fillStyle(0xADD8E6, 0.3 + Math.random() * 0.2);
        const size = 2 + Math.random() * 3;
        particle.fillCircle(0, 0, size);
        particle.setPosition(x, y);

        this.tweens.add({
            targets: particle,
            y: y + 40 + Math.random() * 30,
            x: x + (Math.random() - 0.5) * 30,
            alpha: 0,
            duration: 1000 + Math.random() * 800,
            ease: 'Quad.easeOut',
            onComplete: () => particle.destroy(),
        });
    }

    updateAC(delta) {
        if (!this.acActive) return;
        this.acTimer -= delta;

        // Flash the green light
        if (Math.floor(this.acTimer / 500) % 2 === 0) {
            this.acLight.setAlpha(1);
        } else {
            this.acLight.setAlpha(0.5);
        }

        // Spawn air particles
        if (!this.acParticleTimer) this.acParticleTimer = 0;
        this.acParticleTimer -= delta;
        if (this.acParticleTimer <= 0) {
            this.spawnAirParticle();
            this.acParticleTimer = 80 + Math.random() * 120;
        }

        if (this.acTimer <= 0) {
            this.acActive = false;
            this.acLight.setAlpha(1);
            this.drawACLight();
            this.acParticleTimer = 0;
        }
    }

    // === POWERUP SPAWN HELPER ===

    getValidPowerupSpawnPoint() {
        if (this.deskPositions.length === 0) return null;

        // Pick a random desk and offset from it, avoiding overlap
        for (let attempt = 0; attempt < 10; attempt++) {
            const desk = this.deskPositions[Math.floor(Math.random() * this.deskPositions.length)];
            // Offset 30-50px in a random direction from the desk
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 20;
            const x = desk.x + Math.cos(angle) * dist;
            const y = desk.y + Math.sin(angle) * dist;

            // Make sure we're not right on top of a student
            let tooClose = false;
            for (const student of this.students) {
                if (Phaser.Math.Distance.Between(x, y, student.seatX, student.seatY) < 20) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) return { x, y };
        }

        // Fallback: offset from a random desk
        const desk = this.deskPositions[Math.floor(Math.random() * this.deskPositions.length)];
        return { x: desk.x + 35, y: desk.y + 25 };
    }

    // === COFFEE MUG POWER-UP ===

    spawnCoffeeMug() {
        if (!this.gameRunning) return;
        // Don't spawn if a powerup is already active or a mug is already on the field
        if (this.coffeeBoosted || this.acActive || this.ictActive || this.coffeeMugs.length > 0 || this.ictPickups.length > 0) {
            // Retry in 3 seconds
            this.time.delayedCall(3000, () => this.spawnCoffeeMug());
            return;
        }

        const pos = this.getValidPowerupSpawnPoint();
        if (!pos) return;
        const { x, y } = pos;

        const mug = this.add.image(x, y, 'coffee_mug').setDepth(5);

        // Bobbing animation
        this.tweens.add({
            targets: mug,
            y: y - 4,
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut',
        });

        // Subtle glow
        const glow = this.add.graphics().setDepth(4);
        glow.fillStyle(0xE9C46A, 0.2);
        glow.fillCircle(x, y, 16);
        this.tweens.add({
            targets: glow,
            alpha: 0.1,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        const mugData = { sprite: mug, glow, x, y, lifetime: 10000 };
        this.coffeeMugs.push(mugData);
    }

    checkCoffeePickup() {
        const teacher = this.teacher;
        for (let i = this.coffeeMugs.length - 1; i >= 0; i--) {
            const mug = this.coffeeMugs[i];
            const dist = Phaser.Math.Distance.Between(teacher.x, teacher.y, mug.x, mug.y);
            if (dist < 30) {
                // Pick up!
                const px = mug.x, py = mug.y;
                mug.sprite.destroy();
                mug.glow.destroy();
                this.coffeeMugs.splice(i, 1);
                this.activateCoffeeBoost(px, py);
            }
        }
    }

    updateCoffeeMugLifetimes(delta) {
        for (let i = this.coffeeMugs.length - 1; i >= 0; i--) {
            const mug = this.coffeeMugs[i];
            mug.lifetime -= delta;
            // Fade out in last 3 seconds
            if (mug.lifetime < 3000) {
                const alpha = mug.lifetime / 3000;
                mug.sprite.setAlpha(alpha);
                mug.glow.setAlpha(alpha * 0.2);
            }
            if (mug.lifetime <= 0) {
                mug.sprite.destroy();
                mug.glow.destroy();
                this.coffeeMugs.splice(i, 1);
            }
        }
    }

    activateCoffeeBoost(pickupX, pickupY) {
        const teacher = this.teacher;
        teacher.speedMultiplier = 2.0;
        teacher.cooldownMultiplier = 2.0;
        this.coffeeBoosted = true;
        this.coffeeTimer = this.coffeeMaxDuration;

        // Minimal floating text just above the pickup spot
        const text = this.add.text(pickupX, pickupY - 20, 'Coffee Boost!', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: text,
            y: text.y - 25,
            alpha: 0,
            duration: 1200,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy(),
        });
    }

    updateCoffeeBoost(delta) {
        if (!this.coffeeBoosted) return;
        this.coffeeTimer -= delta;
        if (this.coffeeTimer <= 0) {
            this.teacher.speedMultiplier = 1;
            this.teacher.cooldownMultiplier = 1;
            this.coffeeBoosted = false;
        }
    }

    // === ICT POWER-UP ===

    spawnICT() {
        if (!this.gameRunning) return;
        if (this.coffeeBoosted || this.acActive || this.ictActive || this.coffeeMugs.length > 0 || this.ictPickups.length > 0) {
            // Retry in 3 seconds
            this.time.delayedCall(3000, () => this.spawnICT());
            return;
        }

        const pos = this.getValidPowerupSpawnPoint();
        if (!pos) return;
        const { x, y } = pos;

        const sprite = this.add.image(x, y, 'ict_computer').setDepth(5);

        this.tweens.add({
            targets: sprite,
            y: y - 4,
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut',
        });

        const glow = this.add.graphics().setDepth(4);
        glow.fillStyle(0x4488FF, 0.2);
        glow.fillCircle(x, y, 16);
        this.tweens.add({
            targets: glow,
            alpha: 0.1,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        this.ictPickups.push({ sprite, glow, x, y, lifetime: 5000 });
    }

    checkICTPickup() {
        const teacher = this.teacher;
        for (let i = this.ictPickups.length - 1; i >= 0; i--) {
            const ict = this.ictPickups[i];
            const dist = Phaser.Math.Distance.Between(teacher.x, teacher.y, ict.x, ict.y);
            if (dist < 30) {
                ict.sprite.destroy();
                ict.glow.destroy();
                this.ictPickups.splice(i, 1);

                // Immediately activate ICT
                this.activateICT();
            }
        }
    }

    updateICTPickupLifetimes(delta) {
        for (let i = this.ictPickups.length - 1; i >= 0; i--) {
            const ict = this.ictPickups[i];
            ict.lifetime -= delta;
            if (ict.lifetime < 2000) {
                const alpha = ict.lifetime / 2000;
                ict.sprite.setAlpha(alpha);
                ict.glow.setAlpha(alpha * 0.2);
            }
            if (ict.lifetime <= 0) {
                ict.sprite.destroy();
                ict.glow.destroy();
                this.ictPickups.splice(i, 1);
            }
        }
    }

    activateICT() {
        this.ictActive = true;
        this.ictTimer = this.ictMaxDuration;

        // Max all student attention once
        this.students.forEach(s => {
            s.attention = s.maxAttention;
        });

        // Hide whiteboard text, show flashing ICT text
        if (this.whiteboardText) this.whiteboardText.setVisible(false);

        const W = BloomGame.DIMENSIONS.WIDTH;
        this.ictFlashText = this.add.text(W / 2, 78, 'ICT!', {
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#FF0000',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(10);

        this.ictColorIndex = 0;
        this.ictColorTimer = 0;
    }

    updateICT(delta) {
        if (!this.ictActive) return;
        this.ictTimer -= delta;

        // Rainbow flash the ICT text
        if (this.ictFlashText) {
            const colors = ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF', '#FF00FF'];
            this.ictColorTimer -= delta;
            if (this.ictColorTimer <= 0) {
                this.ictColorIndex = (this.ictColorIndex + 1) % colors.length;
                this.ictFlashText.setColor(colors[this.ictColorIndex]);
                this.ictColorTimer = 150;
            }
        }

        if (this.ictTimer <= 0) {
            this.ictActive = false;
            if (this.ictFlashText) {
                this.ictFlashText.destroy();
                this.ictFlashText = null;
            }
            if (this.whiteboardText) this.whiteboardText.setVisible(true);
        }
    }

    // === INPUT HANDLING ===

    handleSpacePress() {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Air conditioner - toggle if near and not already on
        const acDist = Phaser.Math.Distance.Between(teacher.x, teacher.y, this.acX, this.acY);
        if (acDist < 50 && !this.acActive) {
            this.toggleAC();
            return;
        }

        // Check for supporting a presenter
        if (this.presenterActive) {
            const dist = Phaser.Math.Distance.Between(teacher.x, teacher.y, this.presenterActive.x, this.presenterActive.y);
            if (dist < 80) {
                this.presenterActive.boostAttention(8);
                this.showInteractionEffect(this.presenterActive.x, this.presenterActive.y, 0xE9C46A);
                return;
            }
        }

        // Praise: if near a student who has presented, give +60
        // But if they also have a question, Socratic Dialog takes priority
        if (cfg.techniques.includes('presentation')) {
            const praised = this.students.find(s => s.hasPresented && s.state === 'seated' &&
                Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < 60);
            if (praised && !praised.hasQuestion) {
                praised.boostAttention(60);
                praised.hasPresented = false; // can only praise once
                this.showInteractionEffect(praised.x, praised.y, 0x2A9D8F);
                return;
            }
        }

        // Single-target Recall Prompt (also affects jigsaw groups)
        if (cfg.techniques.includes('recall_prompt') && teacher.canUseTechnique('recall_prompt')) {
            const tech = BloomGame.Techniques.recall_prompt;

            // Socratic Dialog: if near a student with a question bubble, big boost + nearby boost
            if (cfg.hasQuestions) {
                const questioning = this.students.find(s => s.hasQuestion && Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < tech.range);
                if (questioning) {
                    questioning.hideQuestion();
                    questioning.boostAttention(100);
                    // Boost all surrounding seated students +10
                    this.getStudentsInRange(questioning.x, questioning.y, 250, 'seated').forEach(s => {
                        if (s !== questioning) {
                            s.boostAttention(10);
                            this.showInteractionEffect(s.x, s.y, 0x9B59B6);
                        }
                    });
                    this.showInteractionEffect(questioning.x, questioning.y, 0x9B59B6);
                    teacher.startCooldown('recall_prompt', tech.cooldown);
                    return;
                }
            }

            // Check if near any jigsaw group — boost all groups
            if (this.jigsawGroups.length > 0) {
                const nearGroup = this.jigsawGroups.some(g =>
                    Phaser.Math.Distance.Between(teacher.x, teacher.y, g.hostX, g.hostY) < tech.range
                );
                if (nearGroup) {
                    this.jigsawGroups.forEach(group => {
                        group.students.forEach(s => {
                            s.boostAttention(tech.attentionBoost);
                            this.showInteractionEffect(s.x, s.y, tech.color);
                        });
                    });
                    teacher.startCooldown('recall_prompt', tech.cooldown);
                    return;
                }
            }

            const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
            if (nearest) {
                nearest.boostAttention(tech.attentionBoost);
                this.showInteractionEffect(nearest.x, nearest.y, tech.color);
                teacher.startCooldown('recall_prompt', tech.cooldown);
                return;
            }
        }
    }

    handleTechniquePress(keyStr) {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Find which technique is bound to this key
        const techId = cfg.techniques.find(id => BloomGame.Techniques[id] && BloomGame.Techniques[id].key === keyStr);
        if (!techId) return;
        const tech = BloomGame.Techniques[techId];

        // Check cooldown
        if (!teacher.canUseTechnique(techId)) return;

        // Handle each technique type
        switch (techId) {
            case 'explain': {
                const nearby = this.getStudentsInRange(teacher.x, teacher.y, tech.range, 'seated');
                if (nearby.length > 0) {
                    // Show radius ring
                    const ring = this.add.graphics().setDepth(15);
                    ring.lineStyle(2, tech.color, 0.6);
                    ring.strokeCircle(0, 0, tech.range);
                    ring.setPosition(teacher.x, teacher.y);
                    this.tweens.add({
                        targets: ring,
                        alpha: 0,
                        duration: 600,
                        ease: 'Quad.easeOut',
                        onComplete: () => ring.destroy(),
                    });
                    nearby.forEach(s => {
                        s.boostAttention(tech.attentionBoost);
                        this.showInteractionEffect(s.x, s.y, tech.color);
                    });
                    teacher.startCooldown(techId, tech.cooldown);
                }
                break;
            }
            case 'guided_practice': {
                if (!cfg.hasStations) return;
                // Find an open station (max 1 student per table)
                const openStations = this.stations.filter(s => !s.occupied);
                if (openStations.length === 0) return;
                const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (nearest) {
                    // Find nearest open station
                    let bestStation = null;
                    let bestDist = Infinity;
                    openStations.forEach(s => {
                        const d = Phaser.Math.Distance.Between(nearest.x, nearest.y, s.x, s.y);
                        if (d < bestDist) { bestDist = d; bestStation = s; }
                    });
                    if (bestStation) {
                        bestStation.occupied = true;
                        nearest.assignedStation = bestStation;
                        nearest.moveToPosition(bestStation.x, bestStation.y - 8, () => {
                            nearest.state = 'at_station';
                            nearest.stateTimer = 10000;
                        });
                    }
                }
                break;
            }
            case 'jigsaw': {
                // Nearest seated student becomes the host; 3 closest seated students join them
                const host = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (!host) break;
                const otherSeated = this.students.filter(s => s.state === 'seated' && s !== host);
                if (otherSeated.length < tech.groupSize - 1) break;

                // Find 3 closest seated students to the host
                otherSeated.sort((a, b) =>
                    Phaser.Math.Distance.Between(host.x, host.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(host.x, host.y, b.x, b.y)
                );
                const group = [host, ...otherSeated.slice(0, tech.groupSize - 1)];

                const offsets = [
                    { x: -16, y: -10 },
                    { x: 16, y: -10 },
                    { x: -16, y: 10 },
                    { x: 16, y: 10 },
                ];

                group.forEach((s, idx) => {
                    s.state = 'jigsaw';
                    if (s !== host) {
                        const ox = host.seatX + offsets[idx].x;
                        const oy = host.seatY + offsets[idx].y;
                        s.moveToPosition(ox, oy, () => { s.state = 'jigsaw'; });
                    }
                });
                this.jigsawGroups.push({
                    students: group,
                    hostX: host.seatX,
                    hostY: host.seatY,
                    timer: tech.groupDuration,
                });
                this.showInteractionEffect(host.x, host.y, tech.color);
                teacher.startCooldown(techId, tech.cooldown);
                break;
            }
            case 'group_work': {
                // Pull all surrounding seated students to the nearest student's desk
                const gwHost = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (!gwHost) break;
                // Find all seated students at surrounding tables (N, NE, E, SE, S, SW, W, NW)
                const gwNearby = this.students.filter(s =>
                    s.state === 'seated' && s !== gwHost &&
                    Phaser.Math.Distance.Between(gwHost.x, gwHost.y, s.x, s.y) < 250
                );
                if (gwNearby.length === 0) break;
                const gwGroup = [gwHost, ...gwNearby];

                // Arrange in a circle around the host desk
                gwGroup.forEach((s, idx) => {
                    s.state = 'jigsaw';
                    if (s !== gwHost) {
                        const angle = ((idx - 1) / gwNearby.length) * Math.PI * 2;
                        const radius = 18;
                        const ox = gwHost.seatX + Math.cos(angle) * radius;
                        const oy = gwHost.seatY + Math.sin(angle) * radius;
                        s.moveToPosition(ox, oy, () => { s.state = 'jigsaw'; });
                    }
                });
                this.jigsawGroups.push({
                    students: gwGroup,
                    hostX: gwHost.seatX,
                    hostY: gwHost.seatY,
                    timer: tech.groupDuration,
                });
                this.showInteractionEffect(gwHost.x, gwHost.y, tech.color);
                teacher.startCooldown(techId, tech.cooldown);
                break;
            }
            case 'compare_contrast': {
                if (!cfg.hasLinks) return;
                const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (nearest && nearest.linkedTo) {
                    nearest.boostAttention(tech.attentionBoost);
                    nearest.linkedTo.boostAttention(tech.attentionBoost);
                    nearest.linkPositive = true;
                    nearest.linkedTo.linkPositive = true;
                    const link = this.links.find(l =>
                        (l.a === nearest && l.b === nearest.linkedTo) ||
                        (l.b === nearest && l.a === nearest.linkedTo)
                    );
                    if (link) link.positive = true;
                    this.time.delayedCall(12000, () => {
                        nearest.linkPositive = false;
                        nearest.linkedTo.linkPositive = false;
                        if (link) link.positive = false;
                    });
                    this.showInteractionEffect(nearest.x, nearest.y, tech.color);
                    this.showInteractionEffect(nearest.linkedTo.x, nearest.linkedTo.y, tech.color);
                    teacher.startCooldown(techId, tech.cooldown);
                }
                break;
            }
            case 'quick_answer': {
                if (!cfg.hasQuestions) return;
                const questioning = this.students.find(s => s.hasQuestion && Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < tech.range);
                if (questioning) {
                    questioning.hideQuestion();
                    questioning.boostAttention(tech.attentionBoost);
                    this.showInteractionEffect(questioning.x, questioning.y, tech.color);
                }
                break;
            }
            case 'socratic_question': {
                if (!cfg.hasQuestions) return;
                const questioning = this.students.find(s => s.hasQuestion && Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < tech.range);
                if (questioning) {
                    teacher.showAura(40, tech.color);
                    teacher.startChannel(tech.channelTime, () => {
                        questioning.hideQuestion();
                        questioning.boostAttention(tech.attentionBoost);
                        this.getStudentsInRange(questioning.x, questioning.y, 100, 'seated').forEach(s => {
                            if (s !== questioning) s.boostAttention(10);
                        });
                        this.showInteractionEffect(questioning.x, questioning.y, tech.color);
                    });
                    teacher.startCooldown(techId, tech.cooldown);
                }
                break;
            }
            case 'group_project': {
                if (!cfg.hasProjectBoard) return;
                const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (nearest) {
                    let tx = this.projectBoardX + (Math.random() - 0.5) * 100;
                    let ty = this.projectBoardY + 35;
                    if (cfg.hasColorZones) {
                        const zone = nearest.zoneAffinity;
                        tx = this.projectBoardX - 90 + zone * 90;
                    }
                    nearest.moveToPosition(tx, ty, () => {
                        nearest.state = 'at_project';
                        nearest.stateTimer = 10000;
                        this.projectStudents.push(nearest);
                        nearest.boostAttention(tech.attentionBoost);
                        this.checkSynthesisEvent();
                    });
                    teacher.startCooldown(techId, tech.cooldown);
                }
                break;
            }
            case 'peer_teach': {
                if (!cfg.hasPodium || this.presenterActive) return;
                const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (nearest && nearest.attention > 40) {
                    nearest.moveToPosition(this.podiumX, this.podiumY - 20, () => {
                        nearest.state = 'presenting';
                        nearest.stateTimer = 8000;
                        this.presenterActive = nearest;
                    });
                    teacher.startCooldown(techId, tech.cooldown);
                }
                break;
            }
            case 'presentation': {
                // Only one presenter at a time, no cooldown
                if (this.presenterActive) return;
                const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
                if (!nearest) break;
                // Find which column this student is in
                const presCol = this.getStudentColumn(nearest);
                // Move student to front of room (same x, near whiteboard)
                const frontY = 95;
                nearest.boostAttention(tech.attentionBoost); // +100
                nearest.moveToPosition(nearest.seatX, frontY, () => {
                    nearest.state = 'presenting';
                    nearest.stateTimer = tech.presentDuration; // 10 seconds
                    this.presenterActive = nearest;
                    this.presenterColumn = presCol;
                    // Flag column students so their decay is paused
                    presCol.forEach(s => { if (s !== nearest) s.inPresentationColumn = true; });
                    // Start column highlight animation
                    this.startColumnAnimation(presCol);
                });
                this.showInteractionEffect(nearest.x, nearest.y, tech.color);
                break;
            }
        }
    }

    // === HELPERS ===

    getStudentsInRange(x, y, range, stateFilter) {
        return this.students.filter(s => {
            if (stateFilter && s.state !== stateFilter) return false;
            return Phaser.Math.Distance.Between(x, y, s.x, s.y) < range;
        });
    }

    getNearestStudent(x, y, maxRange, stateFilter) {
        let best = null;
        let bestDist = maxRange;
        this.students.forEach(s => {
            if (stateFilter && s.state !== stateFilter) return;
            const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
            if (d < bestDist) { bestDist = d; best = s; }
        });
        return best;
    }

    getStudentColumn(student) {
        // Find all students that share approximately the same x position (same column)
        const tolerance = 20;
        return this.students.filter(s => Math.abs(s.seatX - student.seatX) < tolerance);
    }

    startColumnAnimation(columnStudents) {
        // Pulsing glow on column students while presenter is active
        this.columnGlowGraphics = this.columnGlowGraphics || [];
        // Clean up any old ones
        this.columnGlowGraphics.forEach(g => g.destroy());
        this.columnGlowGraphics = [];

        // Draw a vertical highlight beam behind the column
        const minY = 95;
        const maxY = Math.max(...columnStudents.map(s => s.seatY)) + 20;
        const colX = columnStudents[0].seatX;
        const beam = this.add.graphics().setDepth(1);
        beam.fillStyle(0x2A9D8F, 0.12);
        beam.fillRect(colX - 24, minY, 48, maxY - minY);
        this.columnGlowGraphics.push(beam);
        this.tweens.add({
            targets: beam,
            alpha: { from: 0.3, to: 0.08 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Individual student glow rings
        columnStudents.forEach(s => {
            if (s === this.presenterActive) return;
            const glow = this.add.graphics().setDepth(15);
            // Bright ring around student
            glow.lineStyle(3, 0x2A9D8F, 0.8);
            glow.strokeCircle(0, 0, 18);
            glow.fillStyle(0x2A9D8F, 0.15);
            glow.fillCircle(0, 0, 18);
            glow.setPosition(s.seatX, s.seatY - 4);
            this.columnGlowGraphics.push(glow);
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.9, to: 0.3 },
                scaleX: { from: 1, to: 1.2 },
                scaleY: { from: 1, to: 1.2 },
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    stopColumnAnimation() {
        if (this.columnGlowGraphics) {
            this.columnGlowGraphics.forEach(g => g.destroy());
            this.columnGlowGraphics = [];
        }
        // Clear decay-pause flag on column students
        if (this.presenterColumn) {
            this.presenterColumn.forEach(s => { s.inPresentationColumn = false; });
        }
        this.presenterColumn = null;
    }

    showInteractionEffect(x, y, color) {
        const circle = this.add.graphics().setDepth(15);
        circle.lineStyle(2, color, 0.8);
        circle.strokeCircle(0, 0, 5);
        circle.setPosition(x, y);

        this.tweens.add({
            targets: circle,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => circle.destroy(),
        });
    }

    spawnQuestion() {
        const eligible = this.students.filter(s => s.state === 'seated' && !s.hasQuestion && s.attention > 20);
        if (eligible.length === 0) return;

        const student = eligible[Math.floor(Math.random() * eligible.length)];
        student.showQuestion();
        student.questionTimer = 5000;
    }

    checkSynthesisEvent() {
        const atBoard = this.projectStudents.filter(s => s.state === 'at_project');
        if (atBoard.length >= 3) {
            this.synthesisCount++;
            // Visual celebration
            atBoard.forEach(s => {
                s.boostAttention(20);
                this.showInteractionEffect(s.x, s.y, BloomGame.COLORS.ACCENT);
            });
            this.showAnnouncement('Synthesis!', `Ideas combined! (${this.synthesisCount}/${this.levelConfig.synthesisGoal || 3})`, 1500);
            this.projectStudents = this.projectStudents.filter(s => s.state === 'at_project');
            // Send them back
            atBoard.forEach(s => {
                this.time.delayedCall(1000, () => s.returnToSeat());
            });
            this.updateSynthesisDisplay();
        }
    }

    updateSynthesisDisplay() {
        if (!this.synthesisProgress) return;
        const g = this.synthesisProgress;
        g.clear();
        const goal = this.levelConfig.synthesisGoal || 3;
        for (let i = 0; i < goal; i++) {
            if (i < this.synthesisCount) {
                g.fillStyle(BloomGame.COLORS.ACCENT);
            } else {
                g.fillStyle(0x888888, 0.3);
            }
            g.fillCircle(this.projectBoardX - 30 + i * 20, this.projectBoardY + 48, 6);
        }
    }

    // === MAIN UPDATE ===

    update(time, rawDelta) {
        if (!this.gameRunning) return;

        const delta = Math.min(rawDelta, 50); // Cap delta

        // Update teacher
        this.teacher.update(delta, this.cursors, this.wasd);

        // Coffee mug pickup, boost, & lifetimes
        this.checkCoffeePickup();
        this.updateCoffeeBoost(delta);
        this.updateCoffeeMugLifetimes(delta);

        // Air conditioner
        this.updateAC(delta);

        // ICT power-up
        this.checkICTPickup();
        this.updateICTPickupLifetimes(delta);
        this.updateICT(delta);

        // Update students
        this.students.forEach(s => s.update(delta));

        // Update jigsaw groups
        for (let i = this.jigsawGroups.length - 1; i >= 0; i--) {
            const group = this.jigsawGroups[i];
            group.timer -= delta;
            if (group.timer <= 0) {
                // Send students back to seats
                group.students.forEach(s => {
                    if (s.state === 'jigsaw') s.returnToSeat();
                });
                this.jigsawGroups.splice(i, 1);
            }
        }

        // Handle presenter
        if (this.presenterActive) {
            if (this.presenterActive.state !== 'presenting') {
                // Presentation ended
                this.presentCount++;
                this.stopColumnAnimation();
                this.presenterActive = null;
            } else if (this.presenterColumn) {
                // Column students get attention boost at 3.5/sec
                this.presenterColumn.forEach(s => {
                    if (s !== this.presenterActive && s.state === 'seated') {
                        s.attention = Math.min(s.maxAttention, s.attention + 5 * (delta / 1000));
                    }
                });
            }
        }

        // Draw links
        if (this.linkGraphics) {
            this.linkGraphics.clear();
            this.links.forEach(link => {
                const color = link.positive ? BloomGame.COLORS.LINK_POSITIVE : BloomGame.COLORS.LINK_NEGATIVE;
                const alpha = link.positive ? 0.5 : 0.25;
                this.linkGraphics.lineStyle(2, color, alpha);
                this.linkGraphics.lineBetween(link.a.x, link.a.y, link.b.x, link.b.y);
            });
        }

        // Input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.handleSpacePress();
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.handleTechniquePress('E');
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) this.handleTechniquePress('Q');

        // Timer
        this.gameTime -= delta / 1000;
        if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.checkWinCondition();
        }

        // Calculate average attention
        const total = this.students.reduce((sum, s) => sum + s.attention, 0);
        this.averageAttention = total / this.students.length;

        // Update HUD
        this.updateHUD();

        // Check fail - attention too low for too long
        if (this.averageAttention < this.levelConfig.attentionThreshold * 0.5) {
            this.failLevel('The class has completely lost focus...');
        }
    }

    updateHUD() {
        const mins = Math.floor(this.gameTime / 60);
        const secs = Math.floor(this.gameTime % 60);
        this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

        if (this.gameTime < 15) {
            this.timerText.setColor('#E63946');
        } else {
            this.timerText.setColor('#F5F0E8');
        }

        const avg = Math.round(this.averageAttention);
        let avgColor = '#2A9D8F';
        if (avg < this.levelConfig.attentionThreshold) avgColor = '#E63946';
        else if (avg < this.levelConfig.attentionThreshold + 10) avgColor = '#F4A261';
        this.avgText.setText(`Class Attention: ${avg}%`);
        this.avgText.setColor(avgColor);

        // Update technique bar colors and cooldown progress bars
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const cfg = this.levelConfig;
        const barY = H - 52;
        this.techCooldownBar.clear();

        cfg.techniques.forEach((techId, i) => {
            if (i >= this.techTexts.length) return;
            const cooldownPct = this.teacher.getCooldownPercent(techId);
            this.techTexts[i].setColor(cooldownPct > 0 ? '#666666' : '#F5F0E8');

            if (cooldownPct > 0) {
                const tx = this.techTexts[i].x;
                const barWidth = this.techTexts[i].width;
                const filled = barWidth * (1 - cooldownPct);
                // Background
                this.techCooldownBar.fillStyle(0x000000, 0.4);
                this.techCooldownBar.fillRoundedRect(tx, barY + 20, barWidth, 4, 2);
                // Fill (recharging)
                const tech = BloomGame.Techniques[techId];
                this.techCooldownBar.fillStyle(tech ? tech.color : 0x2A9D8F, 0.8);
                this.techCooldownBar.fillRoundedRect(tx, barY + 20, filled, 4, 2);
            }
        });

        if (this.synthesisText) {
            this.synthesisText.setText(`Synthesis: ${this.synthesisCount}/${this.levelConfig.synthesisGoal || 3}`);
        }
        if (this.presentText) {
            this.presentText.setText(`Presentations: ${this.presentCount}/${this.levelConfig.presentGoal || 3}`);
        }

        // Powerup decay bar
        const decayBarW = 120;
        const decayBarH = 6;
        const decayBarX = W / 2 - decayBarW / 2;
        const decayBarY = H - 64;

        this.powerupDecayBar.clear();
        this.powerupDecayLabel.setVisible(false);

        if (this.coffeeBoosted) {
            const pct = this.coffeeTimer / this.coffeeMaxDuration;
            this.powerupDecayBar.fillStyle(0x000000, 0.5);
            this.powerupDecayBar.fillRoundedRect(decayBarX, decayBarY, decayBarW, decayBarH, 3);
            this.powerupDecayBar.fillStyle(0xE9C46A, 0.9);
            this.powerupDecayBar.fillRoundedRect(decayBarX, decayBarY, decayBarW * pct, decayBarH, 3);
            this.powerupDecayLabel.setText('Coffee Boost');
            this.powerupDecayLabel.setColor('#E9C46A');
            this.powerupDecayLabel.setVisible(true);
        } else if (this.acActive) {
            const pct = this.acTimer / this.acMaxDuration;
            this.powerupDecayBar.fillStyle(0x000000, 0.5);
            this.powerupDecayBar.fillRoundedRect(decayBarX, decayBarY, decayBarW, decayBarH, 3);
            this.powerupDecayBar.fillStyle(0x2A9D8F, 0.9);
            this.powerupDecayBar.fillRoundedRect(decayBarX, decayBarY, decayBarW * pct, decayBarH, 3);
            this.powerupDecayLabel.setText('A/C Active');
            this.powerupDecayLabel.setColor('#2A9D8F');
            this.powerupDecayLabel.setVisible(true);
        }

        // Update tech bar text based on context
        const acDist = Phaser.Math.Distance.Between(this.teacher.x, this.teacher.y, this.acX, this.acY);
        if (this.techTexts.length > 0) {
            if (acDist < 50 && !this.acActive) {
                this.techTexts[0].setText('[SPACE] Turn on AC');
            } else if (this.levelConfig.hasQuestions && this.students.some(s => s.hasQuestion && Phaser.Math.Distance.Between(this.teacher.x, this.teacher.y, s.x, s.y) < 60)) {
                this.techTexts[0].setText('[SPACE] Socratic Dialog');
            } else if (this.levelConfig.techniques.includes('presentation') && this.students.some(s => s.hasPresented && !s.hasQuestion && s.state === 'seated' && Phaser.Math.Distance.Between(this.teacher.x, this.teacher.y, s.x, s.y) < 60)) {
                this.techTexts[0].setText('[SPACE] Praise');
            } else {
                const techId = this.levelConfig.techniques[0];
                const tech = BloomGame.Techniques[techId];
                if (tech) this.techTexts[0].setText(`[${tech.key}] ${tech.name}`);
            }
        }
    }

    checkWinCondition() {
        const cfg = this.levelConfig;
        const avg = this.averageAttention;

        if (avg >= cfg.attentionThreshold) {
            // Check additional conditions
            if (cfg.hasProjectBoard && this.synthesisCount < (cfg.synthesisGoal || 3)) {
                this.failLevel(`Need ${cfg.synthesisGoal || 3} synthesis events. You got ${this.synthesisCount}.`);
                return;
            }
            if (cfg.hasPodium && this.presentCount < (cfg.presentGoal || 3)) {
                this.failLevel(`Need ${cfg.presentGoal || 3} presentations. You got ${this.presentCount}.`);
                return;
            }
            this.winLevel();
        } else {
            this.failLevel(`Class attention dropped to ${Math.round(avg)}%. Needed ${cfg.attentionThreshold}%.`);
        }
    }

    winLevel() {
        this.gameRunning = false;
        this.teacher.body.setVelocity(0, 0);
        this.showAnnouncement('Level Complete!', 'Well done, Mr. Bloom.', 2000);

        // Save progress — unlock next level
        const nextLevel = this.levelIndex + 1;
        const saved = parseInt(localStorage.getItem('bloomsMaxLevel') || '0', 10);
        if (nextLevel > saved) {
            localStorage.setItem('bloomsMaxLevel', String(nextLevel));
        }

        this.time.delayedCall(2500, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                const cfg = this.levelConfig;
                const nextLevelIndex = this.levelIndex + 1;

                if (cfg.outroKey) {
                    // Has outro narrative
                    if (nextLevelIndex < BloomGame.LevelConfig.length) {
                        const nextCfg = BloomGame.LevelConfig[nextLevelIndex];
                        this.scene.start('Narrative', {
                            key: cfg.outroKey,
                            nextScene: 'Narrative',
                            nextData: {
                                key: nextCfg.introKey,
                                nextScene: 'Classroom',
                                nextData: { level: nextLevelIndex },
                            },
                        });
                    } else {
                        // Game complete
                        this.scene.start('Narrative', {
                            key: cfg.outroKey,
                            nextScene: 'Narrative',
                            nextData: {
                                key: 'epilogue',
                                nextScene: 'Victory',
                                nextData: {},
                            },
                        });
                    }
                } else {
                    // No outro (level 8)
                    this.scene.start('Narrative', {
                        key: 'epilogue',
                        nextScene: 'Victory',
                        nextData: {},
                    });
                }
            });
        });
    }

    failLevel(reason) {
        this.gameRunning = false;
        this.teacher.body.setVelocity(0, 0);
        this.scene.start('GameOver', {
            reason: reason,
            levelIndex: this.levelIndex,
        });
    }
};
