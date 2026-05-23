const MODEL_URL = "./my-pose-model/";
 
let model, webcam, ctx, maxPredictions;
let predicting = false;
let transitionFired = false;
let consecutiveFrames = 0;
let lastPose = "";
 
let gameState = {
    playerBullets: 0,
    cpuBullets: 0,
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