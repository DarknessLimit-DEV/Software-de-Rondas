// Lógica de la Consola de Rondas Perimetrales y Alerta de Cámaras

// ==========================================
// ESTADO DE LA APLICACIÓN
// ==========================================
let scheduledRounds = [];
let historyRounds = [];
let volume = 0.8;

// Variables de Audio (Sirena de Rondas)
let audioCtx = null;
let mainGainNode = null;
let alarmIntervalId = null;
let activeOscillators = [];

// Variables de Control de Alarma de Rondas
let isAlarmActive = false;
let currentActiveRound = null;
let graceSecondsLeft = 0;

// VARIABLES Y ESTADO DEL SISTEMA DE CÁMARAS
let cameraEnabled = true;
let cameraIntervalMins = 15;
let cameraSecondsLeft = 15 * 60; // 15 minutos en segundos por defecto
let isCameraAlertActive = false;
let cameraAlertSecondsLeft = 18;
let cameraSoundIntervalId = null;

// Elementos del DOM (Comunes y Rondas)
const elLiveTime = document.getElementById('live-time');
const elLiveDate = document.getElementById('live-date');
const elRoundTimeInput = document.getElementById('round-time-input');
const elBtnAddRound = document.getElementById('btn-add-round');
const elBtnTestSound = document.getElementById('btn-test-sound');
const elBtnTestCameraSound = document.getElementById('btn-test-camera-sound');
const elBtnDemoMode = document.getElementById('btn-demo-mode');
const elBtnCameraDemo = document.getElementById('btn-camera-demo');
const elVolumeControl = document.getElementById('volume-control');
const elVolumeValue = document.getElementById('volume-value');

const elCountdownCard = document.getElementById('countdown-card');
const elCountdownStatusText = document.getElementById('countdown-status-text');
const elCountdownTimer = document.getElementById('countdown-timer');
const elCountdownTargetTime = document.getElementById('countdown-target-time');
const elScheduledRoundsList = document.getElementById('scheduled-rounds-list');
const elHistoryList = document.getElementById('history-list');

const elAlertModal = document.getElementById('alert-modal');
const elAlertGraceTimer = document.getElementById('alert-grace-timer');
const elRoundComment = document.getElementById('round-comment');
const elBtnConfirmRound = document.getElementById('btn-confirm-round');

// Elementos del DOM (Limpieza de Historial)
const elBtnClearHistory = document.getElementById('btn-clear-history');
const elConfirmModal = document.getElementById('confirm-modal');
const elBtnConfirmClearYes = document.getElementById('btn-confirm-clear-yes');
const elBtnConfirmClearNo = document.getElementById('btn-confirm-clear-no');

// Elementos del DOM (Modal de Ajustes)
const elBtnSettingsToggle = document.getElementById('btn-settings-toggle');
const elBtnCloseSettings = document.getElementById('btn-close-settings');
const elSettingsModal = document.getElementById('settings-modal');

// Elementos del DOM (Autoprogramador Secuencial)
const elTabManual = document.getElementById('tab-manual');
const elTabAuto = document.getElementById('tab-auto');
const elSchedulerManualContent = document.getElementById('scheduler-manual-content');
const elSchedulerAutoContent = document.getElementById('scheduler-auto-content');
const elBatchStartTime = document.getElementById('batch-start-time');
const elBatchIntervalHours = document.getElementById('batch-interval-hours');
const elBatchIntervalMins = document.getElementById('batch-interval-mins');
const elBatchCount = document.getElementById('batch-count');
const elBtnGenerateBatch = document.getElementById('btn-generate-batch');

