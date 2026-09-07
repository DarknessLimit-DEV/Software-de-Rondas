import { state, saveRoundsToLocalStorage, saveHistoryToLocalStorage, sortRounds } from './js/state.js';
import { 
    elLiveTime, elLiveDate, elRoundTimeInput, elRoundNoteInput, elBtnAddRound, elBtnTestSound, 
    elBtnTestCameraSound, elBtnDemoMode, elBtnCameraDemo, elVolumeControl, 
    elVolumeValue, elCountdownCard, elCountdownStatusText, elCountdownTimer, 
    elCountdownTargetTime, elScheduledRoundsList, elHistoryList, elAlertModal, 
    elAlertGraceTimer, elRoundComment, elBtnConfirmRound, elBtnClearHistory, 
    elConfirmModal, elBtnConfirmClearYes, elBtnConfirmClearNo, elBtnSettingsToggle, 
    elBtnCloseSettings, elSettingsModal, elBtnSyncTime, elTabManual, elTabAuto, 
    elSchedulerManualContent, elSchedulerAutoContent, elBatchStartTime, 
    elBatchIntervalHours, elBatchIntervalMins, elBatchCount, elBtnGenerateBatch, 
    elCameraEnabledCheckbox, elCameraIntervalInput, elCameraTimerDisplay, 
    elCameraTimerMain, elCameraCountdownCard, elCameraStatusText, 
    elCameraAlertBanner, elCameraGraceTimer, elNotepadArea,
    elEditRoundModal, elBtnCloseEditRound, elBtnSaveEditRound, elBtnCancelEditRound
} from './js/dom.js';
import { updateClock, setDefaultInputTime } from './js/utils.js';
import { 
    initAudio, updateVolume, playTestSound, playTestCameraChime 
} from './js/audio.js';
import { 
    addRoundFromInput, generateBatchRounds, loadRoundsFromLocalStorage, 
    loadHistoryFromLocalStorage, resyncAllRounds,
    renderScheduledRounds, renderHistory, clearHistory, 
    triggerRoundAlarm, updateAlertGraceTimer, confirmActiveRound, 
    updateMainCountdownCard, addToHistory, activateDemoMode,
    closeEditRound, saveEditRound
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
        localStorage.setItem('volume', vol.toString());
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

    // Cargar volumen guardado
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        const vol = parseFloat(savedVolume);
        if (!isNaN(vol)) {
            state.volume = vol;
            elVolumeControl.value = vol;
            elVolumeValue.textContent = `${Math.round(vol * 100)}%`;
            updateVolume(vol);
        }
    }

    // Cargar configuración guardada de cámaras
    const savedCameraEnabled = localStorage.getItem('cameraEnabled');
    if (savedCameraEnabled !== null) {
        state.cameraEnabled = (savedCameraEnabled === 'true');
        elCameraEnabledCheckbox.checked = state.cameraEnabled;
    }
    const savedCameraInterval = localStorage.getItem('cameraIntervalMins');
    if (savedCameraInterval !== null) {
        const interval = parseInt(savedCameraInterval, 10);
        if (!isNaN(interval) && interval > 0) {
            state.cameraIntervalMins = interval;
            elCameraIntervalInput.value = interval;
        }
    }

    // Inicializar el selector de hora con la hora actual + 1 hora
    setDefaultInputTime();
    
    // Inicializar temporizador de cámaras con valor por defecto
    resetCameraTimer();

    // Cargar rondas persistidas
    loadRoundsFromLocalStorage();

    // Cargar historial de rondas persistido
    loadHistoryFromLocalStorage();

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

    // Event listener para botón de Sincronización de Hora y Recarga
    if (elBtnSyncTime) {
        elBtnSyncTime.addEventListener('click', () => {
            // Indicar retroalimentación visual en el botón
            elBtnSyncTime.classList.add('btn-syncing');
            const syncTextEl = elBtnSyncTime.querySelector('.btn-sync-text');
            if (syncTextEl) {
                syncTextEl.textContent = 'Sincronizando hora...';
            }

            // 1. Recalcular todas las rondas programadas con la hora actual del sistema
            resyncAllRounds();

            // 2. Asegurar que todos los datos estén guardados en localStorage antes de recargar
            saveRoundsToLocalStorage();
            saveHistoryToLocalStorage();
            if (state.notepadText !== undefined) {
                localStorage.setItem('notepadText', state.notepadText);
            }
            localStorage.setItem('themeColor', state.themeColor);
            localStorage.setItem('bgColor', state.bgColor);
            localStorage.setItem('panelColor', state.panelColor);
            localStorage.setItem('clockColor', state.clockColor);
            localStorage.setItem('volume', state.volume.toString());
            localStorage.setItem('cameraEnabled', state.cameraEnabled.toString());
            localStorage.setItem('cameraIntervalMins', state.cameraIntervalMins.toString());

            // 3. Actualizar reloj inmediatamente
            updateClock();

            // 4. Recargar la consola para sincronizar limpiamente con el sistema operativo
            setTimeout(() => {
                window.location.reload();
            }, 350);
        });
    }

    // Event listeners para Modal de Edición de Ronda
    elBtnCloseEditRound.addEventListener('click', closeEditRound);
    elBtnCancelEditRound.addEventListener('click', closeEditRound);
    elBtnSaveEditRound.addEventListener('click', saveEditRound);
    elEditRoundModal.addEventListener('click', (e) => {
        if (e.target === elEditRoundModal) {
            closeEditRound();
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

    // Cargar Tema Guardado
    const savedTheme = localStorage.getItem('themeColor');
    if (savedTheme) {
        state.themeColor = savedTheme;
        applyThemeColor(savedTheme);
    }

    // Escuchadores para cambiar de tema
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            state.themeColor = color;
            localStorage.setItem('themeColor', color);
            applyThemeColor(color);
        });
    });

    // Cargar Fondo Guardado
    const savedBg = localStorage.getItem('bgColor');
    if (savedBg) {
        state.bgColor = savedBg;
        applyBgColor(savedBg);
    }

    // Escuchadores para cambiar de fondo
    document.querySelectorAll('.bg-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            state.bgColor = color;
            localStorage.setItem('bgColor', color);
            applyBgColor(color);
        });
    });

    // Cargar Fondo de las Tarjetas Guardado
    const savedPanelColor = localStorage.getItem('panelColor');
    if (savedPanelColor) {
        state.panelColor = savedPanelColor;
        applyPanelColor(savedPanelColor);
    }

    // Escuchadores para cambiar de fondo de las tarjetas
    document.querySelectorAll('.panel-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            state.panelColor = color;
            localStorage.setItem('panelColor', color);
            applyPanelColor(color);
        });
    });

    // Cargar Color del Reloj Guardado
    const savedClockColor = localStorage.getItem('clockColor');
    if (savedClockColor) {
        state.clockColor = savedClockColor;
        applyClockColor(savedClockColor);
    }

    // Escuchadores para cambiar el color del reloj
    document.querySelectorAll('.clock-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            state.clockColor = color;
            localStorage.setItem('clockColor', color);
            applyClockColor(color);
        });
    });
});

