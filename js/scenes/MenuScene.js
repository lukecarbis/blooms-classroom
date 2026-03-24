window.BloomGame = window.BloomGame || {};

BloomGame.MenuScene = class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Menu' });
    }

    create() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;
        const C = BloomGame.COLORS;

        this.cameras.main.setBackgroundColor(0x1a1a2e);

        // Title
        this.add.text(W / 2, 90, "BLOOM'S CLASSROOM", {
            fontSize: '42px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(W / 2, 145, 'A Teaching Journey', {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#E9C46A',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Get saved progress
        const maxLevel = parseInt(localStorage.getItem('bloomsMaxLevel') || '0', 10);

        // Taxonomy display
        const levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        const colors = ['#2A9D8F', '#27AE60', '#E9C46A', '#E76F51', '#9B59B6', '#E63946'];
        const startY = 210;
        this.levelButtons = [];
        this.cheatActive = false;

        levels.forEach((level, i) => {
            const barWidth = 120 + i * 30;
            const unlocked = i <= maxLevel || this.cheatActive;
            const gfx = this.add.graphics();
            const color = Phaser.Display.Color.HexStringToColor(colors[i]).color;

            if (unlocked) {
                gfx.fillStyle(color, 0.3);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(1, color, 0.6);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            } else {
                gfx.fillStyle(0x333333, 0.3);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(1, 0x555555, 0.4);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            }

            const text = this.add.text(W / 2, startY + i * 28 + 11, level, {
                fontSize: '13px',
                fontFamily: '"Press Start 2P", monospace',
                color: unlocked ? colors[i] : '#555555',
            }).setOrigin(0.5);

            // Clickable zone
            const zone = this.add.zone(W / 2, startY + i * 28 + 11, barWidth, 22).setInteractive({ useHandCursor: true });
            zone.input.enabled = unlocked;

            zone.on('pointerover', () => {
                if (!zone.input.enabled) return;
                gfx.clear();
                gfx.fillStyle(color, 0.6);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(2, color, 1);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            });
            zone.on('pointerout', () => {
                if (!zone.input.enabled) return;
                gfx.clear();
                gfx.fillStyle(color, 0.3);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(1, color, 0.6);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            });
            zone.on('pointerdown', () => {
                if (!zone.input.enabled) return;
                const cfg = BloomGame.LevelConfig[i];
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('Narrative', {
                        key: cfg.introKey,
                        nextScene: 'Classroom',
                        nextData: { level: i },
                    });
                });
            });

            this.levelButtons.push({ zone, gfx, text, color, barWidth, tierIndex: i });
        });

        // Cheat code listeners
        this.cheatBuffer = '';
        this.input.keyboard.on('keydown', (event) => {
            this.cheatBuffer += event.key.toUpperCase();
            if (this.cheatBuffer.length > 10) {
                this.cheatBuffer = this.cheatBuffer.slice(-10);
            }
            // IDKFA — unlock all levels
            if (this.cheatBuffer.includes('IDKFA') && !this.cheatActive) {
                this.activateCheat();
            }
            // RRRRR — reset progress
            if (this.cheatBuffer.includes('RRRRR')) {
                this.resetProgress();
            }
        });

        // Start button — always starts level 1
        const btnY = 420;
        const btn = this.add.graphics();
        btn.fillStyle(0x2A9D8F);
        btn.fillRoundedRect(W / 2 - 100, btnY, 200, 50, 8);

        const btnText = this.add.text(W / 2, btnY + 25, 'Begin Teaching', {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
        }).setOrigin(0.5);

        const btnZone = this.add.zone(W / 2, btnY + 25, 200, 50).setInteractive({ useHandCursor: true });
        btnZone.on('pointerover', () => {
            btn.clear();
            btn.fillStyle(0x1E7268);
            btn.fillRoundedRect(W / 2 - 100, btnY, 200, 50, 8);
        });
        btnZone.on('pointerout', () => {
            btn.clear();
            btn.fillStyle(0x2A9D8F);
            btn.fillRoundedRect(W / 2 - 100, btnY, 200, 50, 8);
        });
        btnZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('Narrative', { key: 'prologue', nextScene: 'Narrative', nextData: { key: 'level1_intro', nextScene: 'Classroom', nextData: { level: 0 } } });
            });
        });

        // Credits
        this.add.text(W / 2, H - 82, 'WASD / Arrows to move | SPACE / E to interact', {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#888888',
        }).setOrigin(0.5);

        // Hint
        this.add.text(W / 2, H - 60, 'Hint: Students concentrate better when the A/C is on!', {
            fontSize: '10px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        this.add.text(W / 2, H - 38, 'A game about Bloom\'s Taxonomy and finding meaning in teaching', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#666666',
        }).setOrigin(0.5);

        this.add.text(W / 2, H - 20, 'by Saadia Carbis', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#666666',
        }).setOrigin(0.5);

        this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    activateCheat() {
        this.cheatActive = true;

        const W = BloomGame.DIMENSIONS.WIDTH;
        const colors = ['#2A9D8F', '#27AE60', '#E9C46A', '#E76F51', '#9B59B6', '#E63946'];

        // Enable and restyle all level buttons
        this.levelButtons.forEach((btn, i) => {
            btn.zone.input.enabled = true;
            const color = Phaser.Display.Color.HexStringToColor(colors[i]).color;
            btn.gfx.clear();
            btn.gfx.fillStyle(color, 0.3);
            btn.gfx.fillRoundedRect(W / 2 - btn.barWidth / 2, 210 + i * 28, btn.barWidth, 22, 4);
            btn.gfx.lineStyle(1, color, 0.6);
            btn.gfx.strokeRoundedRect(W / 2 - btn.barWidth / 2, 210 + i * 28, btn.barWidth, 22, 4);
            btn.text.setColor(colors[i]);
        });

        // Brief flash to confirm
        const flash = this.add.text(W / 2, 170, 'All Levels Unlocked', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E9C46A',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: flash,
            alpha: 1,
            duration: 300,
            yoyo: true,
            hold: 1000,
            onComplete: () => flash.destroy(),
        });
    }

    resetProgress() {
        localStorage.removeItem('bloomsMaxLevel');
        this.cheatBuffer = '';

        const W = BloomGame.DIMENSIONS.WIDTH;
        const flash = this.add.text(W / 2, 200, 'Progress Reset', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#E63946',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: flash,
            alpha: 1,
            duration: 300,
            yoyo: true,
            hold: 1000,
            onComplete: () => {
                flash.destroy();
                // Restart menu to reflect changes
                this.scene.restart();
            },
        });
    }
};
