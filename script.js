// Store the current user state
let currentUserId = null;
let lastAnalysis = null;
let calorieChart = null;
let macroPieChart = null;
let lastDietPlan = null;
let bellaGreeted = false;

// Helper to auto-open chat
function openChat() {
    const chatWindow = document.getElementById("chat-window");
    if (chatWindow && chatWindow.style.display !== "flex") {
        chatWindow.style.display = "flex";
    }
}

function updateMacroPieChart(data) {
    const ctx = document.getElementById("macroPieChart");
    if (!ctx) return;

    const chartData = {
        labels: ['Protein', 'Carbs', 'Fats'],
        datasets: [{
            data: [data.Protein, data.Carbs, data.Fats],
            backgroundColor: ['#36a2eb', '#ffce56', '#4bc0c0'],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)'
        }]
    };

    if (macroPieChart) {
        macroPieChart.data = chartData;
        macroPieChart.update();
    } else {
        macroPieChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#ffffff', font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    // Graphical Analysis Insight - Now with Bella's AI!
    const analysisDiv = document.getElementById("graphicalAnalysis");
    if (analysisDiv) {
        analysisDiv.style.display = "block";
        getBellaInterpretation(data);
    }
}

async function getBellaInterpretation(data) {
    const analysisText = document.getElementById("analysisText");
    if (!analysisText) return;

    analysisText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bella is analyzing your stats...';

    const payload = {
        message: "Can you interpret my health data (BMI, calories, macros) and give me a brief, friendly summary (2-3 sentences max) of what this means for my journey?",
        context: {
            analysis: data
        }
    };

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.reply) {
            analysisText.innerHTML = result.reply
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } else {
            analysisText.innerText = "Bella: " + (result.error || "I'm having trouble thinking right now.");
        }
    } catch (err) {
        console.error(err);
        analysisText.innerText = "Error getting Bella's interpretation.";
    }
}

function setPdfReportButton(userId) {
    currentUserId = userId;
    const btn = document.getElementById('pdfReportBtn');
    if (btn) {
        btn.style.display = userId ? 'block' : 'none';
        btn.onclick = () => window.location.href = `/download-report/${userId}`;
    }
}

function analyze() {
    let height = Number(document.getElementById("height").value);
    const heightUnit = document.getElementById("height-unit").value;
    if (heightUnit === "ft") {
        height = height * 30.48; // Convert feet to cm
    }

    let weight = Number(document.getElementById("weight").value);
    const weightUnit = document.getElementById("weight-unit").value;
    if (weightUnit === "lbs") {
        weight = weight * 0.453592; // Convert lbs to kg
    }

    const data = {
        name: document.getElementById("name").value,
        age: Number(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        height: height,
        weight: weight,
        activity: document.getElementById("activity").value,
        goal: document.getElementById("goal").value,
        diet: document.getElementById("diet").value,
        allergies: document.getElementById("allergies").value,
        mealsPerDay: document.getElementById("mealsPerDay").value
    };

    if (!data.name || !data.age || !data.gender || !data.height || !data.weight || !data.activity) {
        alert("Please fill all required personal details");
        return;
    }

    const out = document.getElementById("out");
    out.innerText = "Analyzing your body & lifestyle...";

    fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(resData => {
            if (resData.error) {
                out.innerText = "Error: " + resData.error;
                return;
            }

            // Add name to response data for chat context
            resData.name = data.name;
            lastAnalysis = resData;
            out.innerText = `BMI: ${resData.BMI}\nDaily Calories: ${resData.Calories} kcal\nProtein: ${resData.Protein} g\nCarbs: ${resData.Carbs} g\nFats: ${resData.Fats} g\nWater Intake: ${resData.Water} ml/day`;

            loadWeeklyChart();
            updateMacroPieChart(resData);
            setPdfReportButton("latest");
        })
        .catch(err => {
            console.error(err);
            out.innerText = "Error analyzing data.";
        });
}

function loadWeeklyChart() {
    fetch("/weekly-data")
        .then(res => res.json())
        .then(data => {
            const chartCanvas = document.getElementById("calorieChart");
            if (!chartCanvas) return;
            const ctx = chartCanvas.getContext('2d');

            const chartConfig = {
                labels: data.labels,
                datasets: [
                    { label: "Calories", data: data.calories, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)' },
                    { label: "Protein", data: data.protein, borderColor: '#36a2eb', backgroundColor: 'rgba(54,162,235,0.1)' },
                    { label: "Carbs", data: data.carbs, borderColor: '#ffce56', backgroundColor: 'rgba(255,206,86,0.1)' },
                    { label: "Fats", data: data.fats, borderColor: '#4bc0c0', backgroundColor: 'rgba(75,192,192,0.1)' }
                ]
            };

            if (calorieChart) {
                calorieChart.data = chartConfig;
                calorieChart.update();
            } else {
                calorieChart = new Chart(ctx, {
                    type: "line",
                    data: chartConfig,
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'top' } },
                        elements: { line: { tension: 0.4, borderWidth: 2 } }
                    }
                });
            }
        })
        .catch(err => console.error("Error loading weekly chart:", err));
}