// Elementos del DOM (Cámaras)
const elCameraEnabledCheckbox = document.getElementById('camera-enabled-checkbox');
const elCameraIntervalInput = document.getElementById('camera-interval-input');
const elCameraTimerDisplay = document.getElementById('camera-timer-display');
const elCameraTimerMain = document.getElementById('camera-timer-main');
const elCameraCountdownCard = document.getElementById('camera-countdown-card');
const elCameraStatusText = document.getElementById('camera-status-text');
const elCameraAlertBanner = document.getElementById('camera-alert-banner');
const elCameraGraceTimer = document.getElementById('camera-grace-timer');

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Configurar fecha y hora inmediatamente
    updateClock();
    setInterval(updateClock, 1000);
    
    // Configurar bucle de chequeo general (corre cada segundo)
    setInterval(checkRoundsAndCountdowns, 1000);

    // Event Listeners de Controles
    elBtnAddRound.addEventListener('click', addRoundFromInput);
    elRoundTimeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addRoundFromInput();
    });
    
    elBtnTestSound.addEventListener('click', playTestSound);
    elBtnTestCameraSound.addEventListener('click', playTestCameraChime);
    elBtnDemoMode.addEventListener('click', activateDemoMode);
    elBtnCameraDemo.addEventListener('click', activateCameraDemoMode);
    
    elVolumeControl.addEventListener('input', (e) => {
        volume = parseFloat(e.target.value);
        elVolumeValue.textContent = `${Math.round(volume * 100)}%`;
        if (mainGainNode) {
            mainGainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        }
    });

    // Event Listeners del Modal de Alerta de Ronda
    elBtnConfirmRound.addEventListener('click', () => {
        confirmActiveRound(true);
    });

    // Configurar comentarios rápidos
    document.querySelectorAll('.btn-quick-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            elRoundComment.value = e.target.textContent;
        });
    });

    // Event Listeners del Monitoreo de Cámaras
    elCameraEnabledCheckbox.addEventListener('change', handleCameraToggle);
    elCameraIntervalInput.addEventListener('input', handleCameraIntervalChange);

    // Inicializar el selector de hora con la hora actual + 1 hora
    setDefaultInputTime();
    
    // Inicializar temporizador de cámaras con valor por defecto
    resetCameraTimer();

    // Cargar rondas persistidas
    loadRoundsFromLocalStorage();

    // Event listeners para limpiar historial
    elBtnClearHistory.addEventListener('click', () => {
        elConfirmModal.classList.remove('hidden');
    });

    elBtnConfirmClearNo.addEventListener('click', () => {
        elConfirmModal.classList.add('hidden');
    });

    elBtnConfirmClearYes.addEventListener('click', () => {
        historyRounds = [];
        renderHistory();
        elConfirmModal.classList.add('hidden');
    });

    // Event listeners para Modal de Ajustes
    elBtnSettingsToggle.addEventListener('click', () => {
        elSettingsModal.classList.remove('hidden');
    });

    elBtnCloseSettings.addEventListener('click', () => {
        elSettingsModal.classList.add('hidden');
    });

    // Cerrar haciendo click en el fondo del modal (overlay)
    elSettingsModal.addEventListener('click', (e) => {
        if (e.target === elSettingsModal) {
            elSettingsModal.classList.add('hidden');
        }
    });

    // Escuchadores de Pestañas (Programación)
    elTabManual.addEventListener('click', () => {
        elTabManual.classList.add('active');
        elTabAuto.classList.remove('active');
        elSchedulerManualContent.classList.remove('hidden');
        elSchedulerAutoContent.classList.add('hidden');
    });

    elTabAuto.addEventListener('click', () => {
        elTabAuto.classList.add('active');
        elTabManual.classList.remove('active');
        elSchedulerAutoContent.classList.remove('hidden');
        elSchedulerManualContent.classList.add('hidden');
        
        // Inicializar hora de inicio con la hora actual
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        elBatchStartTime.value = `${hrs}:${mins}`;
    });

    // Escuchador del Generador en Lote
    elBtnGenerateBatch.addEventListener('click', generateBatchRounds);
});

// Establece la hora por defecto en el selector
function setDefaultInputTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    elRoundTimeInput.value = `${hr}:${min}`;
}

// ==========================================
// RELOJ DIGITAL EN TIEMPO REAL
// ==========================================
function updateClock() {
    const now = new Date();
    
    // Hora formateada
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elLiveTime.textContent = `${hours}:${minutes}:${seconds}`;

    // Fecha formateada
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elLiveDate.textContent = now.toLocaleDateString('es-ES', options);
}

// ==========================================
// SINTETIZADOR DE AUDIO (Web Audio API)
// ==========================================
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mainGainNode = audioCtx.createGain();
        mainGainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        mainGainNode.connect(audioCtx.destination);
    }
    // Asegurar que el contexto no esté pausado (políticas del navegador)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Detiene osciladores de ronda activos de forma segura
function stopActiveOscillators() {
    activeOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch(e) {}
    });
    activeOscillators = [];
}

