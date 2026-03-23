window.BloomGame = window.BloomGame || {};

BloomGame.Teacher = class Teacher extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        this.speed = 160;
        this.isChannelling = false;
        this.channelProgress = 0;
        this.channelDuration = 0;
        this.channelCallback = null;
        this.cooldowns = {};
        this.facing = 'down';

        // Body
        this.body_gfx = scene.add.graphics();
        this.drawBody();
        this.add(this.body_gfx);

        // Channel indicator
        this.channelBar = scene.add.graphics();
        this.channelBar.setVisible(false);
        this.add(this.channelBar);

        // Aura for AoE
        this.aura = scene.add.graphics();
        this.aura.setVisible(false);
        this.add(this.aura);

        // Name label
        this.label = scene.add.text(0, 22, 'Mr. T', {
            fontSize: '9px',
            fontFamily: 'monospace',
            color: '#264653',
            backgroundColor: '#E9C46Acc',
            padding: { x: 3, y: 1 },
        }).setOrigin(0.5);
        this.add(this.label);

        // Physics
        scene.physics.add.existing(this);
        this.body.setSize(28, 28);
        this.body.setOffset(-14, -14);
        this.setDepth(10);
    }

    drawBody() {
        const g = this.body_gfx;
        const C = BloomGame.COLORS;
        g.clear();
        // Highlight ring
        g.lineStyle(2, C.ACCENT, 0.6);
        g.strokeCircle(0, 2, 20);
        // Shadow
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(0, 18, 32, 12);
        // Body (larger)
        g.fillStyle(C.TEACHER);
        g.fillRoundedRect(-12, -6, 24, 24, 5);
        // Head
        g.fillStyle(0xF5CBA7);
        g.fillCircle(0, -11, 11);
        // Hair
        g.fillStyle(0x4A3728);
        g.fillEllipse(0, -18, 20, 10);
        // Tie
        g.fillStyle(C.ACCENT);
        g.fillTriangle(-3, -4, 3, -4, 0, 8);
        // Glasses
        g.lineStyle(1, 0x4A3728, 0.8);
        g.strokeCircle(-4, -10, 3);
        g.strokeCircle(4, -10, 3);
        g.lineBetween(-1, -10, 1, -10);
    }

    drawChannelBar(progress) {
        const g = this.channelBar;
        g.clear();
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(-20, -28, 40, 6, 2);
        g.fillStyle(BloomGame.COLORS.ACCENT);
        g.fillRoundedRect(-20, -28, 40 * progress, 6, 2);
    }

    showAura(range, color) {
        this.aura.clear();
        this.aura.fillStyle(color || BloomGame.COLORS.TEACHER, 0.15);
        this.aura.fillCircle(0, 0, range);
        this.aura.lineStyle(2, color || BloomGame.COLORS.TEACHER, 0.4);
        this.aura.strokeCircle(0, 0, range);
        this.aura.setVisible(true);
    }

    hideAura() {
        this.aura.setVisible(false);
    }

    startChannel(duration, callback) {
        this.isChannelling = true;
        this.channelProgress = 0;
        this.channelDuration = duration;
        this.channelCallback = callback;
        this.channelBar.setVisible(true);
        this.body.setVelocity(0, 0);
    }

    canUseTechnique(techId) {
        return !this.cooldowns[techId] && !this.isChannelling;
    }

    startCooldown(techId, duration) {
        this.cooldowns[techId] = duration;
    }

    update(delta, cursors, wasd) {
        // Update cooldowns
        for (const key in this.cooldowns) {
            this.cooldowns[key] -= delta;
            if (this.cooldowns[key] <= 0) {
                delete this.cooldowns[key];
            }
        }

        // Channel update
        if (this.isChannelling) {
            this.channelProgress += delta;
            this.drawChannelBar(this.channelProgress / this.channelDuration);
            if (this.channelProgress >= this.channelDuration) {
                this.isChannelling = false;
                this.channelBar.setVisible(false);
                this.hideAura();
                if (this.channelCallback) this.channelCallback();
                this.channelCallback = null;
            }
            return;
        }

        // Movement
        let vx = 0, vy = 0;
        if (cursors.left.isDown || wasd.A.isDown) vx = -1;
        else if (cursors.right.isDown || wasd.D.isDown) vx = 1;
        if (cursors.up.isDown || wasd.W.isDown) vy = -1;
        else if (cursors.down.isDown || wasd.S.isDown) vy = 1;

        if (vx !== 0 || vy !== 0) {
            const len = Math.sqrt(vx * vx + vy * vy);
            this.body.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);
            if (Math.abs(vx) > Math.abs(vy)) {
                this.facing = vx > 0 ? 'right' : 'left';
            } else {
                this.facing = vy > 0 ? 'down' : 'up';
            }
        } else {
            this.body.setVelocity(0, 0);
        }
    }

    getCooldownPercent(techId) {
        if (!this.cooldowns[techId]) return 0;
        const tech = BloomGame.Techniques[techId];
        return this.cooldowns[techId] / tech.cooldown;
    }
};
