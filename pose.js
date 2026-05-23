const MODEL_URL = "https://teachablemachine.withgoogle.com/models/7rnRte3ft/";

let model, webcam, ctx, maxPredictions;

async function initPose() {
    model = await tmPose.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    maxPredictions = model.getTotalClasses();

    webcam = new tmPose.Webcam(400, 400, true);
    await webcam.setup();
    await webcam.play();

    window.requestAnimationFrame(loop);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    let highestScore = 0;
    let detectedPose = "";

    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestScore) {
            highestScore = prediction[i].probability;
            detectedPose = prediction[i].className;
        }
    }

    if (highestScore > 0.8) {
        handlePose(detectedPose);
    }
}