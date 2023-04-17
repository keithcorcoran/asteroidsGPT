const Matter = Phaser.Physics.Matter.Matter;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

const ASTEROID_VELOCITIES = {
    large: { min: .5, max: 1 },
    medium: { min: 1, max: 1.5 },
    small: { min: 1.5, max: 2 }
};

let isGameOver = false;


function preload() {
    this.load.image('spaceship', 'assets/ship.png');
    this.load.image('asteroid', 'assets/asteroid.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('flame', 'assets/flame.png');
    this.load.image('mediumAsteroid1', 'assets/mediumAsteroid1.png');
    this.load.image('mediumAsteroid2', 'assets/mediumAsteroid2.png');
    this.load.image('smallAsteroid1', 'assets/smallAsteroid1.png');
    this.load.image('smallAsteroid2', 'assets/smallAsteroid2.png');
    this.load.image('particle', 'assets/bullet.png');
    this.load.audio('thruster', 'assets/thrust.wav');
    this.load.audio('bulletFired', 'assets/fire.wav');
    this.load.audio('hitLarge', 'assets/hitLarge.wav');
    this.load.audio('hitMedium', 'assets/hitMedium.wav');
    this.load.audio('hitSmall', 'assets/hitSmall.wav');
}

function resize(width, height) {
    if (width === undefined) {
        width = this.sys.game.config.width;
    }
    if (height === undefined) {
        height = this.sys.game.config.height;
    }
    this.cameras.resize(width, height);

}


function create() {
    this.score = 0;
    this.scoreTextStyle = {
        fontFamily: 'AsteroidsFont',
        fontSize: '24px',
        color: '#ffffff'
    };

    this.particles = this.add.particles('particle');
    this.explosionBody = null;

    this.lives = 3;
    this.lifeShips = this.add.group();
    this.updateLivesDisplay = updateLivesDisplay.bind(this);
    this.updateLivesDisplay();

    this.thrusterSound = this.sound.add('thruster');
    this.bulletFiredSound = this.sound.add('bulletFired');
    this.hitLargeSound = this.sound.add('hitLarge');
    this.hitMediumSound = this.sound.add('hitMedium');
    this.hitSmallSound = this.sound.add('hitSmall');

    this.ship = this.matter.add.image(0, 0, 'spaceship');
    this.ship.setMass(80);
    this.ship.setFrictionAir(0.005);
    this.ship.setAngle(-90);
    this.ship.setCollisionCategory(1);


    this.flame = this.add.image(0, 0, 'flame');
    this.flame.setVisible(false);

    this.asteroids = this.add.group();

    for (let i = 0; i < 8; i++) {
        const x = Phaser.Math.Between(0, window.innerWidth);
        const y = Phaser.Math.Between(0, window.innerHeight);
        const asteroid = this.matter.add.image(x, y, 'asteroid');
        asteroid.setMass(15);
        asteroid.setFrictionAir(0);

        let randomAngle, velocityMagnitude, velocityX, velocityY;
        do {
            randomAngle = Phaser.Math.Between(0, 360);
            velocityMagnitude = Phaser.Math.Between(
                ASTEROID_VELOCITIES.large.min,
                ASTEROID_VELOCITIES.large.max
            );
            velocityX = velocityMagnitude * Math.cos(Phaser.Math.DegToRad(randomAngle));
            velocityY = velocityMagnitude * Math.sin(Phaser.Math.DegToRad(randomAngle));
        } while (velocityX === 0 && velocityY === 0);

        asteroid.setVelocity(velocityX, velocityY);

        asteroid.setCollisionCategory(2);
        asteroid.setCollidesWith([1]);
        asteroid.asteroidSize = 'large';
        this.asteroids.add(asteroid);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.bullets = this.add.group(); // Add this line

    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
        onBulletAsteroidCollision(this, bodyA, bodyB);
    });

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        game.renderer.resize(width, height);
        this.matter.world.setBounds(0, 0, width, height);
        resize.call(this, width, height);
    });

    this.resetShip = () => {
        this.ship.setPosition(-1000, -1000);
        this.ship.setVisible(false);
        this.placeShipWhenSafe();
    };

    this.placeShipWhenSafe = () => {
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;

        let isSafeToPlace = true;

        this.asteroids.getChildren().forEach((asteroid) => {
            const distance = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, centerX, centerY);
            if (distance < 150) {
                isSafeToPlace = false;
            }
        });

        if (isSafeToPlace) {
            this.ship.setPosition(centerX, centerY);
            this.ship.setVisible(true);
        } else {
            setTimeout(() => {
                this.placeShipWhenSafe();
            }, 100); // Check again in 500ms
        }
    };

    this.resetShip();

}

function updateScore(scene, points) {
    scene.score += points;
    if (scene.scoreText) {
        scene.scoreText.destroy();
    }
    scene.scoreText = scene.add.text(100, 50, scene.score, scene.scoreTextStyle);
}