let cameraStream = null;

function toggleCamera() {
    const container = document.getElementById("cameraContainer");
    const video = document.getElementById("cameraVideo");

    if (container.style.display === "block") {
        stopCamera();
        container.style.display = "none";
    } else {
        container.style.display = "block";
        startCamera();
    }
}

async function startCamera() {
    const video = document.getElementById("cameraVideo");
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }, // Back camera for mobile
            audio: false
        });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please ensure you've given permission.");
        document.getElementById("cameraContainer").style.display = "none";
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("cameraCanvas");
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera
    stopCamera();
    document.getElementById("cameraContainer").style.display = "none";

    // Convert to blob and scan
    canvas.toBlob((blob) => {
        const file = new File([blob], "captured_food.jpg", { type: "image/jpeg" });
        scanFood(file);
    }, "image/jpeg", 0.9);
}

function scanFood(directFile = null) {
    const input = document.getElementById("foodImage");
    const file = directFile || (input ? input.files[0] : null);

    if (!file) {
        alert("Please select an image or take a photo first");
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    const resultDiv = document.getElementById("foodResult");
    resultDiv.innerHTML = `<p style="opacity:0.8;"><i class="fas fa-spinner fa-spin"></i> Analyzing image...</p>`;

    fetch("/scan-food", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                resultDiv.innerText = data.error;
                return;
            }

            let html = `<div style="overflow-x:auto;"><table><tr><th>Food</th><th>Confidence</th><th>Calories</th></tr>`;
            data.foods.forEach(f => {
                html += `<tr><td>${f.name}</td><td>${f.confidence ? (f.confidence * 100).toFixed(1) + '%' : 'N/A'}</td><td>${f.calories || 'N/A'} kcal</td></tr>`;
            });
            html += "</table></div>";

            resultDiv.innerHTML = html;

            // Bella translates the scan results into advice
            interpretFoodWithBella(data.foods);

            appendMessage(
                "bella",
                "I've analyzed the food image! Check the results above. You can also ask me about these items here."
            );

        })
        .catch(err => {
            console.error(err);
            resultDiv.innerText = "Error scanning food.";
        });
}

async function interpretFoodWithBella(foods) {
    const resultDiv = document.getElementById("foodResult");
    const adviceDiv = document.createElement("div");
    adviceDiv.style.marginTop = "15px";
    adviceDiv.style.fontSize = "0.9rem";
    adviceDiv.style.borderTop = "1px solid rgba(255,255,255,0.1)";
    adviceDiv.style.paddingTop = "10px";
    adviceDiv.innerHTML = "<em>Bella is pondering these items...</em>";
    resultDiv.appendChild(adviceDiv);

    const foodList = foods.map(f => `${f.name} (${f.calories} kcal)`).join(", ");
    const payload = {
        message: `I just scanned some food: ${foodList}. Can you give me a very quick tip or insight about these items in relation to a healthy diet? (1-2 sentences)`,
        context: {
            analysis: lastAnalysis || {}
        }
    };

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.reply) {
            adviceDiv.innerHTML = `<strong>Bella's Tip:</strong> ${result.reply}`;
        } else {
            adviceDiv.remove();
        }
    } catch (err) {
        console.error(err);
        adviceDiv.remove();
    }
}

