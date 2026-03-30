
const DRUG_DB = [
    { id: 'p1', name: 'Atorvastatin', color: '#FF5722', cssClass: 'bottle-orange' },
    { id: 'p2', name: 'Levothyroxine', color: '#2196F3', cssClass: 'bottle-blue' },
    { id: 'p3', name: 'Lisinopril', color: '#4CAF50', cssClass: 'bottle-green' },
    { id: 'p4', name: 'Metformin', color: '#F44336', cssClass: 'bottle-red' },
    { id: 'p5', name: 'Amlodipine', color: '#9C27B0', cssClass: 'bottle-purple' }
];

const PATIENT_NAMES = ["Gertrude", "Harold", "Timmy", "Sarah", "Agnes", "Bob"];

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Stubs for now
    }

    playPop() {
        // Simple oscillator beep for now
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.frequency.value = 800;
        g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.1);
        o.start(0);
        o.stop(this.ctx.currentTime + 0.1);
    }

    playSuccess() {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(500, this.ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        o.start();
        o.stop(this.ctx.currentTime + 0.5);
    }

    playFail() {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, this.ctx.currentTime);
        o.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        o.start();
        o.stop(this.ctx.currentTime + 0.5);
    }
}

class Patient {
    constructor(level) {
        this.name = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
        this.faceIndex = Math.floor(Math.random() * 4); // 4 faces in sprite
        this.prescriptions = this.generatePrescriptions(level);
    }

    generatePrescriptions(level) {
        // Higher level = more complex
        const numMeds = Math.min(1 + Math.floor(level / 2), 5);
        const meds = [];
        const drugPool = [...DRUG_DB];

        for (let i = 0; i < numMeds; i++) {
            const drugIdx = Math.floor(Math.random() * drugPool.length);
            const drug = drugPool.splice(drugIdx, 1)[0];

            // Random schedule: [Morning, Noon, Night] booleans
            // Ensure at least one is true
            let schedule = [false, false, false];
            while (!schedule.includes(true)) {
                schedule = [Math.random() > 0.5, Math.random() > 0.6, Math.random() > 0.5];
            }

            meds.push({
                drug: drug,
                schedule: schedule, // [Morn, Noon, Night]
                days: [true, true, true, true, true, true, true] // Everyday for now to keep simple
            });
        }
        return meds;
    }
}