// Reproduce la sirena de alerta de ronda intermitente
function startAlarmSound() {
    initAudio();
    if (alarmIntervalId) return; // Ya está sonando

    let toggle = false;
    
    // Bucle para crear el efecto "wee-woo"
    alarmIntervalId = setInterval(() => {
        stopActiveOscillators();

        // Dos osciladores para hacer el tono más disonante (alerta)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();

        const freq1 = toggle ? 750 : 900;
        const freq2 = toggle ? 755 : 905;
        toggle = !toggle;

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(freq1, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(freq2, audioCtx.currentTime);

        const localGain = audioCtx.createGain();
        localGain.gain.setValueAtTime(volume, audioCtx.currentTime);
        localGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.55);

        osc1.connect(localGain);
        osc2.connect(localGain);
        localGain.connect(mainGainNode);

        osc1.start();
        osc2.start();

        activeOscillators.push(osc1, osc2);

        setTimeout(() => {
            try {
                osc1.stop();
                osc2.stop();
            } catch(e) {}
        }, 560);

    }, 600);
}

// Detiene la alarma de rondas
function stopAlarmSound() {
    if (alarmIntervalId) {
        clearInterval(alarmIntervalId);
        alarmIntervalId = null;
    }
    stopActiveOscillators();
}

// Reproduce un sonido corto para probar los parlantes
function playTestSound() {
    initAudio();
    stopAlarmSound(); // Detener sirenas si estaban activas
    
    const testOsc = audioCtx.createOscillator();
    const testGain = audioCtx.createGain();
    
    testOsc.type = 'sine';
    testOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
    
    testGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    testGain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.1);
    testGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
    
    testOsc.connect(testGain);
    testGain.connect(mainGainNode);
    
    testOsc.start();
    testOsc.stop(audioCtx.currentTime + 1.0);
    
    const originalText = elBtnTestSound.innerHTML;
    elBtnTestSound.disabled = true;
    elBtnTestSound.innerHTML = '¡Sonando!';
    setTimeout(() => {
        elBtnTestSound.disabled = false;
        elBtnTestSound.innerHTML = originalText;
    }, 1000);
}

// Reproduce la alerta de cámaras una sola vez para probarla
function playTestCameraChime() {
    initAudio();
    stopAlarmSound();
    stopCameraAlertSound();

    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(volume * 0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(mainGainNode);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(volume * 0.6, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(mainGainNode);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);

    const originalText = elBtnTestCameraSound.innerHTML;
    elBtnTestCameraSound.disabled = true;
    elBtnTestCameraSound.innerHTML = '¡Sonando!';
    setTimeout(() => {
        elBtnTestCameraSound.disabled = false;
        elBtnTestCameraSound.innerHTML = originalText;
    }, 1000);
}

// AUDIO DE LA ALERTA DE CÁMARAS: Timbre doble y suave (Chime)
function startCameraAlertSound() {
    initAudio();
    if (cameraSoundIntervalId) return;

    const playChime = () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // Primer Chime (Tono E5 - 659.25 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(volume * 0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(mainGainNode);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // Segundo Chime (Tono A5 - 880 Hz) 150 milisegundos después
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.15);
        gain2.gain.setValueAtTime(volume * 0.6, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(mainGainNode);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.4);
    };

    playChime(); // Sonar de inmediato
    cameraSoundIntervalId = setInterval(playChime, 2500); // Repetir cada 2.5s mientras dure la alerta
}

function stopCameraAlertSound() {
    if (cameraSoundIntervalId) {
        clearInterval(cameraSoundIntervalId);
        cameraSoundIntervalId = null;
    }
}

// ==========================================
// GESTIÓN DE COLA DE RONDAS
// ==========================================

function calculateTargetDate(timeStr) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    if (target < now) {
        target.setDate(target.getDate() + 1);
    }
    return target;
}

function addRoundFromInput() {
    const timeValue = elRoundTimeInput.value;
    if (!timeValue) return;

    const exists = scheduledRounds.some(r => r.timeStr === timeValue && !r.demo);
    if (exists) {
        alert('Esta hora de ronda ya está programada.');
        return;
    }

    const newRound = {
        id: Date.now(),
        timeStr: timeValue,
        targetTime: calculateTargetDate(timeValue),
        demo: false
    };

    scheduledRounds.push(newRound);
    sortRounds();
    renderScheduledRounds();
    initAudio();
    saveRoundsToLocalStorage();
}