function getAIDiet() {
    if (!lastAnalysis) {
        alert("Please analyze your profile first!");
        return;
    }

    const btn = document.getElementById("dietBtn");
    const resultDiv = document.getElementById("aiDietResult");

    btn.disabled = true;
    const oldText = btn.innerHTML;
    btn.innerText = "Generating Plan...";
    resultDiv.style.display = "block";
    resultDiv.innerText = "AI is crafting your personalized diet plan...";

    const payload = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        height: document.getElementById("height").value,
        weight: document.getElementById("weight").value,
        goal: document.getElementById("goal").value,
        diet: document.getElementById("diet").value,
        allergies: document.getElementById("allergies").value,
        mealsPerDay: document.getElementById("mealsPerDay").value,
        bmi: lastAnalysis.BMI,
        calories: lastAnalysis.Calories
    };

    fetch("/diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                resultDiv.innerText = "Error: " + data.error;
            } else {
                // 1. Build Personal Summary Header
                let tableHtml = `
                    <div style="background:rgba(108, 99, 255, 0.05); border-radius:15px; padding:20px; margin-bottom:30px; border:1px solid rgba(108, 99, 255, 0.15);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin:0; color:#81D8D0;"><i class="fas fa-user-circle"></i> Patient Profile</h4>
                            <span style="font-size:0.8rem; opacity:0.7; color:var(--text);">Generated for: <strong style="color:#81D8D0;">${payload.name}</strong></span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:15px; margin-top:15px; font-size:0.85rem;">
                            <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; text-align:center; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="opacity:0.6; font-size:0.7rem; color:var(--text);">Target</div>
                                <div style="font-weight:700; color:#ff6384;">${payload.calories} kcal</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; text-align:center; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="opacity:0.6; font-size:0.7rem; color:var(--text);">BMI</div>
                                <div style="font-weight:700; color:#4bc0c0;">${payload.bmi}</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; text-align:center; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="opacity:0.6; font-size:0.7rem; color:var(--text);">Diet</div>
                                <div style="font-weight:700; color:#ffce56;">${payload.diet}</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; text-align:center; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="opacity:0.6; font-size:0.7rem; color:var(--text);">Goal</div>
                                <div style="font-weight:700; color:#a29bfe;">${payload.goal.toUpperCase()}</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <h4 style="color:#6c63ff; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-calendar-alt"></i> Daily Meal Schedule
                        </h4>
                        <table style="width:100%; border-collapse:collapse; background:rgba(129,216,208,0.02); border-radius:12px; overflow:hidden; font-size:0.9rem; border: 1px solid var(--glass-border);">
                            <thead>
                                <tr style="background:rgba(108, 99, 255, 0.1); color:#81D8D0;">
                                    <th style="padding:12px; text-align:left; border-bottom: 2px solid var(--glass-border);">Time</th>
                                    <th style="padding:12px; text-align:left; border-bottom: 2px solid var(--glass-border);">Meal</th>
                                    <th style="padding:12px; text-align:right; border-bottom: 2px solid var(--glass-border);">Calories</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                data.meals.forEach(m => {
                    tableHtml += `
                        <tr style="border-bottom: 1px solid rgba(129,216,208,0.05); color:var(--text);">
                            <td style="padding:12px; font-weight:600; color:#81D8D0;">${m.time}</td>
                            <td style="padding:12px;">
                                <div style="font-weight:600;">${m.item}</div>
                                <div style="font-size:0.75rem; opacity:0.6; color:#a29bfe;">${m.macros}</div>
                            </td>
                            <td style="padding:12px; text-align:right; font-weight:700; color:#ff6384;">${m.calories}</td>
                        </tr>
                    `;
                });

                tableHtml += `</tbody></table></div>`;

                // 2. Add Tips
                tableHtml += `<div style="margin-top:20px;">
                    <h4 style="color:#4bc0c0; margin-bottom:10px;"><i class="fas fa-lightbulb"></i> Quick Tips</h4>
                    <ul style="padding-left:20px; opacity:0.9; font-size:0.9rem;">
                        ${data.tips.map(tip => `<li style="margin-bottom:5px;">${tip}</li>`).join('')}
                    </ul>
                </div>`;

                resultDiv.innerHTML = tableHtml;

                // 3. Store for chat context & Send Detailed Bella advice
                lastDietPlan = JSON.stringify(data.meals);
                sendDetailedBellaAdvice(data.health_insights);
            }
        })
        .catch(err => {
            resultDiv.innerText = "Failed to fetch AI diet plan.";
            console.error(err);
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = oldText;
        });
}

function sendDetailedBellaAdvice(insights) {
    appendMessage("bella", "<strong>Detailed Health Interpretation:</strong><br>" + insights);
    appendMessage("bella", "I've structured your daily meal plan into a clean table on the dashboard. This plan is specifically optimized based on your BMI and calorie targets. How do you feel about these suggestions? I'm here if you need to swap any ingredients or want to know more about the nutritional benefits! 😊");

    // Automatically open chat window when advice is sent
    const chatWindow = document.getElementById("chat-window");
    if (chatWindow && chatWindow.style.display !== "flex") {
        chatWindow.style.display = "flex";
    }
}

function toggleTheme() {
    const body = document.body;
    const icon = document.querySelector('.theme-toggle i');
    body.classList.toggle('light-mode');
    if (body.classList.contains('light-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
    }
}

// Chatbot Bella Logic: Reveal on Scroll
document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById("chat-toggle");
    const chatWindow = document.getElementById("chat-window");

    if (chatToggle) {
        window.addEventListener('scroll', () => {
            const isScrolledDown = window.scrollY > 50 || document.documentElement.scrollTop > 50;

            if (isScrolledDown) {
                chatToggle.classList.add("visible");
            } else {
                chatToggle.classList.remove("visible");
                // Automatically close chat window when scrolling to the top
                if (chatWindow) {
                    chatWindow.style.display = "none";
                }
            }
        });
    }
});

function toggleChat() {
    const chatWindow = document.getElementById("chat-window");
    const isVisible = chatWindow.style.display === "flex";
    chatWindow.style.display = isVisible ? "none" : "flex";

    // Proactive Greeting from Bella when opened
    if (!isVisible && !bellaGreeted && lastAnalysis) {
        sendBellaGreeting();
    }
}

async function sendBellaGreeting() {
    bellaGreeted = true;
    const loadingId = "loading-greet-" + Date.now();
    appendMessage("bella", "...", loadingId);

    const payload = {
        message: "Introduce yourself briefly and ask how you can help based on my recent health analysis.",
        context: {
            analysis: lastAnalysis || {},
            dietPlan: lastDietPlan || ""
        }
    };

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (result.reply) {
            appendMessage("bella", result.reply);
        }
    } catch (err) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        console.error("Bella greeting failed", err);
    }
}

function handleChatKey(event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);
    input.value = "";

    // Show loading state
    const loadingId = "loading-" + Date.now();
    appendMessage("bella", "...", loadingId);

    const payload = {
        message: message,
        context: {
            analysis: lastAnalysis || {},
            dietPlan: lastDietPlan || "",
            weeklyStats: await getWeeklyDataForChat()
        }
    };

    async function getWeeklyDataForChat() {
        try {
            const res = await fetch("/weekly-data");
            return await res.json();
        } catch (e) { return null; }
    }

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove(); // Remove loading message

            if (data.error) {
                appendMessage("bella", "Sorry, I'm having trouble connecting: " + data.error);
            } else {
                appendMessage("bella", data.reply);
            }
        })
        .catch(err => {
            console.error(err);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            appendMessage("bella", "Something went wrong. Please try again later.");
        });
}

function appendMessage(sender, text, id = null) {
    const container = document.getElementById("chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-message`;
    if (id) msgDiv.id = id;

    // Format the AI response
    if (sender === "bella") {
        msgDiv.innerHTML = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    } else {
        msgDiv.innerText = text;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

window.onload = () => {
    loadWeeklyChart();
    autofillUserData();
    loadNamesList();
};

function toggleProfileMenu() {
    const menu = document.getElementById("profile-dropdown");
    const isVisible = menu.style.display === "block";
    menu.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
        loadNamesList();
    }
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
    const menu = document.getElementById("profile-dropdown");
    const input = document.getElementById("name");
    if (menu && !menu.contains(e.target) && !input.contains(e.target)) {
        menu.style.display = "none";
    }
});

