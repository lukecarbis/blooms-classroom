window.BloomGame = window.BloomGame || {};

BloomGame.GameOverScene = class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOver' });
    }

    init(data) {
        this.reason = data.reason || 'The class lost focus.';
        this.levelIndex = data.levelIndex || 0;
    }

    create() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;

        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.cameras.main.fadeIn(400);

        // Title
        this.add.text(W / 2, H / 2 - 80, 'Class Dismissed', {
            fontSize: '36px',
            fontFamily: 'Georgia, serif',
            color: '#E63946',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Reason
        this.add.text(W / 2, H / 2 - 30, this.reason, {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            wordWrap: { width: 500 },
            align: 'center',
        }).setOrigin(0.5);

        // Encouragement
        const encouragements = [
            '"Every expert was once a beginner." -- Helen Hayes',
            '"Teaching is the greatest act of optimism." -- Colleen Wilcox',
            '"The beautiful thing about learning is that nobody can take it away from you."',
            '"It does not matter how slowly you go as long as you do not stop." -- Confucius',
        ];
        this.add.text(W / 2, H / 2 + 30, encouragements[Math.floor(Math.random() * encouragements.length)], {
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: '#E9C46A',
            fontStyle: 'italic',
            wordWrap: { width: 500 },
            align: 'center',
        }).setOrigin(0.5);

        // Retry button
        const btnY = H / 2 + 90;
        const btn = this.add.graphics();
        btn.fillStyle(0x2A9D8F);
        btn.fillRoundedRect(W / 2 - 80, btnY, 160, 44, 8);

        this.add.text(W / 2, btnY + 22, 'Try Again', {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
        }).setOrigin(0.5);

        const btnZone = this.add.zone(W / 2, btnY + 22, 160, 44).setInteractive({ useHandCursor: true });
        btnZone.on('pointerover', () => {
            btn.clear();
            btn.fillStyle(0x1E7268);
            btn.fillRoundedRect(W / 2 - 80, btnY, 160, 44, 8);
        });
        btnZone.on('pointerout', () => {
            btn.clear();
            btn.fillStyle(0x2A9D8F);
            btn.fillRoundedRect(W / 2 - 80, btnY, 160, 44, 8);
        });
        btnZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(300, () => {
                const cfg = BloomGame.LevelConfig[this.levelIndex];
                this.scene.start('Narrative', {
                    key: cfg.introKey,
                    nextScene: 'Classroom',
                    nextData: { level: this.levelIndex },
                });
            });
        });

        // Menu button
        const menuY = btnY + 60;
        this.add.text(W / 2, menuY, '[ Return to Menu ]', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', function() { this.setColor('#F5F0E8'); })
        .on('pointerout', function() { this.setColor('#888888'); })
        .on('pointerdown', () => {
            this.scene.start('Menu');
        });
    }
};