function updateLivesDisplay() {
    this.lifeShips.clear(true, true);
    const initialX = 100;
    const initialY = 100;
    const padding = -20;

    for (let i = 0; i < this.lives; i++) {
        const ship = this.add.image(initialX + (i * (40 + padding)), initialY, 'spaceship');
        ship.setScale(0.5);
        ship.angle = -90;
        this.lifeShips.add(ship);
    }
};

function wrapMatterSprite(sprite, width, height) {
    const body = sprite.body;
    const newPosition = { x: body.position.x, y: body.position.y };

    if (body.position.x < 0) {
        newPosition.x = width;
    } else if (body.position.x > width) {
        newPosition.x = 0;
    }

    if (body.position.y < 0) {
        newPosition.y = height;
    } else if (body.position.y > height) {
        newPosition.y = 0;
    }

    Matter.Body.setPosition(body, newPosition);
}

function update() {
    updateScore(this, 0);
    if (!isGameOver) {
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
        fireBullet(this);
    }

    this.bullets.getChildren().forEach(bullet => {
        if (bullet.active) {
            wrapMatterSprite(bullet, window.innerWidth, window.innerHeight);
        }
    });
    const rotationSpeed = 0.05;

    if (this.ship.active) {
        wrapMatterSprite(this.ship, window.innerWidth, window.innerHeight);
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-rotationSpeed);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(rotationSpeed);
        } else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.ship.thrust(0.01);
            if (!this.thrusterSound.isPlaying) {
                this.thrusterSound.play({ loop: true });
            }
        } else {
            this.thrusterSound.stop();
        }

        const isThrusting = this.cursors.up.isDown;

        if (this.explosionBody) {
            this.particles.emitters.list[0].setPosition(this.explosionBody.position.x, this.explosionBody.position.y);
        }

        if (isThrusting) {
            this.flame.setPosition(
                this.ship.x - Math.cos(this.ship.rotation) * (this.ship.width * 0.5 + this.flame.width * 0.5 - 5),
                this.ship.y - Math.sin(this.ship.rotation) * (this.ship.height * 0.5 + this.flame.height * 0.5)
            );
            this.flame.setRotation(this.ship.rotation);
            this.flame.setVisible(true);
        } else {
            this.flame.setVisible(false);
        }
    }
    }


    this.asteroids.getChildren().forEach(asteroid => wrapMatterSprite(asteroid, window.innerWidth, window.innerHeight));
}







function fireBullet(scene) {
    scene.bulletFiredSound.play();

    const bullet = scene.matter.add.image(
        scene.ship.x + Math.cos(scene.ship.rotation) * 30,
        scene.ship.y + Math.sin(scene.ship.rotation) * 30,
        'bullet'
    );
    bullet.setMass(1);
    bullet.setFrictionAir(0);
    bullet.setVelocity(
        scene.ship.body.velocity.x + Math.cos(scene.ship.rotation) * 5,
        scene.ship.body.velocity.y + Math.sin(scene.ship.rotation) * 5
    );
    bullet.setCollisionCategory(3);
    bullet.setCollidesWith([2]);

    scene.time.delayedCall(1000, () => {
        bullet.destroy();
    });

    scene.bullets.add(bullet);
}