function loadNamesList() {
    fetch("/get-names")
        .then(res => res.json())
        .then(names => {
            const container = document.getElementById("profile-list-container");
            if (!container) return;

            if (names.length === 0) {
                container.innerHTML = '<div style="font-size:0.8rem; opacity:0.5; padding:5px;">No profiles found</div>';
                return;
            }

            container.innerHTML = names.map(name => `
                <div class="profile-item">
                    <span onclick="selectProfile('${name}')">${name}</span>
                    <i class="fas fa-trash-alt del-mini-btn" onclick="deleteProfileByName('${name}', event)"></i>
                </div>
            `).join("");
        })
        .catch(err => console.error("Error loading names:", err));
}

function selectProfile(name) {
    document.getElementById("name").value = name;
    fetch(`/get-user-by-name/${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            if (data.name) {
                document.getElementById("age").value = data.age;
                document.getElementById("gender").value = data.gender;
                document.getElementById("height").value = data.height;
                document.getElementById("weight").value = data.weight;
                document.getElementById("activity").value = data.activity || "sedentary";
                document.getElementById("goal").value = data.goal;
                analyzeQuietly(data);
                document.getElementById("profile-dropdown").style.display = "none";
            }
        })
        .catch(err => console.error("Name lookup failed:", err));
}

function deleteProfileByName(name, event) {
    event.stopPropagation(); // Prevent selection when clicking delete
    if (confirm(`Delete all data for "${name}"?`)) {
        fetch(`/delete-user-by-name/${encodeURIComponent(name)}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadNamesList();
                    if (document.getElementById("name").value === name) {
                        location.reload(); // Clear UI if current profile deleted
                    }
                }
            });
    }
}

