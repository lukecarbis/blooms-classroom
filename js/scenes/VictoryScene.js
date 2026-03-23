window.BloomGame = window.BloomGame || {};

BloomGame.VictoryScene = class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Victory' });
    }

    create() {
        const W = BloomGame.DIMENSIONS.WIDTH;
        const H = BloomGame.DIMENSIONS.HEIGHT;

        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Stars/particles
        for (let i = 0; i < 50; i++) {
            const star = this.add.graphics();
            const size = 1 + Math.random() * 2;
            star.fillStyle(0xF5F0E8, 0.3 + Math.random() * 0.5);
            star.fillCircle(0, 0, size);
            star.setPosition(Math.random() * W, Math.random() * H);

            this.tweens.add({
                targets: star,
                alpha: 0.1,
                yoyo: true,
                repeat: -1,
                duration: 1000 + Math.random() * 2000,
                delay: Math.random() * 1000,
            });
        }

        // Title
        const title = this.add.text(W / 2, 140, "BLOOM'S CLASSROOM", {
            fontSize: '38px',
            fontFamily: 'Georgia, serif',
            color: '#E9C46A',
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0);

        // Bloom's pyramid
        const levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Synthesize', 'Evaluate'];
        const colors = [0x2A9D8F, 0x27AE60, 0xE9C46A, 0xE76F51, 0x9B59B6, 0xE63946];

        levels.forEach((level, i) => {
            const barWidth = 200 - i * 20;
            const y = 380 - i * 30;
            const gfx = this.add.graphics().setAlpha(0);
            gfx.fillStyle(colors[i], 0.6);
            gfx.fillRoundedRect(W / 2 - barWidth / 2, y, barWidth, 24, 4);

            const text = this.add.text(W / 2, y + 12, level, {
                fontSize: '12px',
                fontFamily: '"Press Start 2P", monospace',
                color: '#F5F0E8',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: [gfx, text],
                alpha: 1,
                duration: 600,
                delay: 500 + i * 300,
            });
        });

        // Fade in title after pyramid
        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 800,
            delay: 2800,
        });

        // Message
        const msg = this.add.text(W / 2, 440, '"The art of teaching is the art of assisting discovery."\n-- Mark Van Doren', {
            fontSize: '15px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontStyle: 'italic',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: msg,
            alpha: 1,
            duration: 800,
            delay: 3500,
        });

        // Completion text
        const complete = this.add.text(W / 2, 510, 'You guided Mr. Carbis through all six levels of Bloom\'s Taxonomy.\nThe journey of a teacher never truly ends.', {
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: '#888888',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: complete,
            alpha: 1,
            duration: 800,
            delay: 4200,
        });

        // Play again
        const again = this.add.text(W / 2, 580, '[ Play Again ]', {
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#2A9D8F',
        }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true })
        .on('pointerover', function() { this.setColor('#E9C46A'); })
        .on('pointerout', function() { this.setColor('#2A9D8F'); })
        .on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.start('Menu'));
        });

        this.tweens.add({
            targets: again,
            alpha: 1,
            duration: 800,
            delay: 5000,
        });
    }
};
