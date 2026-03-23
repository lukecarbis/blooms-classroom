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
        this.add.text(W / 2, 120, "BLOOM'S CLASSROOM", {
            fontSize: '42px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(W / 2, 175, 'A Teaching Journey', {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#E9C46A',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Taxonomy display
        const levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Synthesize', 'Evaluate'];
        const colors = ['#2A9D8F', '#27AE60', '#E9C46A', '#E76F51', '#9B59B6', '#E63946'];
        // Map taxonomy tiers to level indices (1:1)
        const tierToLevels = [0, 1, 2, 3, 4, 5];
        const startY = 240;
        this.levelButtons = [];
        levels.forEach((level, i) => {
            const barWidth = 120 + i * 30;
            const gfx = this.add.graphics();
            const color = Phaser.Display.Color.HexStringToColor(colors[i]).color;
            gfx.fillStyle(color, 0.3);
            gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            gfx.lineStyle(1, color, 0.6);
            gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);

            const text = this.add.text(W / 2, startY + i * 28 + 11, level, {
                fontSize: '13px',
                fontFamily: '"Press Start 2P", monospace',
                color: colors[i],
            }).setOrigin(0.5);

            // Clickable zone (hidden until cheat activated)
            const zone = this.add.zone(W / 2, startY + i * 28 + 11, barWidth, 22).setInteractive({ useHandCursor: true });
            zone.input.enabled = false; // disabled until cheat
            zone.on('pointerover', () => {
                if (!this.cheatActive) return;
                gfx.clear();
                gfx.fillStyle(color, 0.6);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(2, color, 1);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            });
            zone.on('pointerout', () => {
                gfx.clear();
                gfx.fillStyle(color, 0.3);
                gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
                gfx.lineStyle(1, color, 0.6);
                gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            });
            zone.on('pointerdown', () => {
                if (!this.cheatActive) return;
                const levelIndex = tierToLevels[i];
                const cfg = BloomGame.LevelConfig[levelIndex];
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('Narrative', {
                        key: cfg.introKey,
                        nextScene: 'Classroom',
                        nextData: { level: levelIndex },
                    });
                });
            });

            this.levelButtons.push({ zone, gfx, text, color, barWidth, tierIndex: i });
        });

        // IDKFA cheat code listener
        this.cheatActive = false;
        this.cheatBuffer = '';
        this.input.keyboard.on('keydown', (event) => {
            this.cheatBuffer += event.key.toUpperCase();
            if (this.cheatBuffer.length > 10) {
                this.cheatBuffer = this.cheatBuffer.slice(-10);
            }
            if (this.cheatBuffer.includes('IDKFA') && !this.cheatActive) {
                this.activateCheat();
            }
        });

        // Start button
        const btnY = 460;
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
        this.add.text(W / 2, H - 40, 'WASD / Arrows to move | SPACE / E to interact', {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#888888',
        }).setOrigin(0.5);

        this.add.text(W / 2, H - 20, 'A game about Bloom\'s Taxonomy and finding meaning in teaching', {
            fontSize: '11px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#666666',
        }).setOrigin(0.5);

        this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    activateCheat() {
        this.cheatActive = true;

        const W = BloomGame.DIMENSIONS.WIDTH;

        // Enable all level buttons
        this.levelButtons.forEach(btn => {
            btn.zone.input.enabled = true;
        });

        // Brief flash to confirm cheat activated
        const flash = this.add.text(W / 2, 200, 'Level Select Unlocked', {
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
};