function autofillUserData() {
    fetch("/get-latest-user")
        .then(res => res.json())
        .then(data => {
            if (data.name) {
                document.getElementById("name").value = data.name;
                document.getElementById("age").value = data.age;
                document.getElementById("gender").value = data.gender;
                document.getElementById("height").value = data.height;
                document.getElementById("weight").value = data.weight;
                document.getElementById("goal").value = data.goal;

                // Also trigger a refresh of charts/lastAnalysis if data exists
                analyzeQuietly(data);
            }
        })
        .catch(err => console.error("Autofill failed:", err));
}

function analyzeQuietly(resData) {
    // Hidden analysis to restore state without alerts
    resData.Protein = resData.protein;
    resData.Carbs = resData.carbs;
    resData.Fats = resData.fats;
    resData.Water = Math.round(resData.weight * 35);
    resData.BMI = resData.bmi;
    resData.Calories = resData.calories;

    lastAnalysis = resData;
    const out = document.getElementById("out");
    if (out) {
        out.innerText = `BMI: ${resData.BMI}\nDaily Calories: ${resData.Calories} kcal\nProtein: ${resData.Protein} g\nCarbs: ${resData.Carbs} g\nFats: ${resData.Fats} g\nWater Intake: ${resData.Water} ml/day`;
    }
    updateMacroPieChart(resData);
    setPdfReportButton("latest");
}

