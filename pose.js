const MODEL_URL = "./my-pose-model/";
 
let model, webcam, ctx, maxPredictions;
let predicting = false;
let transitionFired = false;
let consecutiveFrames = 0;
let lastPose = "";
 
let gameState = {
    playerBullets: 0,
    enemyBullets: 0,
    round: 0,
    secondsElapsed: 0,
    timerInterval: null
};

async function initPose() {
    model = await tmPose.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    maxPredictions = model.getTotalClasses();
 
    webcam = new tmPose.Webcam(300, 225, true);
    await webcam.setup();
    await webcam.play();
 
    const canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = 300;
    canvas.height = 225;
 
    loop();
}
 
async function loop() {
    webcam.update();
    ctx.drawImage(webcam.canvas, 0, 0);
    drawLabel();
 
    if (!predicting && !transitionFired) {
        predicting = true;
        try {
            await predict();
        } finally {
            predicting = false;
        }
    }
 
    window.requestAnimationFrame(loop);
}
 
async function predict() {
    const { posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);
 
    let highestScore = 0;
    let detectedPose = "";
 
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestScore) {
            highestScore = prediction[i].probability;
            detectedPose = prediction[i].className;
        }
    }
 
    if (highestScore > 0.95 && detectedPose === lastPose) {
        consecutiveFrames++;
    } else {
        consecutiveFrames = 0;
        lastPose = detectedPose;
    }
 
    if (consecutiveFrames >= 20) {
        transitionFired = true;
        handlePose(detectedPose);
    }
}
 
function drawLabel() {
    if (!lastPose) return;
 
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 300, 28);
 
    ctx.fillStyle = "#FFCA45";
    ctx.font = "bold 13px Oswald, sans-serif";
    ctx.fillText(lastPose.toUpperCase(), 10, 18);
}

function startCountdown(onLocked) {
  document.querySelectorAll('.indicator').forEach(el => el.classList.remove('active'));

  const timings = [2000, 4000, 6000]; // when each circle turns green

  timings.forEach((delay, i) => {
    setTimeout(() => {
      document.getElementById(`ind-${i}`).classList.add('active');
    }, delay);
  });

  setTimeout(() => {
    onLocked(); 
  }, 8000);
}

function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.secondsElapsed++;
        console.log("Time:", gameState.secondsElapsed);
    }, 1000);
}

function stopTimer() {
    clearInterval(gameState.timerInterval);
}

function getEnemyMove() {
    const moves = ["Reload", "Shield", "Shoot"];
    return moves[Math.floor(Math.random() * 3)];
}

/* GAME RULES: */
function checkRound(playerMove, enemyMove) {
    gameState.round++;

    if (playerMove === "Shoot" && enemyMove === "Reload") {
        if (gameState.playerBullets > 0) {
            gameState.playerBullets--;
            return "player-wins";
        } else {
            return "player-no-bullets";
        }
    }

    if (playerMove === "Shoot" && enemyMove === "Shield") {
        if (gameState.playerBullets > 0) {
            gameState.playerBullets--;
            return "blocked";
        } else {
            return "player-no-bullets";
        }
    }

    if (playerMove === "Shoot" && enemyMove === "Shoot") {
        if (gameState.playerBullets > 0) gameState.playerBullets--;
        if (gameState.enemyBullets > 0) gameState.enemyBullets--;
        return "both-shoot";
    }

    if (playerMove === "Reload" && enemyMove === "Reload") {
        if (gameState.playerBullets < 3) gameState.playerBullets++;
        if (gameState.enemyBullets < 3) gameState.enemyBullets++;
        return "both-reload";
    }

    if (playerMove === "Reload" && enemyMove === "Shield") {
        if (gameState.playerBullets < 3) gameState.playerBullets++;
        return "reload-safe";
    }

    if (playerMove === "Reload" && enemyMove === "Shoot") {
        if (gameState.enemyBullets > 0) {
            gameState.enemyBullets--;
            return "enemy-wins";
        } else {
            return "enemy-no-bullets";
        }
    }

    if (playerMove === "Shield" && enemyMove === "Shield") {
        return "both-shield";
    }

    if (playerMove === "Shield" && enemyMove === "Reload") {
        if (gameState.enemyBullets < 3) gameState.enemyBullets++;
        return "reload-safe";
    }

    if (playerMove === "Shield" && enemyMove === "Shoot") {
        if (gameState.enemyBullets > 0) gameState.enemyBullets--;
        return "blocked";
    }
}


function reloadWeapon() {}
function activateShield() {}
function shoot() {}

/* Fix freeze screen after first round */
function startRound() {
    startCountdown(() => {
        const playerMove = lastPose;
        const enemyMove = getEnemyMove();
        const result = checkRound(playerMove, enemyMove);
        console.log("Player:", playerMove, "Enemy:", enemyMove);
        console.log("Result:", result);
        console.log("Player bullets:", gameState.playerBullets, "Enemy bullets:", gameState.enemyBullets);

        startRound(); 
    });
}