const BASE = "http://127.0.0.1:5000";

/* NAVIGATION */
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/* CAMERA */
function startCamera() {
    document.getElementById("videoFeed").src = `${BASE}/video_feed`;
    document.getElementById("camStatus").innerText = "Running";
}

function stopCamera() {
    document.getElementById("videoFeed").src = "";
    document.getElementById("camStatus").innerText = "Stopped";
}

/* DATA FETCH */
async function fetchData() {
    try {
        const res = await fetch(`${BASE}/status`);
        const data = await res.json();

        document.getElementById("count").innerText = data.count;
        document.getElementById("density").innerText = data.density + "%";
        document.getElementById("growth").innerText = data.growth_rate + "%";

        const status = document.getElementById("status");

        if (data.density > 80) {
            status.innerText = "CRITICAL";
            triggerAlert();
        } else if (data.density > 50) {
            status.innerText = "HIGH";
        } else {
            status.innerText = "SAFE";
            stopAlert();
        }

        document.getElementById("heatmap").src = `${BASE}/heatmap?${Date.now()}`;

    } catch (e) {
        console.log("Error: - main.js:45", e);
    }
}

setInterval(fetchData, 2000);

/* ALERT */
let alertActive = false;

function triggerAlert() {
    if (alertActive) return;
    alertActive = true;
    document.getElementById("alertOverlay").style.display = "flex";
}

function stopAlert() {
    alertActive = false;
    document.getElementById("alertOverlay").style.display = "none";
}

function acknowledgeAlert() {
    stopAlert();
}
// run every 2 seconds
setInterval(fetchData, 2000);