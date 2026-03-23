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
        this.continueText = this.add.text(W - 100, H - 55, '[ SPACE ]', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.continueText,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // Teacher portrait (simple)
        this.portrait = this.add.graphics();
        this.drawPortrait();

        // Input
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // Also allow clicking
        this.input.on('pointerdown', () => this.advance());

        // Start first line
        this.showLine();
    }

    drawPortrait() {
        const C = BloomGame.COLORS;
        const px = 160, py = 260;
        this.portrait.clear();

        // Only show for speaker lines with Mr. Thompson
        // Drawn each time a line changes
    }

    updatePortrait(speaker) {
        this.portrait.clear();
        if (!speaker) return;

        const px = 90, py = 160;
        const g = this.portrait;

        if (speaker === 'Mr. Thompson') {
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
        } else if (speaker === 'Mrs. Okafor') {
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
        this.speakerText.setText(line.speaker || '');
        this.updatePortrait(line.speaker);
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