function generateBatchRounds() {
    const startStr = elBatchStartTime.value;
    if (!startStr) {
        alert('Por favor, selecciona una hora de inicio.');
        return;
    }

    const intervalHours = parseInt(elBatchIntervalHours.value) || 0;
    const intervalMins = parseInt(elBatchIntervalMins.value) || 0;
    const count = parseInt(elBatchCount.value) || 0;

    if (intervalHours === 0 && intervalMins === 0) {
        alert('El intervalo entre rondas debe ser mayor a 0 minutos.');
        return;
    }

    if (count <= 0) {
        alert('La cantidad de rondas debe ser mayor a 0.');
        return;
    }

    const [startH, startM] = startStr.split(':').map(Number);
    let runningDate = new Date();
    runningDate.setHours(startH, startM, 0, 0);
    
    const now = new Date();
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i <= count; i++) {
        // Sumar el intervalo
        runningDate.setHours(runningDate.getHours() + intervalHours);
        runningDate.setMinutes(runningDate.getMinutes() + intervalMins);

        // Si la ronda calculada ya pasó con respecto a "now", se pasa para mañana
        if (runningDate < now) {
            runningDate.setDate(runningDate.getDate() + 1);
        }

        const h = String(runningDate.getHours()).padStart(2, '0');
        const m = String(runningDate.getMinutes()).padStart(2, '0');
        const timeStr = `${h}:${m}`;

        // Evitar duplicados
        const exists = scheduledRounds.some(r => r.timeStr === timeStr && !r.demo);
        if (exists) {
            skippedCount++;
            continue;
        }

        scheduledRounds.push({
            id: Date.now() + i,
            timeStr: timeStr,
            targetTime: new Date(runningDate),
            demo: false
        });
        addedCount++;
    }

    if (addedCount > 0) {
        sortRounds();
        renderScheduledRounds();
        initAudio();
        saveRoundsToLocalStorage();
    }

    // Regresar a la pestaña individual para ver la lista de rondas programadas
    elTabManual.click();

    // Notificar al usuario
    let msg = `Se agregaron ${addedCount} rondas al lote.`;
    if (skippedCount > 0) {
        msg += ` Se omitieron ${skippedCount} duplicadas por estar programadas previamente.`;
    }
    alert(msg);
}

function deleteRound(id) {
    scheduledRounds = scheduledRounds.filter(r => r.id !== id);
    sortRounds();
    renderScheduledRounds();
    saveRoundsToLocalStorage();
}

function sortRounds() {
    scheduledRounds.sort((a, b) => a.targetTime - b.targetTime);
}

function renderScheduledRounds() {
    elScheduledRoundsList.innerHTML = '';

    if (scheduledRounds.length === 0) {
        elScheduledRoundsList.innerHTML = '<li class="empty-list-msg">No hay rondas programadas para el turno.</li>';
        return;
    }

    scheduledRounds.forEach(round => {
        const li = document.createElement('li');
        li.className = `round-item ${round.demo ? 'demo-item' : ''}`;
        
        const now = new Date();
        const diffMs = round.targetTime - now;
        let diffText = '';

        if (diffMs > 0) {
            const diffSecs = Math.floor(diffMs / 1000);
            const hrs = Math.floor(diffSecs / 3600);
            const mins = Math.floor((diffSecs % 3600) / 60);
            const secs = diffSecs % 60;
            
            if (hrs > 0) {
                diffText = `en ${hrs}h ${mins}m`;
            } else if (mins > 0) {
                diffText = `en ${mins}m ${secs}s`;
            } else {
                diffText = `en ${secs}s`;
            }
        } else {
            diffText = 'Ahora';
        }

        li.innerHTML = `
            <div class="round-info">
                <span class="round-time-badge">${round.timeStr}${round.demo ? ' (Demo)' : ''}</span>
                <span class="round-countdown-text">${diffText}</span>
            </div>
            <button class="btn-delete-round" onclick="deleteRound(${round.id})" title="Cancelar ronda">
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        `;
        elScheduledRoundsList.appendChild(li);
    });
}

