window.BloomGame = window.BloomGame || {};

BloomGame.ClassroomScene = class ClassroomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Classroom' });
    }

    init(data) {
        this.levelIndex = data.level || 0;
        this.levelConfig = BloomGame.LevelConfig[this.levelIndex];
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

        // Draw classroom
        this.drawClassroom();

        // Create desks and students
        this.createStudents();

        // Create special elements
        if (cfg.hasStations) this.createStations();
        if (cfg.hasLinks) this.createLinks();
        if (cfg.hasProjectBoard) this.createProjectBoard();
        if (cfg.hasPodium) this.createPodium();

        // Create teacher
        this.teacher = new BloomGame.Teacher(this, W / 2, H - 120);
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
        this.oneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.twoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.threeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

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
        this.add.text(W / 2, 78, this.levelConfig.bloomLabel, {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#264653',
        }).setOrigin(0.5).setDepth(1);

        bg.setDepth(0);
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

            const station = this.add.image(x, y, 'station').setDepth(1);
            const label = this.add.text(x, y, 'TASK', {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#A0785A',
            }).setOrigin(0.5).setDepth(2);

            this.stations.push({ x, y, sprite: station, occupied: 0 });
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
            fontFamily: 'monospace',
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
            fontFamily: 'monospace',
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
            fontFamily: 'monospace',
            color: '#E9C46A',
        }).setDepth(51);

        // Timer
        this.timerText = this.add.text(W / 2, 16, '', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(51);

        // Average attention
        this.avgText = this.add.text(W / 2, 38, '', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#F5F0E8',
        }).setOrigin(0.5).setDepth(51);

        // Threshold indicator
        this.add.text(W - 12, 8, `Goal: ${cfg.attentionThreshold}%`, {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#E9C46A',
        }).setOrigin(1, 0).setDepth(51);

        // Technique bar
        this.techBar = this.add.graphics().setDepth(50);
        this.techTexts = [];
        this.drawTechBar();

        // Synthesis / Present counters
        if (cfg.hasProjectBoard) {
            this.synthesisText = this.add.text(W - 12, 28, '', {
                fontSize: '11px', fontFamily: 'monospace', color: '#F5F0E8',
            }).setOrigin(1, 0).setDepth(51);
        }
        if (cfg.hasPodium) {
            this.presentText = this.add.text(W - 12, 40, '', {
                fontSize: '11px', fontFamily: 'monospace', color: '#F5F0E8',
            }).setOrigin(1, 0).setDepth(51);
        }
    }

    drawTechBar() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const cfg = this.levelConfig;
        const techs = cfg.techniques;

        // Clear old texts
        this.techTexts.forEach(t => t.destroy());
        this.techTexts = [];

        const barY = H - 36;
        this.techBar.clear();
        this.techBar.fillStyle(BloomGame.COLORS.UI_DARK, 0.75);
        this.techBar.fillRect(0, barY - 4, W, 40);

        const startX = 20;
        const slotW = 110;

        techs.forEach((techId, i) => {
            const tech = BloomGame.Techniques[techId];
            if (!tech) return;

            const x = startX + i * slotW;

            const text = this.add.text(x, barY + 4, `[${tech.key}] ${tech.name}`, {
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#F5F0E8',
            }).setDepth(51);

            this.techTexts.push(text);
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
            fontFamily: 'monospace',
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

    // === INPUT HANDLING ===

    handleSpacePress() {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Check for supporting a presenter
        if (this.presenterActive) {
            const dist = Phaser.Math.Distance.Between(teacher.x, teacher.y, this.presenterActive.x, this.presenterActive.y);
            if (dist < 80) {
                this.presenterActive.boostAttention(8);
                this.showInteractionEffect(this.presenterActive.x, this.presenterActive.y, 0xE9C46A);
                return;
            }
        }

        // AoE Explain
        if (cfg.techniques.includes('explain') && teacher.canUseTechnique('explain')) {
            const tech = BloomGame.Techniques.explain;
            const nearby = this.getStudentsInRange(teacher.x, teacher.y, tech.range, 'seated');
            if (nearby.length > 0) {
                teacher.showAura(tech.range, tech.color);
                teacher.startChannel(tech.channelTime, () => {
                    const targets = this.getStudentsInRange(teacher.x, teacher.y, tech.range, 'seated');
                    targets.forEach(s => {
                        s.boostAttention(tech.attentionBoost);
                        this.showInteractionEffect(s.x, s.y, tech.color);
                    });
                });
                teacher.startCooldown('explain', tech.cooldown);
                return;
            }
        }

        // Single-target Recall Prompt
        if (cfg.techniques.includes('recall_prompt') && teacher.canUseTechnique('recall_prompt')) {
            const tech = BloomGame.Techniques.recall_prompt;
            const nearest = this.getNearestStudent(teacher.x, teacher.y, tech.range, 'seated');
            if (nearest) {
                nearest.boostAttention(tech.attentionBoost);
                this.showInteractionEffect(nearest.x, nearest.y, tech.color);
                teacher.startCooldown('recall_prompt', tech.cooldown);
                return;
            }
        }
    }

    handleEPress() {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Peer Teaching (send to podium)
        if (cfg.hasPodium && cfg.techniques.includes('peer_teach') && teacher.canUseTechnique('peer_teach') && !this.presenterActive) {
            const nearest = this.getNearestStudent(teacher.x, teacher.y, 60, 'seated');
            if (nearest && nearest.attention > 40) {
                nearest.moveToPosition(this.podiumX, this.podiumY - 20, () => {
                    nearest.state = 'presenting';
                    nearest.stateTimer = 8000;
                    this.presenterActive = nearest;
                });
                teacher.startCooldown('peer_teach', BloomGame.Techniques.peer_teach.cooldown);
                return;
            }
        }

        // Group Project (send to board)
        if (cfg.hasProjectBoard && cfg.techniques.includes('group_project') && teacher.canUseTechnique('group_project')) {
            const nearest = this.getNearestStudent(teacher.x, teacher.y, 60, 'seated');
            if (nearest) {
                let tx = this.projectBoardX + (Math.random() - 0.5) * 100;
                let ty = this.projectBoardY + 35;

                if (cfg.hasColorZones) {
                    // Direct to zone based on affinity
                    const zone = nearest.zoneAffinity;
                    tx = this.projectBoardX - 90 + zone * 90;
                }

                nearest.moveToPosition(tx, ty, () => {
                    nearest.state = 'at_project';
                    nearest.stateTimer = 10000;
                    this.projectStudents.push(nearest);
                    nearest.boostAttention(BloomGame.Techniques.group_project.attentionBoost);
                    this.checkSynthesisEvent();
                });
                teacher.startCooldown('group_project', BloomGame.Techniques.group_project.cooldown);
                return;
            }
        }

        // Compare & Contrast (linked students)
        if (cfg.hasLinks && cfg.techniques.includes('compare_contrast') && teacher.canUseTechnique('compare_contrast')) {
            const nearest = this.getNearestStudent(teacher.x, teacher.y, 60, 'seated');
            if (nearest && nearest.linkedTo) {
                const tech = BloomGame.Techniques.compare_contrast;
                nearest.boostAttention(tech.attentionBoost);
                nearest.linkedTo.boostAttention(tech.attentionBoost);
                nearest.linkPositive = true;
                nearest.linkedTo.linkPositive = true;

                // Update link visuals
                const link = this.links.find(l =>
                    (l.a === nearest && l.b === nearest.linkedTo) ||
                    (l.b === nearest && l.a === nearest.linkedTo)
                );
                if (link) link.positive = true;

                // Reset after time
                this.time.delayedCall(12000, () => {
                    nearest.linkPositive = false;
                    nearest.linkedTo.linkPositive = false;
                    if (link) link.positive = false;
                });

                this.showInteractionEffect(nearest.x, nearest.y, tech.color);
                this.showInteractionEffect(nearest.linkedTo.x, nearest.linkedTo.y, tech.color);
                teacher.startCooldown('compare_contrast', tech.cooldown);
                return;
            }
        }

        // Guided Practice (send to station)
        if (cfg.hasStations && cfg.techniques.includes('guided_practice') && teacher.canUseTechnique('guided_practice')) {
            const nearest = this.getNearestStudent(teacher.x, teacher.y, 60, 'seated');
            if (nearest) {
                // Find nearest station
                let bestStation = null;
                let bestDist = Infinity;
                this.stations.forEach(s => {
                    const d = Phaser.Math.Distance.Between(nearest.x, nearest.y, s.x, s.y);
                    if (d < bestDist) { bestDist = d; bestStation = s; }
                });

                if (bestStation) {
                    const tech = BloomGame.Techniques.guided_practice;
                    nearest.boostAttention(tech.attentionBoost);
                    bestStation.occupied++;
                    nearest.moveToPosition(bestStation.x + (Math.random() - 0.5) * 20, bestStation.y, () => {
                        nearest.state = 'at_station';
                        nearest.stateTimer = 8000;
                    });
                    // Return and free station
                    this.time.delayedCall(9000, () => {
                        bestStation.occupied = Math.max(0, bestStation.occupied - 1);
                    });
                    teacher.startCooldown('guided_practice', tech.cooldown);
                }
                return;
            }
        }
    }

    handleOnePress() {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Quick Answer to question
        if (cfg.hasQuestions && cfg.techniques.includes('quick_answer')) {
            const questioning = this.students.find(s => s.hasQuestion && Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < 60);
            if (questioning) {
                const tech = BloomGame.Techniques.quick_answer;
                questioning.hideQuestion();
                questioning.boostAttention(tech.attentionBoost);
                this.showInteractionEffect(questioning.x, questioning.y, tech.color);
                return;
            }
        }

        // Zone 1 direction for color zones
        if (cfg.hasColorZones && cfg.techniques.includes('group_project') && teacher.canUseTechnique('group_project')) {
            this.sendToZone(0);
        }
    }

    handleTwoPress() {
        const cfg = this.levelConfig;
        const teacher = this.teacher;

        // Socratic Question
        if (cfg.hasQuestions && cfg.techniques.includes('socratic_question') && teacher.canUseTechnique('socratic_question')) {
            const questioning = this.students.find(s => s.hasQuestion && Phaser.Math.Distance.Between(teacher.x, teacher.y, s.x, s.y) < 60);
            if (questioning) {
                const tech = BloomGame.Techniques.socratic_question;
                teacher.showAura(40, tech.color);
                teacher.startChannel(tech.channelTime, () => {
                    questioning.hideQuestion();
                    questioning.boostAttention(tech.attentionBoost);
                    // AoE boost to neighbors
                    this.getStudentsInRange(questioning.x, questioning.y, 100, 'seated').forEach(s => {
                        if (s !== questioning) s.boostAttention(10);
                    });
                    this.showInteractionEffect(questioning.x, questioning.y, tech.color);
                });
                teacher.startCooldown('socratic_question', tech.cooldown);
                return;
            }
        }

        // Zone 2 direction
        if (cfg.hasColorZones && cfg.techniques.includes('group_project') && teacher.canUseTechnique('group_project')) {
            this.sendToZone(1);
        }
    }

    handleThreePress() {
        const cfg = this.levelConfig;

        // Zone 3 direction
        if (cfg.hasColorZones && cfg.techniques.includes('group_project') && this.teacher.canUseTechnique('group_project')) {
            this.sendToZone(2);
        }
    }

    sendToZone(zoneIndex) {
        const teacher = this.teacher;
        const nearest = this.getNearestStudent(teacher.x, teacher.y, 60, 'seated');
        if (!nearest) return;

        const tx = this.projectBoardX - 90 + zoneIndex * 90;
        const ty = this.projectBoardY + 35;
        const isMatch = nearest.zoneAffinity === zoneIndex;

        nearest.moveToPosition(tx, ty, () => {
            nearest.state = 'at_project';
            nearest.stateTimer = 10000;
            this.projectStudents.push(nearest);
            const boost = isMatch ? 25 : 12;
            nearest.boostAttention(boost);
            if (isMatch) {
                this.showInteractionEffect(nearest.x, nearest.y, 0xE9C46A);
            }
            this.checkSynthesisEvent();
        });
        teacher.startCooldown('group_project', BloomGame.Techniques.group_project.cooldown);
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
        student.questionTimer = 10000;
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
            g.fillStar(this.projectBoardX - 30 + i * 20, this.projectBoardY + 48, 5, 8, 4, 5);
        }
    }

    // === MAIN UPDATE ===

    update(time, rawDelta) {
        if (!this.gameRunning) return;

        const delta = Math.min(rawDelta, 50); // Cap delta

        // Update teacher
        this.teacher.update(delta, this.cursors, this.wasd);

        // Update students
        this.students.forEach(s => s.update(delta));

        // Handle presenter
        if (this.presenterActive) {
            if (this.presenterActive.state !== 'presenting') {
                // Presentation ended
                this.presentCount++;
                this.presenterActive = null;
            } else {
                // Presenter radiates attention
                this.students.forEach(s => {
                    if (s !== this.presenterActive && s.state === 'seated') {
                        s.attention = Math.min(s.maxAttention, s.attention + 3 * (delta / 1000));
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
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.handleEPress();
        if (Phaser.Input.Keyboard.JustDown(this.oneKey)) this.handleOnePress();
        if (Phaser.Input.Keyboard.JustDown(this.twoKey)) this.handleTwoPress();
        if (Phaser.Input.Keyboard.JustDown(this.threeKey)) this.handleThreePress();

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

        // Update technique bar colors based on cooldowns
        const cfg = this.levelConfig;
        cfg.techniques.forEach((techId, i) => {
            if (i >= this.techTexts.length) return;
            const onCooldown = this.teacher.cooldowns[techId];
            this.techTexts[i].setColor(onCooldown ? '#666666' : '#F5F0E8');
        });

        if (this.synthesisText) {
            this.synthesisText.setText(`Synthesis: ${this.synthesisCount}/${this.levelConfig.synthesisGoal || 3}`);
        }
        if (this.presentText) {
            this.presentText.setText(`Presentations: ${this.presentCount}/${this.levelConfig.presentGoal || 3}`);
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
        this.showAnnouncement('Level Complete!', 'Well done, Mr. Thompson.', 2000);

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
        this.scene.start('GameOver', {
            reason: reason,
            levelIndex: this.levelIndex,
        });
    }
};