function onBulletAsteroidCollision(scene, bodyA, bodyB) {
    let asteroidBody;
    let bulletBody;
    let playerBody;

    if (
        bodyA.gameObject &&
        (bodyA.gameObject.texture.key === 'asteroid' ||
            bodyA.gameObject.texture.key === 'mediumAsteroid1' ||
            bodyA.gameObject.texture.key === 'mediumAsteroid2' ||
            bodyA.gameObject.texture.key === 'smallAsteroid1' ||
            bodyA.gameObject.texture.key === 'smallAsteroid2')
    ) {
        asteroidBody = bodyA;
    } else if (
        bodyB.gameObject &&
        (bodyB.gameObject.texture.key === 'asteroid' ||
            bodyB.gameObject.texture.key === 'mediumAsteroid1' ||
            bodyB.gameObject.texture.key === 'mediumAsteroid2' ||
            bodyB.gameObject.texture.key === 'smallAsteroid1' ||
            bodyB.gameObject.texture.key === 'smallAsteroid2')
    ) {
        asteroidBody = bodyB;
    }

    if (bodyA.gameObject && bodyA.gameObject.texture.key === 'bullet') {
        bulletBody = bodyA;
    } else if (bodyB.gameObject && bodyB.gameObject.texture.key === 'bullet') {
        bulletBody = bodyB;
    }

    if (bodyA.gameObject && bodyA.gameObject === scene.ship) {
        playerBody = bodyA;
    } else if (bodyB.gameObject && bodyB.gameObject === scene.ship) {
        playerBody = bodyB;
    }

    if (asteroidBody && playerBody) {
        scene.lives -= 1;
        scene.updateLivesDisplay();
        scene.hitLargeSound.play();

        const asteroidX = asteroidBody.gameObject.x;
        const asteroidY = asteroidBody.gameObject.y;
        const asteroidSize = asteroidBody.gameObject.asteroidSize;

        if (asteroidSize === 'large' || asteroidSize === 'medium') {
            for (let i = 0; i < 2; i++) {
                let newAsteroidKey;
                let newSize;
                let newMass;
                let newVelocities;

                if (asteroidSize === 'large') {
                    newAsteroidKey = i === 0 ? 'mediumAsteroid1' : 'mediumAsteroid2';
                    newSize = 'medium';
                    newMass = 7.5;
                    newVelocities = ASTEROID_VELOCITIES.medium;
                } else {
                    newAsteroidKey = i === 0 ? 'smallAsteroid1' : 'smallAsteroid2';
                    newSize = 'small';
                    newMass = 3.75;
                    newVelocities = ASTEROID_VELOCITIES.small;
                }

                const newAsteroid = scene.matter.add.image(asteroidX, asteroidY, newAsteroidKey);
                newAsteroid.setMass(newMass);
                newAsteroid.setFrictionAir(0);
                const randomAngle = Phaser.Math.Between(0, 360);
                const velocityMagnitude = Phaser.Math.Between(newVelocities.min, newVelocities.max);
                const velocityX = velocityMagnitude * Math.cos(Phaser.Math.DegToRad(randomAngle));
                const velocityY = velocityMagnitude * Math.sin(Phaser.Math.DegToRad(randomAngle));
                newAsteroid.setVelocity(velocityX, velocityY);
                newAsteroid.setCollisionCategory(2);
                newAsteroid.setCollidesWith([1]);
                newAsteroid.asteroidSize = newSize;
                scene.asteroids.add(newAsteroid);
            }
        }

        asteroidBody.gameObject.destroy();

        if (scene.lives > 0) {
            scene.resetShip();
            scene.ship.setVelocity(0, 0);
            scene.ship.setAngularVelocity(0);
        } else {
            gameOver(scene);
        }
    }

    if (asteroidBody && bulletBody) {


        const asteroidX = asteroidBody.gameObject.x;
        const asteroidY = asteroidBody.gameObject.y;

        if (asteroidBody.gameObject.asteroidSize === 'large') {
            asteroidBody.gameObject.destroy();
            scene.hitLargeSound.play();
            for (let i = 0; i < 2; i++) {
                const mediumAsteroid = scene.matter.add.image(
                    asteroidX,
                    asteroidY,
                    i === 0 ? 'mediumAsteroid1' : 'mediumAsteroid2'
                );
                mediumAsteroid.setMass(7.5);
                mediumAsteroid.setFrictionAir(0);
                const randomAngle = Phaser.Math.Between(0, 360);
                const velocityMagnitude = Phaser.Math.Between(
                    ASTEROID_VELOCITIES.medium.min,
                    ASTEROID_VELOCITIES.medium.max
                );
                const velocityX = velocityMagnitude * Math.cos(Phaser.Math.DegToRad(randomAngle));
                const velocityY = velocityMagnitude * Math.sin(Phaser.Math.DegToRad(randomAngle));
                mediumAsteroid.setVelocity(velocityX, velocityY);
                mediumAsteroid.setCollisionCategory(2);
                mediumAsteroid.setCollidesWith([1]);
                mediumAsteroid.asteroidSize = 'medium';
                scene.asteroids.add(mediumAsteroid);
                updateScore(scene, 20);
            }
        } else if (asteroidBody.gameObject.asteroidSize === 'medium') {
            asteroidBody.gameObject.destroy();
            scene.hitMediumSound.play();
            for (let i = 0; i < 2; i++) {
                const smallAsteroid = scene.matter.add.image(
                    asteroidX,
                    asteroidY,
                    i === 0 ? 'smallAsteroid1' : 'smallAsteroid2'
                );
                smallAsteroid.setMass(3.75);
                smallAsteroid.setFrictionAir(0);
                const randomAngle = Phaser.Math.Between(0, 360);
                const velocityMagnitude = Phaser.Math.Between(
                    ASTEROID_VELOCITIES.small.min,
                    ASTEROID_VELOCITIES.small.max
                );
                const velocityX = velocityMagnitude * Math.cos(Phaser.Math.DegToRad(randomAngle));
                const velocityY = velocityMagnitude * Math.sin(Phaser.Math.DegToRad(randomAngle));
                smallAsteroid.setVelocity(velocityX, velocityY);
                smallAsteroid.setCollisionCategory(2);
                smallAsteroid.setCollidesWith([1]);
                smallAsteroid.asteroidSize = 'small';
                scene.asteroids.add(smallAsteroid);
                updateScore(scene, 50);
            }
        } else if (asteroidBody.gameObject.asteroidSize === 'small') {
            scene.hitSmallSound.play();
            asteroidBody.gameObject.destroy();
            updateScore(scene, 100);
        }

        bulletBody.gameObject.destroy();
    }
}

function gameOver(scene) {
    console.log("Game Over!");
    isGameOver = true;
    scene.ship.destroy();
    scene.flame.setVisible(false);
    if (scene.thrusterSound.isPlaying) {
        scene.thrusterSound.stop();
    }

    const gameOverText = scene.add.text(window.innerWidth / 2, window.innerHeight / 2, "GAME OVER", {
        fontFamily: 'AsteroidsFont',
        fontSize: '48px',
        color: '#ffffff'
        
    });
    gameOverText.setOrigin(0.5);
    
}