function saveRoundsToLocalStorage() {
    const roundsToSave = scheduledRounds.filter(r => !r.demo).map(r => ({
        id: r.id,
        timeStr: r.timeStr
    }));
    localStorage.setItem('scheduledRounds', JSON.stringify(roundsToSave));
}

function loadRoundsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('scheduledRounds');
        if (saved) {
            const parsed = JSON.parse(saved);
            scheduledRounds = parsed.map(r => ({
                id: r.id,
                timeStr: r.timeStr,
                targetTime: calculateTargetDate(r.timeStr),
                demo: false
            }));
            sortRounds();
            renderScheduledRounds();
        }
    } catch (e) {
        console.error('Error al cargar rondas de localStorage:', e);
    }
}

// ==========================================
// CHEQUEO CONTINUO (BUCLE PRINCIPAL)
// ==========================================
function checkRoundsAndCountdowns() {
    const now = new Date();
    
    // 1. Manejar lógica del temporizador de monitoreo de cámaras
    handleCameraTimerLogic();

    // Si la alarma de ronda está activa, pausamos las revisiones regulares de rondas
    if (isAlarmActive) {
        updateAlertGraceTimer();
        return;
    }

    // Manejar rondas vencidas sin disparar (por ejemplo, si el navegador estaba cerrado)
    let expiredRounds = [];
    scheduledRounds.forEach(round => {
        if (!round.demo && (now - round.targetTime) > 60000) { 
            expiredRounds.push(round);
        }
    });
    if (expiredRounds.length > 0) {
        expiredRounds.forEach(round => {
            // Eliminar de la cola
            scheduledRounds = scheduledRounds.filter(r => r.id !== round.id);
            // Registrar en el historial como omitida por inactividad del sistema
            addToHistory({
                id: Date.now(),
                scheduledTime: round.timeStr,
                completionTimeStr: now.toLocaleTimeString('es-ES'),
                status: 'omitted',
                comment: 'Ronda omitida (El sistema no estaba activo a la hora programada)'
            });
        });
        saveRoundsToLocalStorage();
    }
    
    sortRounds();

    // Comprobar disparo de alarma de ronda
    if (scheduledRounds.length > 0) {
        const nextRound = scheduledRounds[0];
        
        if (now >= nextRound.targetTime) {
            triggerRoundAlarm(nextRound);
            return;
        }
    }

    // Actualizar pantalla principal
    updateMainCountdownCard();
    renderScheduledRounds();
}

