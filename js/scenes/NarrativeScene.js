window.BloomGame = window.BloomGame || {};

BloomGame.NarrativeScene = class NarrativeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Narrative' });
    }

    init(data) {
        this.narrativeKey = data.key;
        this.nextScene = data.nextScene || 'Menu';
        this.nextData = data.nextData || {};
    }

    create() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const data = BloomGame.NarrativeData[this.narrativeKey];

        if (!data) {
            this.scene.start(this.nextScene, this.nextData);
            return;
        }

        this.cameras.main.setBackgroundColor(data.background || 0x264653);
        this.cameras.main.fadeIn(600, 0, 0, 0);

        this.lines = data.lines;
        this.currentLine = 0;
        this.isTyping = false;
        this.typeTimer = null;
        this.fullText = '';
        this.displayedText = '';
        this.charIndex = 0;

        // Dark overlay panel
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.5);
        panel.fillRoundedRect(60, H - 220, W - 120, 180, 12);
        panel.lineStyle(1, 0xF5F0E8, 0.2);
        panel.strokeRoundedRect(60, H - 220, W - 120, 180, 12);

        // Speaker name
        this.speakerText = this.add.text(90, H - 210, '', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#E9C46A',
            fontStyle: 'bold',
        });

        // Dialogue text
        this.dialogText = this.add.text(90, H - 185, '', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            wordWrap: { width: W - 180 },
            lineSpacing: 6,
        });

        // Continue prompt
        this.continueText = this.add.text(W - 80, H - 50, '[ SPACE ]', {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#888888',
        }).setOrigin(1, 1);

        this.tweens.add({
            targets: this.continueText,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // Classroom backdrop (hidden by default, behind dialog)
        this.classroomGroup = this.add.container(0, 0).setVisible(false).setDepth(0);
        this.drawClassroomBackdrop();

        // Ensure dialog UI is above the classroom backdrop
        panel.setDepth(10);
        this.speakerText.setDepth(11);
        this.dialogText.setDepth(11);
        this.continueText.setDepth(11);

        // Teacher portrait (simple)
        this.portrait = this.add.graphics().setDepth(11);
        this.drawPortrait();

        // Input
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // Also allow clicking
        this.input.on('pointerdown', () => this.advance());

        // Start first line
        this.showLine();
    }

    drawClassroomBackdrop() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const g = this.add.graphics();

        // Floor
        g.fillStyle(0xE8E0D0);
        g.fillRect(0, 0, W, H);

        // Floor tiles
        g.lineStyle(1, 0xDDD5C5, 0.3);
        for (let x = 0; x < W; x += 32) g.lineBetween(x, 0, x, H);
        for (let y = 0; y < H; y += 32) g.lineBetween(0, y, W, y);

        // Walls
        g.fillStyle(0x8B7355);
        g.fillRect(0, 0, W, 8);
        g.fillRect(0, 0, 8, H);
        g.fillRect(W - 8, 0, 8, H);

        // Whiteboard
        g.fillStyle(0xA0785A);
        g.fillRoundedRect(W / 2 - 120, 10, 240, 6, 2);
        g.fillStyle(0xFFFFFF);
        g.fillRoundedRect(W / 2 - 116, 14, 232, 30, 4);

        this.classroomGroup.add(g);

        // Teacher at the front of the room
        const tg = this.add.graphics();
        const tx = W / 2, ty = 65;
        tg.fillStyle(0x264653, 0.6);
        tg.fillCircle(tx, ty, 30);
        tg.fillStyle(BloomGame.COLORS.TEACHER);
        tg.fillRoundedRect(tx - 12, ty - 5, 24, 28, 4);
        tg.fillStyle(0xF5CBA7);
        tg.fillCircle(tx, ty - 12, 11);
        tg.fillStyle(0x4A3728);
        tg.fillEllipse(tx, ty - 20, 18, 8);
        tg.fillStyle(BloomGame.COLORS.ACCENT);
        tg.fillTriangle(tx - 2, ty - 3, tx + 2, ty - 3, tx, ty + 8);
        this.classroomGroup.add(tg);

        // 6 students at desks (12 eyes = 6 students)
        const colors = BloomGame.STUDENT_COLORS;
        const rows = 2, cols = 3;
        const marginX = 130, marginTop = 130;
        const spacingX = (W - 2 * marginX) / (cols - 1);
        const spacingY = 80;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = marginX + c * spacingX;
                const y = marginTop + r * spacingY;
                const sg = this.add.graphics();
                const color = colors[(r * cols + c) % colors.length];

                // Desk
                sg.fillStyle(0xC4A882);
                sg.fillRoundedRect(x - 18, y + 8, 36, 16, 3);
                sg.lineStyle(1, 0xA0785A, 0.5);
                sg.strokeRoundedRect(x - 18, y + 8, 36, 16, 3);

                // Body
                sg.fillStyle(color);
                sg.fillRoundedRect(x - 8, y - 2, 16, 14, 3);

                // Head
                sg.fillStyle(0xF5CBA7);
                sg.fillCircle(x, y - 8, 7);

                // Hair (varied)
                const hairColors = [0x4A3728, 0x2C1810, 0x8B6914, 0x1A1A1A, 0xD4956B];
                sg.fillStyle(hairColors[(r * cols + c) % hairColors.length]);
                sg.fillEllipse(x, y - 13, 12, 5);

                this.classroomGroup.add(sg);
            }
        }
    }

    drawPortrait() {
        const C = BloomGame.COLORS;
        const px = 160, py = 260;
        this.portrait.clear();

        // Only show for speaker lines with Mr. Bloom
        // Drawn each time a line changes
    }

    updatePortrait(speaker) {
        this.portrait.clear();
        if (!speaker) return;

        const px = 90, py = 160;
        const g = this.portrait;

        if (speaker === 'Mr. Bloom') {
            // Simple portrait
            g.fillStyle(0x264653, 0.6);
            g.fillCircle(px, py, 30);
            g.fillStyle(BloomGame.COLORS.TEACHER);
            g.fillRoundedRect(px - 12, py - 5, 24, 28, 4);
            g.fillStyle(0xF5CBA7);
            g.fillCircle(px, py - 12, 11);
            g.fillStyle(0x4A3728);
            g.fillEllipse(px, py - 20, 18, 8);
            g.fillStyle(BloomGame.COLORS.ACCENT);
            g.fillTriangle(px - 2, py - 3, px + 2, py - 3, px, py + 8);
        } else if (speaker === 'Mr. Puentedura') {
            g.fillStyle(0x264653, 0.6);
            g.fillCircle(px, py, 30);
            g.fillStyle(0x9B59B6);
            g.fillRoundedRect(px - 12, py - 5, 24, 28, 4);
            g.fillStyle(0xD2956B);
            g.fillCircle(px, py - 12, 11);
            g.fillStyle(0x2C1810);
            g.fillEllipse(px, py - 18, 20, 10);
        } else if (speaker === 'Student') {
            g.fillStyle(0x264653, 0.6);
            g.fillCircle(px, py, 30);
            g.fillStyle(0xFFB3BA);
            g.fillRoundedRect(px - 10, py - 3, 20, 22, 4);
            g.fillStyle(0xF5CBA7);
            g.fillCircle(px, py - 10, 9);
            g.fillStyle(0x8B6914);
            g.fillEllipse(px, py - 16, 16, 7);
        }
    }

    showLine() {
        if (this.currentLine >= this.lines.length) {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start(this.nextScene, this.nextData);
            });
            return;
        }

        const line = this.lines[this.currentLine];

        // Toggle classroom backdrop
        if (line.scene === 'classroom') {
            this.classroomGroup.setVisible(true);
            this.cameras.main.setBackgroundColor(0xF5F0E8);
        } else {
            this.classroomGroup.setVisible(false);
            const data = BloomGame.NarrativeData[this.narrativeKey];
            this.cameras.main.setBackgroundColor(data.background || 0x264653);
        }

        this.speakerText.setText(line.speaker || '');
        // Hide speaker portrait when classroom backdrop is showing (teacher is already in the scene)
        if (line.scene === 'classroom') {
            this.portrait.clear();
        } else {
            this.updatePortrait(line.speaker);
        }
        this.fullText = line.text;
        this.displayedText = '';
        this.charIndex = 0;
        this.isTyping = true;
        this.dialogText.setText('');
        this.continueText.setVisible(false);

        this.startTypewriter();
    }

    startTypewriter() {
        if (this.typeTimer) this.typeTimer.destroy();

        this.typeTimer = this.time.addEvent({
            delay: 28,
            callback: () => {
                if (this.charIndex < this.fullText.length) {
                    const char = this.fullText[this.charIndex];
                    this.displayedText += char;
                    this.dialogText.setText(this.displayedText);
                    this.charIndex++;

                    // Punctuation pauses
                    if (char === '.' || char === '!' || char === '?') {
                        this.typeTimer.delay = 150;
                    } else if (char === ',') {
                        this.typeTimer.delay = 80;
                    } else if (char === '-' || char === ':') {
                        this.typeTimer.delay = 60;
                    } else {
                        this.typeTimer.delay = 28;
                    }
                } else {
                    this.isTyping = false;
                    this.typeTimer.destroy();
                    this.typeTimer = null;
                    this.continueText.setVisible(true);
                }
            },
            loop: true,
        });
    }

    advance() {
        if (this.isTyping) {
            // Skip to full text
            if (this.typeTimer) this.typeTimer.destroy();
            this.typeTimer = null;
            this.displayedText = this.fullText;
            this.dialogText.setText(this.displayedText);
            this.isTyping = false;
            this.continueText.setVisible(true);
        } else {
            this.currentLine++;
            this.showLine();
        }
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.advance();
        }
    }
};
