import { state } from './state.js';
import { 
    elCameraTimerDisplay, elCameraTimerMain, elCameraCountdownCard, 
    elCameraTargetDesc, elCameraEnabledCheckbox, elCameraIntervalInput, 
    elCameraAlertBanner, elCameraGraceTimer, elBtnCameraDemo
} from './dom.js';
import { initAudio, startCameraAlertSound, stopCameraAlertSound } from './audio.js';

export function resetCameraTimer() {
    state.cameraSecondsLeft = state.cameraIntervalMins * 60;
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
        if (state.cameraAlertSecondsLeft > 0) {
            state.cameraAlertSecondsLeft--;
            elCameraGraceTimer.textContent = state.cameraAlertSecondsLeft;
        } else {
            dismissCameraAlert();
        }
    } else {
        if (state.cameraSecondsLeft > 0) {
            state.cameraSecondsLeft--;
            updateCameraTimerDisplay();
        } else {
            triggerCameraAlert();
        }
    }
}

export function triggerCameraAlert() {
    state.isCameraAlertActive = true;
    state.cameraAlertSecondsLeft = 18;
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
    
    state.cameraEnabled = true;
    elCameraEnabledCheckbox.checked = true;
    elCameraTimerDisplay.classList.remove('disabled');
    
    state.cameraSecondsLeft = 5;
    updateCameraTimerDisplay();
    
    const originalText = elBtnCameraDemo.innerHTML;
    elBtnCameraDemo.disabled = true;
    elBtnCameraDemo.innerHTML = 'Programada (5s)...';
    
    setTimeout(() => {
        elBtnCameraDemo.disabled = false;
        elBtnCameraDemo.innerHTML = originalText;
    }, 5000);
}
