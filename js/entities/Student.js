window.BloomGame = window.BloomGame || {};

BloomGame.Student = class Student extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config) {
        super(scene, x, y);
        scene.add.existing(this);

        this.seatX = x;
        this.seatY = y;
        this.studentType = config.type || 'normal';
        this.studentColor = config.color || 0xFFB3BA;
        this.attention = 70 + Math.random() * 30; // Start 70-100
        this.maxAttention = 100;
        this.decayRate = config.decayRate || 4;
        this.linkedTo = null;
        this.linkPositive = false;
        this.state = 'seated'; // seated, walking, at_station, at_project, presenting
        this.stateTimer = 0;
        this.hasQuestion = false;
        this.questionTimer = 0;
        this.zoneAffinity = config.zoneAffinity || 0;
        this.index = config.index || 0;
        this.justBoosted = false;
        this.boostTimer = 0;

        // Type modifiers
        switch (this.studentType) {
            case 'eager':
                this.decayRate *= 0.7;
                this.attention = 90 + Math.random() * 10;
                break;
            case 'distracted':
                this.decayRate *= 1.4;
                this.attention = 50 + Math.random() * 30;
                break;
            case 'social':
                this.decayRate *= 1.0;
                break;
        }

        // Graphics
        this.bodyGfx = scene.add.graphics();
        this.drawBody();
        this.add(this.bodyGfx);

        // Attention bar
        this.barBg = scene.add.graphics();
        this.barFill = scene.add.graphics();
        this.add(this.barBg);
        this.add(this.barFill);
        this.drawAttentionBar();

        // Status indicators
        this.statusText = scene.add.text(12, -20, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
        });
        this.add(this.statusText);

        // Question bubble
        this.questionBubble = scene.add.graphics();
        this.questionBubble.setVisible(false);
        this.add(this.questionBubble);
        this.drawQuestionBubble();

        this.setDepth(5);
    }

    drawBody() {
        const g = this.bodyGfx;
        g.clear();

        // Shadow
        g.fillStyle(0x000000, 0.1);
        g.fillEllipse(0, 10, 20, 8);

        // Body
        g.fillStyle(this.studentColor);
        g.fillRoundedRect(-8, -2, 16, 16, 3);

        // Head
        g.fillStyle(0xF5CBA7);
        g.fillCircle(0, -6, 7);

        // Hair (varies by color)
        g.fillStyle(Phaser.Display.Color.IntegerToColor(this.studentColor).darken(40).color);
        g.fillEllipse(0, -11, 12, 6);

        // Type indicator
        if (this.studentType === 'eager') {
            g.fillStyle(BloomGame.COLORS.ATTENTION_HIGH, 0.8);
            g.fillCircle(10, -10, 3);
        } else if (this.studentType === 'distracted') {
            g.fillStyle(BloomGame.COLORS.ATTENTION_LOW, 0.8);
            g.fillCircle(10, -10, 3);
        } else if (this.studentType === 'social') {
            g.fillStyle(BloomGame.COLORS.ACCENT, 0.8);
            g.fillCircle(10, -10, 3);
        }
    }

    drawAttentionBar() {
        const w = 28, h = 4, ox = -14, oy = -22;
        this.barBg.clear();
        this.barBg.fillStyle(0x000000, 0.3);
        this.barBg.fillRoundedRect(ox, oy, w, h, 1);

        this.barFill.clear();
        const pct = this.attention / this.maxAttention;
        let color;
        if (pct > 0.65) color = BloomGame.COLORS.ATTENTION_HIGH;
        else if (pct > 0.35) color = BloomGame.COLORS.ATTENTION_MID;
        else color = BloomGame.COLORS.ATTENTION_LOW;

        this.barFill.fillStyle(color);
        this.barFill.fillRoundedRect(ox, oy, w * pct, h, 1);
    }

    drawQuestionBubble() {
        const g = this.questionBubble;
        g.clear();
        g.fillStyle(0xFFFFFF);
        g.fillRoundedRect(-12, -42, 24, 18, 6);
        g.fillTriangle(-2, -24, 4, -24, 1, -20);
        g.lineStyle(1, 0x264653, 0.8);
        g.strokeRoundedRect(-12, -42, 24, 18, 6);
    }

    showQuestion() {
        this.hasQuestion = true;
        this.questionBubble.setVisible(true);
        this.statusText.setText('?');
        this.statusText.setStyle({ color: '#264653', fontSize: '13px', fontStyle: 'bold' });
        this.statusText.setPosition(-3, -40);
    }

    hideQuestion() {
        this.hasQuestion = false;
        this.questionBubble.setVisible(false);
        this.statusText.setText('');
    }

    boostAttention(amount) {
        this.attention = Math.min(this.maxAttention, this.attention + amount);
        this.justBoosted = true;
        this.boostTimer = 500;
        this.drawAttentionBar();

        // Visual feedback
        const text = this.scene.add.text(this.x, this.y - 30, '+' + Math.round(amount), {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#2A9D8F',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy(),
        });
    }

    moveToPosition(tx, ty, callback) {
        this.state = 'walking';
        this.scene.tweens.add({
            targets: this,
            x: tx,
            y: ty,
            duration: 600,
            ease: 'Quad.easeInOut',
            onComplete: () => {
                if (callback) callback();
            },
        });
    }

    returnToSeat() {
        this.moveToPosition(this.seatX, this.seatY, () => {
            this.state = 'seated';
        });
    }

    update(delta) {
        // Boost flash timer
        if (this.justBoosted) {
            this.boostTimer -= delta;
            if (this.boostTimer <= 0) {
                this.justBoosted = false;
            }
        }

        // State timer
        if (this.state === 'at_station') {
            this.stateTimer -= delta;
            this.attention = Math.min(this.maxAttention, this.attention + 1.5 * (delta / 1000));
            if (this.stateTimer <= 0) {
                this.returnToSeat();
            }
        } else if (this.state === 'at_project') {
            this.stateTimer -= delta;
            if (this.stateTimer <= 0) {
                this.returnToSeat();
            }
        } else if (this.state === 'presenting') {
            this.stateTimer -= delta;
            // Presenter's own attention drains faster
            this.attention -= this.decayRate * 2 * (delta / 1000);
            if (this.stateTimer <= 0 || this.attention <= 10) {
                this.returnToSeat();
                this.state = 'walking'; // will become seated on arrival
            }
        } else if (this.state === 'seated') {
            // Normal attention decay
            let rate = this.decayRate;

            // Link influence
            if (this.linkedTo && !this.linkPositive) {
                const partner = this.linkedTo;
                if (partner.attention < 40) {
                    rate *= 1.3;
                }
            }
            if (this.linkedTo && this.linkPositive) {
                rate *= 0.7;
            }

            this.attention = Math.max(0, this.attention - rate * (delta / 1000));
        }

        this.drawAttentionBar();

        // Visual state
        this.updateVisualState();

        // Question timeout
        if (this.hasQuestion) {
            this.questionTimer -= delta;
            if (this.questionTimer <= 0) {
                this.hideQuestion();
                this.attention = Math.max(0, this.attention - 10);
            }
        }
    }

    updateVisualState() {
        if (this.state !== 'seated') {
            this.statusText.setText('');
            return;
        }
        if (this.hasQuestion) return;

        if (this.attention < 15) {
            this.statusText.setText('zzZ');
            this.statusText.setStyle({ color: '#E63946', fontSize: '11px', fontStyle: 'normal' });
            this.statusText.setPosition(8, -18);
            this.bodyGfx.setAlpha(0.7);
        } else if (this.attention < 40) {
            this.statusText.setText('~');
            this.statusText.setStyle({ color: '#F4A261', fontSize: '12px', fontStyle: 'normal' });
            this.statusText.setPosition(10, -14);
            this.bodyGfx.setAlpha(0.85);
        } else {
            this.statusText.setText('');
            this.bodyGfx.setAlpha(1);
        }

        if (this.justBoosted) {
            this.bodyGfx.setAlpha(1);
        }
    }
};