// Actualiza la tarjeta de cuenta regresiva principal
function updateMainCountdownCard() {
    if (scheduledRounds.length === 0) {
        elCountdownCard.className = 'countdown-card waiting';
        elCountdownStatusText.textContent = 'SIN RONDAS PROGRAMADAS';
        elCountdownTimer.textContent = '--:--:--';
        elCountdownTargetTime.textContent = 'Programa una hora para iniciar';
        return;
    }

    const nextRound = scheduledRounds[0];
    const now = new Date();
    const diffMs = nextRound.targetTime - now;

    if (diffMs < 0) return;

    const diffSecs = Math.floor(diffMs / 1000);
    const hrs = String(Math.floor(diffSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(diffSecs % 60).padStart(2, '0');

    elCountdownTimer.textContent = `${hrs}:${mins}:${secs}`;
    elCountdownTargetTime.textContent = `Próximo evento programado a las ${nextRound.timeStr}`;

    if (diffSecs <= 60) {
        elCountdownCard.className = 'countdown-card warning';
        elCountdownStatusText.textContent = '¡PREPARAR RONDA INMINENTE!';
    } else {
        elCountdownCard.className = 'countdown-card active';
        elCountdownStatusText.textContent = 'SISTEMA DE SEGURIDAD OPERATIVO';
    }
}

// ==========================================
// GESTIÓN DEL MONITOREO DE CÁMARAS
// ==========================================

function resetCameraTimer() {
    cameraSecondsLeft = cameraIntervalMins * 60;
    updateCameraTimerDisplay();
}

function updateCameraTimerDisplay() {
    if (!cameraEnabled) {
        // Modal de ajustes
        elCameraTimerDisplay.textContent = 'DESACTIVADO';
        elCameraTimerDisplay.classList.add('disabled');
        
        // Pantalla principal
        elCameraTimerMain.textContent = 'DESACTIVADO';
        elCameraCountdownCard.className = 'countdown-card camera-card disabled';
        document.getElementById('camera-target-desc').textContent = 'Monitoreo inactivo';
        return;
    }

    elCameraTimerDisplay.classList.remove('disabled');
    elCameraCountdownCard.className = 'countdown-card camera-card active';
    
    const mins = String(Math.floor(cameraSecondsLeft / 60)).padStart(2, '0');
    const secs = String(cameraSecondsLeft % 60).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;
    
    // Sincronizar ambos textos
    elCameraTimerDisplay.textContent = timeStr;
    elCameraTimerMain.textContent = timeStr;
    document.getElementById('camera-target-desc').textContent = `Intervalo: ${cameraIntervalMins} min.`;
}

function handleCameraToggle() {
    cameraEnabled = elCameraEnabledCheckbox.checked;
    if (!cameraEnabled) {
        // Apagar alarmas activas si se deshabilita
        if (isCameraAlertActive) {
            dismissCameraAlert();
        }
        updateCameraTimerDisplay();
    } else {
        resetCameraTimer();
    }
}

function handleCameraIntervalChange() {
    let val = parseInt(elCameraIntervalInput.value);
    if (isNaN(val) || val <= 0) {
        val = 15;
    }
    cameraIntervalMins = val;
    resetCameraTimer();
}

// Lógica ejecutada segundo a segundo en el bucle principal
function handleCameraTimerLogic() {
    if (!cameraEnabled) return;

    if (isCameraAlertActive) {
        // La alerta de cámara está en pantalla
        if (cameraAlertSecondsLeft > 0) {
            cameraAlertSecondsLeft--;
            elCameraGraceTimer.textContent = cameraAlertSecondsLeft;
        } else {
            // Expira la alerta (18 segundos terminados)
            dismissCameraAlert();
        }
    } else {
        // Cuenta regresiva normal
        if (cameraSecondsLeft > 0) {
            cameraSecondsLeft--;
            updateCameraTimerDisplay();
        } else {
            // Llegó a cero -> Disparar alerta
            triggerCameraAlert();
        }
    }
}

function triggerCameraAlert() {
    isCameraAlertActive = true;
    cameraAlertSecondsLeft = 18;
    elCameraGraceTimer.textContent = cameraAlertSecondsLeft;
    
    // Mostrar banner visual
    elCameraAlertBanner.classList.remove('hidden');
    
    // Sonar sonido diferenciado
    startCameraAlertSound();
}

function dismissCameraAlert() {
    isCameraAlertActive = false;
    
    // Ocultar banner
    elCameraAlertBanner.classList.add('hidden');
    
    // Apagar sonido
    stopCameraAlertSound();
    
    // Reiniciar cuenta regresiva para el siguiente ciclo
    resetCameraTimer();
}

// ==========================================
// DISPARO Y GESTIÓN DE LA ALERTA DE RONDAS
// ==========================================
function triggerRoundAlarm(round) {
    isAlarmActive = true;
    currentActiveRound = round;
    
    // Limpiar comentarios en modal
    elRoundComment.value = '';

    // Configurar tiempo de gracia (2 minutos para reales, 30 segundos para demos)
    graceSecondsLeft = round.demo ? 30 : 120;
    elAlertGraceTimer.textContent = graceSecondsLeft;

    // Mostrar modal
    elAlertModal.classList.remove('hidden');

    // Activar sonido sirena
    startAlarmSound();
    
    // Si la alerta de cámaras está activa, la sobreescribimos de inmediato
    if (isCameraAlertActive) {
        dismissCameraAlert();
    }
}

function updateAlertGraceTimer() {
    if (graceSecondsLeft > 0) {
        graceSecondsLeft--;
        elAlertGraceTimer.textContent = graceSecondsLeft;
        
        if (graceSecondsLeft <= 10) {
            elAlertGraceTimer.style.color = '#ff0000';
        } else {
            elAlertGraceTimer.style.color = '';
        }
    } else {
        confirmActiveRound(false, 'Ronda omitida (Límite de respuesta superado)');
    }
}

function confirmActiveRound(wasConfirmedByUser, autoStateMessage = '') {
    if (!isAlarmActive || !currentActiveRound) return;

    stopAlarmSound();
    
    const now = new Date();
    const scheduledTime = currentActiveRound.timeStr;
    const completionTimeStr = now.toLocaleTimeString('es-ES');
    
    let status = 'completed';
    let comment = elRoundComment.value.trim() || 'Sin comentarios adicionales.';
    
    if (wasConfirmedByUser) {
        const roundTimeToday = new Date(currentActiveRound.targetTime);
        const differenceSeconds = Math.floor((now - roundTimeToday) / 1000);
        
        if (differenceSeconds > 60) {
            status = 'delayed';
        } else {
            status = 'completed';
        }
    } else {
        status = 'omitted';
        comment = autoStateMessage;
    }

    if (!currentActiveRound.demo) {
        addToHistory({
            id: Date.now(),
            scheduledTime,
            completionTimeStr,
            status,
            comment
        });
    }

    // Eliminar la ronda de la cola (tanto demo como regular) tras ser procesada
    scheduledRounds = scheduledRounds.filter(r => r.id !== currentActiveRound.id);
    saveRoundsToLocalStorage();

    isAlarmActive = false;
    currentActiveRound = null;
    
    elAlertModal.classList.add('hidden');

    sortRounds();
    renderScheduledRounds();
}

// ==========================================
// HISTORIAL DEL TURNO
// ==========================================
function addToHistory(item) {
    historyRounds.unshift(item);
    renderHistory();
}

function renderHistory() {
    elHistoryList.innerHTML = '';

    if (historyRounds.length === 0) {
        elHistoryList.innerHTML = '<li class="empty-list-msg">Aún no se registran actividades de rondas.</li>';
        elBtnClearHistory.style.display = 'none';
        return;
    }

    elBtnClearHistory.style.display = 'flex';

    historyRounds.forEach(item => {
        const li = document.createElement('li');
        
        let statusClass = 'status-completed';
        let statusLabel = 'Completada';
        
        if (item.status === 'delayed') {
            statusClass = 'status-delayed';
            statusLabel = 'Atrasada';
        } else if (item.status === 'omitted') {
            statusClass = 'status-omitted';
            statusLabel = 'Omitida';
        }

        li.className = `history-item ${statusClass}`;
        li.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-time">Ronda: ${item.scheduledTime}</span>
                <span class="history-status-badge">${statusLabel}</span>
            </div>
            <div class="history-item-meta">
                Registrado a las ${item.completionTimeStr}
            </div>
            <div class="history-item-comment">
                ${item.comment}
            </div>
        `;
        elHistoryList.appendChild(li);
    });
}

// ==========================================
// MODO DEMO / SIMULACIÓN DE RONDAS
// ==========================================
function activateDemoMode() {
    initAudio();
    stopAlarmSound();

    const now = new Date();
    const demoTime = new Date(now.getTime() + 5000);
    
    const hr = String(demoTime.getHours()).padStart(2, '0');
    const min = String(demoTime.getMinutes()).padStart(2, '0');
    const sec = String(demoTime.getSeconds()).padStart(2, '0');
    const timeStr = `${hr}:${min}:${sec}`;

    const demoRound = {
        id: Date.now(),
        timeStr: timeStr,
        targetTime: demoTime,
        demo: true
    };

    scheduledRounds.push(demoRound);
    sortRounds();
    renderScheduledRounds();
    
    const originalText = elBtnDemoMode.innerHTML;
    elBtnDemoMode.disabled = true;
    elBtnDemoMode.innerHTML = 'Programada (5s)...';
    
    setTimeout(() => {
        elBtnDemoMode.disabled = false;
        elBtnDemoMode.innerHTML = originalText;
    }, 5000);
}

function activateCameraDemoMode() {
    initAudio();
    if (isCameraAlertActive) {
        dismissCameraAlert();
    }
    
    // Asegurar que las cámaras estén habilitadas
    cameraEnabled = true;
    elCameraEnabledCheckbox.checked = true;
    elCameraTimerDisplay.classList.remove('disabled');
    
    // Forzar a 5 segundos
    cameraSecondsLeft = 5;
    updateCameraTimerDisplay();
    
    // Feedback visual en el botón
    const originalText = elBtnCameraDemo.innerHTML;
    elBtnCameraDemo.disabled = true;
    elBtnCameraDemo.innerHTML = 'Programada (5s)...';
    
    setTimeout(() => {
        elBtnCameraDemo.disabled = false;
        elBtnCameraDemo.innerHTML = originalText;
    }, 5000);
}
