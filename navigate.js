const NAV_SVG_MAP = {
    "Reload": "images/reloading.svg",
    "Shield": "images/shielded.svg",
    "Shoot": "images/shooter.svg"
};

let navLastPose = "";
let navFrames = 0;

function handleNavPose(detectedPose, highestScore) {
    if (highestScore > 0.85 && detectedPose === navLastPose) {
        navFrames++;
    } else {
        navFrames = 0;
        navLastPose = detectedPose;
    }

    if (navFrames >= 20 && detectedPose === "Shoot") {
        navFrames = 0;
        navigateTo();
    }
}

function navigateTo() {
    const page = document.body.dataset.page;
    if (page === "index") window.location.href = "game.html";
    if (page === "win") window.location.href = "index.html";
    if (page === "lose") window.location.href = "index.html";
}