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

        // Coffee mug
        const mugGfx = this.add.graphics();
        // Mug body
        mugGfx.fillStyle(0xFFFFFF);
        mugGfx.fillRoundedRect(4, 6, 14, 16, 3);
        // Handle
        mugGfx.lineStyle(2, 0xFFFFFF, 1);
        mugGfx.beginPath();
        mugGfx.arc(18, 14, 5, -Math.PI / 2, Math.PI / 2);
        mugGfx.strokePath();
        // Steam
        mugGfx.lineStyle(1, 0xCCCCCC, 0.6);
        mugGfx.beginPath();
        mugGfx.moveTo(8, 6);
        mugGfx.lineTo(9, 2);
        mugGfx.lineTo(8, 0);
        mugGfx.strokePath();
        mugGfx.beginPath();
        mugGfx.moveTo(13, 6);
        mugGfx.lineTo(14, 2);
        mugGfx.lineTo(13, 0);
        mugGfx.strokePath();
        mugGfx.generateTexture('coffee_mug', 24, 24);
        mugGfx.destroy();

        // ICT computer
        const ictGfx = this.add.graphics();
        // Monitor
        ictGfx.fillStyle(0x333333);
        ictGfx.fillRoundedRect(2, 0, 20, 14, 2);
        // Screen
        ictGfx.fillStyle(0x4488FF);
        ictGfx.fillRoundedRect(4, 2, 16, 10, 1);
        // Screen shine
        ictGfx.fillStyle(0x66AAFF, 0.5);
        ictGfx.fillRect(5, 3, 6, 3);
        // Stand
        ictGfx.fillStyle(0x333333);
        ictGfx.fillRect(10, 14, 4, 3);
        ictGfx.fillRect(7, 17, 10, 2);
        // Keyboard
        ictGfx.fillStyle(0x555555);
        ictGfx.fillRoundedRect(3, 20, 18, 4, 1);
        ictGfx.generateTexture('ict_computer', 24, 26);
        ictGfx.destroy();
    }
};