class Game {
    constructor() {
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.currentPatient = null;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.isDragging = false;
        this.draggedPill = null;

        this.sound = new SoundManager();
        this.ui = {
            patientName: document.getElementById('patient-name'),
            patientImg: document.getElementById('patient-image'),
            rxList: document.getElementById('rx-list'),
            pillbox: document.getElementById('pillbox-grid'),
            timerBar: document.getElementById('timer-bar'),
            score: document.getElementById('score-val'),
            level: document.getElementById('level-val'),
            bottles: document.querySelectorAll('.pill-bottle')
        };

        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.startLevel();

        document.getElementById('done-btn').addEventListener('click', () => this.verifyPillbox());

        // Help Modal
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').classList.add('active');
        });
        document.getElementById('close-help-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').classList.remove('active');
        });

        // Modal buttons
        document.getElementById('next-level-btn').addEventListener('click', () => {
            document.getElementById('success-overlay').classList.remove('active');
            this.startLevel();
        });
        document.getElementById('restart-btn').addEventListener('click', () => location.reload());
        document.getElementById('try-again-btn').addEventListener('click', () => {
            document.getElementById('sick-overlay').classList.remove('active');
            this.startLevel();
        });
    }

    startLevel() {
        this.currentPatient = new Patient(this.level);
        this.renderPatient();
        this.clearPillbox();

        // Timer setup
        this.totalTime = Math.max(15, 60 - (this.level * 2)); // Less time as levels go up
        this.timeLeft = this.totalTime;
        this.startTimer();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.ui.timerBar.style.width = '100%';
        this.ui.timerBar.style.backgroundColor = '#4caf50';

        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            const pct = (this.timeLeft / this.totalTime) * 100;
            this.ui.timerBar.style.width = `${pct}%`;

            if (pct < 30) this.ui.timerBar.style.backgroundColor = '#f44336';
            else if (pct < 60) this.ui.timerBar.style.backgroundColor = '#ff9800';

            if (this.timeLeft <= 0) {
                this.gameOver("Time's up!");
            }
        }, 100);
    }

    renderPatient() {
        this.ui.patientName.textContent = this.currentPatient.name;

        // Sprite shift for face
        // Assuming 2x2 grid in sprite sheet for 4 faces? Or 1x4?
        // Let's assume 2x2 for now based on common sprite packing, 
        // but prompt said "set of 4". If horizontal strip: 
        // 0%, 33%, 66%, 100% position x.
        const pos = this.currentPatient.faceIndex * 33.33;
        this.ui.patientImg.style.backgroundPosition = `${pos}% 0`;

        this.ui.rxList.innerHTML = '';
        this.currentPatient.prescriptions.forEach(rx => {
            const div = document.createElement('div');
            div.className = 'prescription-item';

            const times = [];
            if (rx.schedule[0]) times.push('Morning');
            if (rx.schedule[1]) times.push('Noon');
            if (rx.schedule[2]) times.push('Night');

            div.innerHTML = `<strong>${rx.drug.name}</strong><br>Take: <span style="color:${rx.drug.color}">${times.join(', ')}</span> (Daily)`;
            this.ui.rxList.appendChild(div);
        });
    }

    clearPillbox() {
        document.querySelectorAll('.pill-slot').forEach(slot => {
            slot.innerHTML = '';
            slot.dataset.pills = JSON.stringify([]);
        });
    }

    setupDragAndDrop() {
        // Bottle Drag Start
        this.ui.bottles.forEach((bottle, index) => {
            // Apply class
            bottle.classList.add(DRUG_DB[index].cssClass);

            bottle.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.draggedPill = DRUG_DB[index];

                // Create visual proxy
                const proxy = document.createElement('div');
                proxy.className = 'drag-proxy';
                proxy.style.backgroundColor = this.draggedPill.color;
                proxy.style.left = `${e.clientX}px`;
                proxy.style.top = `${e.clientY}px`;
                proxy.id = 'drag-proxy';
                document.body.appendChild(proxy);

                this.sound.playPop();
            });
        });

        // Global Mouse Move
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const proxy = document.getElementById('drag-proxy');
            if (proxy) {
                proxy.style.left = `${e.clientX - 20}px`;
                proxy.style.top = `${e.clientY - 20}px`;

                // Highlight slots? CSS hover handles standard, but maybe radius check here if needed
            }
        });

        // Global Mouse Up (Drop)
        document.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const proxy = document.getElementById('drag-proxy');
            if (proxy) proxy.remove();

            // Check if dropped on a slot
            // We use elementFromPoint because the proxy might be blocking, but we set pointer-events: none
            const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            const slot = dropTarget.closest('.pill-slot');

            if (slot) {
                this.addPillToSlot(slot, this.draggedPill);
            }
        });

        // Right click to remove?
        document.getElementById('pillbox-container').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const slot = e.target.closest('.pill-slot');
            if (slot) {
                // Remove last pill
                const pills = JSON.parse(slot.dataset.pills || '[]');
                if (pills.length > 0) {
                    pills.pop();
                    slot.dataset.pills = JSON.stringify(pills);
                    this.renderSlot(slot, pills);
                    this.sound.playPop(); // different sound later
                }
            }
        });
    }

    addPillToSlot(slot, pill) {
        let pills = JSON.parse(slot.dataset.pills || '[]');
        pills.push(pill.id);
        slot.dataset.pills = JSON.stringify(pills);
        this.renderSlot(slot, pills);
        this.sound.playPop();
    }

    renderSlot(slot, pills) {
        slot.innerHTML = '';
        pills.forEach(pid => {
            const p = DRUG_DB.find(d => d.id === pid);
            if (p) {
                const pillDiv = document.createElement('div');
                pillDiv.className = 'pill-in-slot';
                pillDiv.style.backgroundColor = p.color;
                slot.appendChild(pillDiv);
            }
        });
    }

    verifyPillbox() {
        clearInterval(this.timerInterval);

        // Check logic
        let correct = true;
        const slots = document.querySelectorAll('.pill-slot');

        // We need 7 days * 3 times = 21 slots.
        // Assuming strict order in DOM: Day1[Morn, Noon, Night], Day2...
        // Let's verify our grid generation index logic.

        // For each day 0-6
        for (let d = 0; d < 7; d++) {
            // For each time 0-2 (0=Morn, 1=Noon, 2=Night)
            for (let t = 0; t < 3; t++) {
                const slotIndex = (t * 7) + d;
                const slot = slots[slotIndex];
                const pillsInSlot = JSON.parse(slot.dataset.pills || '[]');

                // What SHOULD be here?
                const requiredPills = this.currentPatient.prescriptions.filter(rx => rx.schedule[t] === true).map(rx => rx.drug.id);

                // Compare arrays (sort to ignore order)
                pillsInSlot.sort();
                requiredPills.sort();

                if (JSON.stringify(pillsInSlot) !== JSON.stringify(requiredPills)) {
                    correct = false;
                    slot.style.backgroundColor = '#ffcdd2'; // Error highlight
                } else {
                    slot.style.backgroundColor = '#eef'; // Reset
                }
            }
        }

        if (correct) {
            this.handleWin();
        } else {
            this.handleLoss();
        }
    }

    handleWin() {
        this.score += 100 + Math.floor(this.timeLeft * 10);
        this.ui.score.textContent = this.score;
        this.level++;
        this.ui.level.textContent = this.level;
        this.sound.playSuccess();
        document.getElementById('success-overlay').classList.add('active');
        document.getElementById('success-msg').textContent = `Patient Saved! Generic brands administered correctly!`;
    }

    handleLoss() {
        this.lives--;
        this.sound.playFail();
        if (this.lives <= 0) {
            this.gameOver("You killed too many patients!");
        } else {
            // New Sick UI
            document.getElementById('sick-overlay').classList.add('active');
        }
    }

    gameOver(reason) {
        clearInterval(this.timerInterval);
        document.getElementById('fail-overlay').classList.add('active');
        document.getElementById('fail-msg').textContent = reason;
        document.getElementById('final-score').textContent = this.score;
    }
}

// Start Game
window.addEventListener('load', () => {
    // Generate Grid
    const grid = document.getElementById('pillbox-grid');
    // Header
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    grid.innerHTML += `<div class="day-header"></div>`; // Corner spacer
    days.forEach(d => grid.innerHTML += `<div class="day-header">${d}</div>`);

    const times = ['Morn', 'Noon', 'Night'];
    times.forEach((t, tIdx) => {
        grid.innerHTML += `<div class="time-label">${t}</div>`;
        for (let d = 0; d < 7; d++) {
            grid.innerHTML += `<div class="pill-slot" data-day="${d}" data-time="${tIdx}"></div>`;
        }
    });

    const game = new Game();
});