// Aplica el color del tema a la consola
function applyThemeColor(hexColor) {
    document.documentElement.style.setProperty('--neon-cyan', hexColor);
    
    // Calcular el color RGBA para la sombra
    let r = 0, g = 240, b = 255;
    if (hexColor.startsWith('#')) {
        const bigint = parseInt(hexColor.slice(1), 16);
        r = (bigint >> 16) & 255;
        g = (bigint >> 8) & 255;
        b = bigint & 255;
    }
    document.documentElement.style.setProperty('--shadow-cyan', `0 0 15px rgba(${r}, ${g}, ${b}, 0.35)`);
    
    // Actualizar clase activa en los botones de selección
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === hexColor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Aplica el color de fondo a la consola
function applyBgColor(hexColor) {
    document.documentElement.style.setProperty('--bg-main', hexColor);
    
    // Actualizar clase activa en los botones de selección de fondo
    document.querySelectorAll('.bg-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === hexColor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Aplica el color de fondo a las tarjetas (paneles)
function applyPanelColor(colorValue) {
    document.documentElement.style.setProperty('--bg-panel', colorValue);
    
    // Actualizar clase activa en los botones de selección de paneles
    document.querySelectorAll('.panel-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === colorValue) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Aplica el color al reloj digital
function applyClockColor(colorValue) {
    document.documentElement.style.setProperty('--clock-color', colorValue);
    
    // Actualizar clase activa en los botones de selección del reloj
    document.querySelectorAll('.clock-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === colorValue) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}



