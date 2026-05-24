const MODEL_URL = "./my-pose-model/";
 
let model, webcam, ctx, maxPredictions;
let predicting = false;
let lastPose = "";
 
let gameState = {
    playerBullets: 0,
    enemyBullets: 0,
    round: 0,
    secondsElapsed: 0,
    timerInterval: null
};

const svgMap = {
    "Reload": "images/reloading.svg",
    "Shield": "images/shielded.svg",
    "Shoot": "images/shooter.svg"
};

const enemySvgMap = {
    "Reload": "images/gotreloaded.svg",
    "Shield": "images/gotshield.svg",
    "Shoot": "images/gotshot.svg"
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
 
    if (!predicting) {
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

    console.log("Detected:", detectedPose, "Score:", highestScore);

    if (highestScore > 0.85) {
        lastPose = detectedPose;
        const playerSvg = document.getElementById("player-svg");
        if (playerSvg) {
            playerSvg.src = svgMap[lastPose];
        }
    }

    if (typeof handleNavPose === "function") {
        handleNavPose(detectedPose, highestScore);
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

  const timings = [2000, 4000, 6000];

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
        const timerDisplay = document.getElementById("timer-display");
        if (timerDisplay) timerDisplay.textContent = gameState.secondsElapsed;
    }, 1000);
}

function stopTimer() {
    clearInterval(gameState.timerInterval);
}

function getEnemyMove() {
    const moves = gameState.round === 0 ? ["Reload", "Shield"] : ["Reload", "Shield", "Shoot"];
    return moves[Math.floor(Math.random() * moves.length)];
}

/* GAME RULES: */
function checkRound(playerMove, enemyMove) {
    gameState.round++;
    const roundsDisplay = document.getElementById("rounds-display");
    if (roundsDisplay) roundsDisplay.textContent = gameState.round;

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
    document.getElementById("enemy-svg").src = "images/wait.svg";
    startCountdown(() => {
        const playerMove = lastPose;
        const enemyMove = getEnemyMove();
        
        document.getElementById("enemy-svg").src = enemySvgMap[enemyMove];
        const result = checkRound(playerMove, enemyMove);
        updateBullets();
        console.log("Player:", playerMove, "Enemy:", enemyMove);
        console.log("Result:", result);
        console.log("Player bullets:", gameState.playerBullets, "Enemy bullets:", gameState.enemyBullets);

        checkGameOver(result);

        if (result !== "player-wins" && result !== "enemy-wins" && 
            result !== "player-no-bullets" && result !== "enemy-no-bullets") {
            setTimeout(() => {
                startRound();
            }, 4000);
        }
    });
}

function checkGameOver(result) {
    if (result === "player-wins") {
        stopTimer();
        localStorage.setItem("time", gameState.secondsElapsed);
        localStorage.setItem("rounds", gameState.round);
        setTimeout(() => window.location.href = "win.html", 3000);
    }

    if (result === "enemy-wins") {
        stopTimer();
        localStorage.setItem("time", gameState.secondsElapsed);
        localStorage.setItem("rounds", gameState.round);
        setTimeout(() => window.location.href = "win.html", 3000);
    }

    if (result === "player-no-bullets") {
        stopTimer();
        localStorage.setItem("time", gameState.secondsElapsed);
        localStorage.setItem("rounds", gameState.round);
        setTimeout(() => window.location.href = "win.html", 3000);
    }

    if (result === "enemy-no-bullets") {
        stopTimer();
        localStorage.setItem("time", gameState.secondsElapsed);
        localStorage.setItem("rounds", gameState.round);
        setTimeout(() => window.location.href = "win.html", 3000);
    }
}

function updateBullets() {
    for (let i = 0; i < 3; i++) {
        const playerBullet = document.getElementById(`player-bullet-${i}`);
        const enemyBullet = document.getElementById(`enemy-bullet-${i}`);
        if (playerBullet) playerBullet.classList.toggle("inactive", i >= gameState.playerBullets);
        if (enemyBullet) enemyBullet.classList.toggle("inactive", i >= gameState.enemyBullets);
    }
}