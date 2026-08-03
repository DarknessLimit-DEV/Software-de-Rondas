import { state } from './state.js';
import { 
    elCameraTimerDisplay, elCameraTimerMain, elCameraCountdownCard, 
    elCameraTargetDesc, elCameraEnabledCheckbox, elCameraIntervalInput, 
    elCameraAlertBanner, elCameraGraceTimer, elBtnCameraDemo, elSettingsModal
} from './dom.js';
import { initAudio, startCameraAlertSound, stopCameraAlertSound } from './audio.js';

export function resetCameraTimer() {
    state.cameraSecondsLeft = state.cameraIntervalMins * 60;
    state.cameraTargetTime = Date.now() + state.cameraSecondsLeft * 1000;
    updateCameraTimerDisplay();
}

export function updateCameraTimerDisplay() {
    if (!state.cameraEnabled) {
        elCameraTimerDisplay.textContent = 'DESACTIVADO';
        elCameraTimerDisplay.classList.add('disabled');
        
        elCameraTimerMain.textContent = 'DESACTIVADO';
        elCameraCountdownCard.className = 'countdown-card camera-card disabled';
        elCameraTargetDesc.textContent = 'Monitoreo inactivo';
        return;
    }

    elCameraTimerDisplay.classList.remove('disabled');
    elCameraCountdownCard.className = 'countdown-card camera-card active';
    
    const mins = String(Math.floor(state.cameraSecondsLeft / 60)).padStart(2, '0');
    const secs = String(state.cameraSecondsLeft % 60).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;
    
    elCameraTimerDisplay.textContent = timeStr;
    elCameraTimerMain.textContent = timeStr;
    elCameraTargetDesc.textContent = `Intervalo: ${state.cameraIntervalMins} min.`;
}

export function handleCameraToggle() {
    state.cameraEnabled = elCameraEnabledCheckbox.checked;
    if (!state.cameraEnabled) {
        if (state.isCameraAlertActive) {
            dismissCameraAlert();
        }
        updateCameraTimerDisplay();
    } else {
        resetCameraTimer();
    }
}

export function handleCameraIntervalChange() {
    let val = parseInt(elCameraIntervalInput.value);
    if (isNaN(val) || val <= 0) {
        val = 15;
    }
    state.cameraIntervalMins = val;
    resetCameraTimer();
}

export function handleCameraTimerLogic() {
    if (!state.cameraEnabled) return;

    if (state.isCameraAlertActive) {
        const now = Date.now();
        const diffMs = state.cameraAlertTargetTime - now;
        if (diffMs > 0) {
            state.cameraAlertSecondsLeft = Math.ceil(diffMs / 1000);
            elCameraGraceTimer.textContent = state.cameraAlertSecondsLeft;
        } else {
            state.cameraAlertSecondsLeft = 0;
            elCameraGraceTimer.textContent = '0';
            dismissCameraAlert();
        }
    } else {
        const now = Date.now();
        const diffMs = state.cameraTargetTime - now;
        if (diffMs > 0) {
            state.cameraSecondsLeft = Math.ceil(diffMs / 1000);
            updateCameraTimerDisplay();
        } else {
            state.cameraSecondsLeft = 0;
            updateCameraTimerDisplay();
            triggerCameraAlert();
        }
    }
}

export function triggerCameraAlert() {
    state.isCameraAlertActive = true;
    state.cameraAlertSecondsLeft = 18;
    state.cameraAlertTargetTime = Date.now() + 18 * 1000;
    elCameraGraceTimer.textContent = state.cameraAlertSecondsLeft;
    
    elCameraAlertBanner.classList.remove('hidden');
    
    startCameraAlertSound();
}

export function dismissCameraAlert() {
    state.isCameraAlertActive = false;
    
    elCameraAlertBanner.classList.add('hidden');
    
    stopCameraAlertSound();
    
    resetCameraTimer();
}

export function activateCameraDemoMode() {
    initAudio();
    if (state.isCameraAlertActive) {
        dismissCameraAlert();
    }

    // Cerrar modal de ajustes para que se pueda ver la alerta superior
    if (elSettingsModal) {
        elSettingsModal.classList.add('hidden');
    }
    
    state.cameraEnabled = true;
    elCameraEnabledCheckbox.checked = true;
    elCameraTimerDisplay.classList.remove('disabled');
    
    state.cameraSecondsLeft = 5;
    state.cameraTargetTime = Date.now() + 5000;
    updateCameraTimerDisplay();
    
    const originalText = elBtnCameraDemo.innerHTML;
    elBtnCameraDemo.disabled = true;
    elBtnCameraDemo.innerHTML = 'Programada (5s)...';
    
    setTimeout(() => {
        elBtnCameraDemo.disabled = false;
        elBtnCameraDemo.innerHTML = originalText;
    }, 5000);
}
