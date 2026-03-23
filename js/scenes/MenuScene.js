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
        const startY = 240;
        levels.forEach((level, i) => {
            const barWidth = 120 + i * 30;
            const gfx = this.add.graphics();
            const color = Phaser.Display.Color.HexStringToColor(colors[i]).color;
            gfx.fillStyle(color, 0.3);
            gfx.fillRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);
            gfx.lineStyle(1, color, 0.6);
            gfx.strokeRoundedRect(W / 2 - barWidth / 2, startY + i * 28, barWidth, 22, 4);

            this.add.text(W / 2, startY + i * 28 + 11, level, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: colors[i],
            }).setOrigin(0.5);
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
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        this.add.text(W / 2, H - 20, 'A game about Bloom\'s Taxonomy and finding meaning in teaching', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#666666',
        }).setOrigin(0.5);

        this.cameras.main.fadeIn(800, 0, 0, 0);
    }
};
