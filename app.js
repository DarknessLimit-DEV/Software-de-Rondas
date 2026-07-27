import { state, saveRoundsToLocalStorage, sortRounds } from './js/state.js';
import { 
    elLiveTime, elLiveDate, elRoundTimeInput, elRoundNoteInput, elBtnAddRound, elBtnTestSound, 
    elBtnTestCameraSound, elBtnDemoMode, elBtnCameraDemo, elVolumeControl, 
    elVolumeValue, elCountdownCard, elCountdownStatusText, elCountdownTimer, 
    elCountdownTargetTime, elScheduledRoundsList, elHistoryList, elAlertModal, 
    elAlertGraceTimer, elRoundComment, elBtnConfirmRound, elBtnClearHistory, 
    elConfirmModal, elBtnConfirmClearYes, elBtnConfirmClearNo, elBtnSettingsToggle, 
    elBtnCloseSettings, elSettingsModal, elTabManual, elTabAuto, 
    elSchedulerManualContent, elSchedulerAutoContent, elBatchStartTime, 
    elBatchIntervalHours, elBatchIntervalMins, elBatchCount, elBtnGenerateBatch, 
    elCameraEnabledCheckbox, elCameraIntervalInput, elCameraTimerDisplay, 
    elCameraTimerMain, elCameraCountdownCard, elCameraStatusText, 
    elCameraAlertBanner, elCameraGraceTimer, elNotepadArea
} from './js/dom.js';
import { updateClock, setDefaultInputTime } from './js/utils.js';
import { 
    initAudio, updateVolume, playTestSound, playTestCameraChime 
} from './js/audio.js';
import { 
    addRoundFromInput, generateBatchRounds, loadRoundsFromLocalStorage, 
    renderScheduledRounds, renderHistory, clearHistory, 
    triggerRoundAlarm, updateAlertGraceTimer, confirmActiveRound, 
    updateMainCountdownCard, addToHistory, activateDemoMode
} from './js/rounds.js';
import { 
    resetCameraTimer, handleCameraToggle, handleCameraIntervalChange, 
    handleCameraTimerLogic, dismissCameraAlert, activateCameraDemoMode, 
    updateCameraTimerDisplay
} from './js/cameras.js';

// ==========================================
// CHEQUEO CONTINUO (BUCLE PRINCIPAL)
// ==========================================
function checkRoundsAndCountdowns() {
    const now = new Date();
    
    // 1. Manejar lógica del temporizador de monitoreo de cámaras
    handleCameraTimerLogic();

    // Si la alarma de ronda está activa, pausamos las revisiones regulares de rondas
    if (state.isAlarmActive) {
        updateAlertGraceTimer();
        return;
    }

    // Manejar rondas vencidas sin disparar (por ejemplo, si el navegador estaba cerrado)
    let expiredRounds = [];
    state.scheduledRounds.forEach(round => {
        if (!round.demo && (now - round.targetTime) > 60000) { 
            expiredRounds.push(round);
        }
    });
    
    if (expiredRounds.length > 0) {
        expiredRounds.forEach(round => {
            state.scheduledRounds = state.scheduledRounds.filter(r => r.id !== round.id);
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
    if (state.scheduledRounds.length > 0) {
        const nextRound = state.scheduledRounds[0];
        
        if (now >= nextRound.targetTime) {
            triggerRoundAlarm(nextRound);
            return;
        }
    }

    // Actualizar pantalla principal
    updateMainCountdownCard();
    renderScheduledRounds();
}

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
        const vol = parseFloat(e.target.value);
        elVolumeValue.textContent = `${Math.round(vol * 100)}%`;
        updateVolume(vol);
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

    // Cargar anotaciones de turno (Bloc de Notas)
    const savedNotepad = localStorage.getItem('notepadText');
    if (savedNotepad) {
        state.notepadText = savedNotepad;
        elNotepadArea.value = savedNotepad;
    }

    // Auto-guardado del Bloc de Notas
    elNotepadArea.addEventListener('input', (e) => {
        state.notepadText = e.target.value;
        localStorage.setItem('notepadText', state.notepadText);
    });

    // Event listeners para limpiar historial
    elBtnClearHistory.addEventListener('click', () => {
        elConfirmModal.classList.remove('hidden');
    });

    elBtnConfirmClearNo.addEventListener('click', () => {
        elConfirmModal.classList.add('hidden');
    });

    elBtnConfirmClearYes.addEventListener('click', () => {
        clearHistory();
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
