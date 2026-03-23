window.BloomGame = window.BloomGame || {};

BloomGame.BootScene = class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Boot' });
    }

    create() {
        // Generate textures procedurally
        this.generateTextures();
        this.scene.start('Menu');
    }

    generateTextures() {
        // Desk texture
        const deskGfx = this.add.graphics();
        deskGfx.fillStyle(BloomGame.COLORS.DESK);
        deskGfx.fillRoundedRect(0, 0, 48, 36, 4);
        deskGfx.fillStyle(BloomGame.COLORS.DESK_TOP);
        deskGfx.fillRoundedRect(2, 2, 44, 22, 3);
        deskGfx.generateTexture('desk', 48, 36);
        deskGfx.destroy();

        // Station marker
        const stationGfx = this.add.graphics();
        stationGfx.fillStyle(BloomGame.COLORS.ACCENT, 0.3);
        stationGfx.fillCircle(24, 24, 24);
        stationGfx.lineStyle(2, BloomGame.COLORS.ACCENT, 0.6);
        stationGfx.strokeCircle(24, 24, 24);
        stationGfx.generateTexture('station', 48, 48);
        stationGfx.destroy();
    }
};
