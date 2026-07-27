import { state, saveRoundsToLocalStorage, sortRounds } from './state.js';
import { 
    elRoundTimeInput, elRoundNoteInput, elScheduledRoundsList, elHistoryList, elBtnClearHistory, 
    elTabManual, elBatchStartTime, elBatchIntervalHours, elBatchIntervalMins, 
    elBatchCount, elRoundComment, elAlertGraceTimer, elAlertModal, 
    elBtnDemoMode, elCountdownCard, elCountdownStatusText, elCountdownTimer, elCountdownTargetTime,
    elAlertModalNoteContainer, elAlertModalNote, elSettingsModal
} from './dom.js';
import { calculateTargetDate, setDefaultInputTime } from './utils.js';
import { initAudio, startAlarmSound, stopAlarmSound } from './audio.js';
import { dismissCameraAlert } from './cameras.js';

// Exponer deleteRound a nivel global (window) ya que se usa en inline HTML onclick
window.deleteRound = deleteRound;

export function addRoundFromInput() {
    const timeValue = elRoundTimeInput.value;
    if (!timeValue) return;

    const exists = state.scheduledRounds.some(r => r.timeStr === timeValue && !r.demo);
    if (exists) {
        alert('Esta hora de ronda ya está programada.');
        return;
    }

    const noteValue = elRoundNoteInput.value.trim();

    const newRound = {
        id: Date.now(),
        timeStr: timeValue,
        targetTime: calculateTargetDate(timeValue),
        demo: false,
        note: noteValue
    };

    state.scheduledRounds.push(newRound);
    sortRounds();
    renderScheduledRounds();
    initAudio();
    saveRoundsToLocalStorage();

    // Limpiar input de notas
    elRoundNoteInput.value = '';
}

export function generateBatchRounds() {
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
        runningDate.setHours(runningDate.getHours() + intervalHours);
        runningDate.setMinutes(runningDate.getMinutes() + intervalMins);

        if (runningDate < now) {
            runningDate.setDate(runningDate.getDate() + 1);
        }

        const h = String(runningDate.getHours()).padStart(2, '0');
        const m = String(runningDate.getMinutes()).padStart(2, '0');
        const timeStr = `${h}:${m}`;

        const exists = state.scheduledRounds.some(r => r.timeStr === timeStr && !r.demo);
        if (exists) {
            skippedCount++;
            continue;
        }

        state.scheduledRounds.push({
            id: Date.now() + i,
            timeStr: timeStr,
            targetTime: new Date(runningDate),
            demo: false,
            note: ''
        });
        addedCount++;
    }

    if (addedCount > 0) {
        sortRounds();
        renderScheduledRounds();
        initAudio();
        saveRoundsToLocalStorage();
    }

    elTabManual.click();

    let msg = `Se agregaron ${addedCount} rondas al lote.`;
    if (skippedCount > 0) {
        msg += ` Se omitieron ${skippedCount} duplicadas por estar programadas previamente.`;
    }
    alert(msg);
}

export function deleteRound(id) {
    state.scheduledRounds = state.scheduledRounds.filter(r => r.id !== id);
    sortRounds();
    renderScheduledRounds();
    saveRoundsToLocalStorage();
}

export function renderScheduledRounds() {
    elScheduledRoundsList.innerHTML = '';

    if (state.scheduledRounds.length === 0) {
        elScheduledRoundsList.innerHTML = '<li class="empty-list-msg">No hay rondas programadas para el turno.</li>';
        return;
    }

    state.scheduledRounds.forEach(round => {
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

        const noteHtml = round.note ? `<span class="round-item-note">${round.note}</span>` : '';

        li.innerHTML = `
            <div class="round-info">
                <div class="round-info-header">
                    <span class="round-time-badge">${round.timeStr}${round.demo ? ' (Demo)' : ''}</span>
                    <span class="round-countdown-text">${diffText}</span>
                </div>
                ${noteHtml}
            </div>
            <button class="btn-delete-round" onclick="deleteRound(${round.id})" title="Cancelar ronda">
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        `;
        elScheduledRoundsList.appendChild(li);
    });
}

export function loadRoundsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('scheduledRounds');
        if (saved) {
            const parsed = JSON.parse(saved);
            state.scheduledRounds = parsed.map(r => ({
                id: r.id,
                timeStr: r.timeStr,
                targetTime: calculateTargetDate(r.timeStr),
                demo: false,
                note: r.note || ''
            }));
            sortRounds();
            renderScheduledRounds();
        }
    } catch (e) {
        console.error('Error al cargar rondas de localStorage:', e);
    }
}

export function addToHistory(item) {
    state.historyRounds.unshift(item);
    renderHistory();
}

export function renderHistory() {
    elHistoryList.innerHTML = '';

    if (state.historyRounds.length === 0) {
        elHistoryList.innerHTML = '<li class="empty-list-msg">Aún no se registran actividades de rondas.</li>';
        elBtnClearHistory.style.display = 'none';
        return;
    }

    elBtnClearHistory.style.display = 'flex';

    state.historyRounds.forEach(item => {
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

        const noteHtml = item.note ? `<div class="history-item-note">Indicación: ${item.note}</div>` : '';

        li.className = `history-item ${statusClass}`;
        li.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-time">Ronda: ${item.scheduledTime}</span>
                <span class="history-status-badge">${statusLabel}</span>
            </div>
            <div class="history-item-meta">
                Registrado a las ${item.completionTimeStr}
            </div>
            ${noteHtml}
            <div class="history-item-comment">
                ${item.comment}
            </div>
        `;
        elHistoryList.appendChild(li);
    });
}

export function triggerRoundAlarm(round) {
    state.isAlarmActive = true;
    state.currentActiveRound = round;
    
    elRoundComment.value = '';

    state.graceSecondsLeft = round.demo ? 30 : 120;
    elAlertGraceTimer.textContent = state.graceSecondsLeft;

    if (round.note) {
        elAlertModalNote.textContent = round.note;
        elAlertModalNoteContainer.classList.remove('hidden');
    } else {
        elAlertModalNoteContainer.classList.add('hidden');
    }

    elAlertModal.classList.remove('hidden');

    startAlarmSound();
    
    if (state.isCameraAlertActive) {
        dismissCameraAlert();
    }
}

export function updateAlertGraceTimer() {
    if (state.graceSecondsLeft > 0) {
        state.graceSecondsLeft--;
        elAlertGraceTimer.textContent = state.graceSecondsLeft;
        
        if (state.graceSecondsLeft <= 10) {
            elAlertGraceTimer.style.color = '#ff0000';
        } else {
            elAlertGraceTimer.style.color = '';
        }
    } else {
        confirmActiveRound(false, 'Ronda omitida (Límite de respuesta superado)');
    }
}

export function confirmActiveRound(wasConfirmedByUser, autoStateMessage = '') {
    if (!state.isAlarmActive || !state.currentActiveRound) return;

    stopAlarmSound();
    
    const now = new Date();
    const scheduledTime = state.currentActiveRound.timeStr;
    const completionTimeStr = now.toLocaleTimeString('es-ES');
    
    let status = 'completed';
    let comment = elRoundComment.value.trim() || 'Sin comentarios adicionales.';
    
    if (wasConfirmedByUser) {
        const roundTimeToday = new Date(state.currentActiveRound.targetTime);
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

    if (!state.currentActiveRound.demo) {
        addToHistory({
            id: Date.now(),
            scheduledTime,
            completionTimeStr,
            status,
            comment,
            note: state.currentActiveRound.note || ''
        });
    }

    state.scheduledRounds = state.scheduledRounds.filter(r => r.id !== state.currentActiveRound.id);
    saveRoundsToLocalStorage();

    state.isAlarmActive = false;
    state.currentActiveRound = null;
    
    elAlertModal.classList.add('hidden');

    sortRounds();
    renderScheduledRounds();
}

export function updateMainCountdownCard() {
    if (state.scheduledRounds.length === 0) {
        elCountdownCard.className = 'countdown-card waiting';
        elCountdownStatusText.textContent = 'SIN RONDAS PROGRAMADAS';
        elCountdownTimer.textContent = '--:--:--';
        elCountdownTargetTime.textContent = 'Programa una hora para iniciar';
        return;
    }

    const nextRound = state.scheduledRounds[0];
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

export function activateDemoMode() {
    initAudio();
    stopAlarmSound();

    // Cerrar modal de ajustes para que se pueda ver la alarma
    if (elSettingsModal) {
        elSettingsModal.classList.add('hidden');
    }

    const now = new Date();
    const demoTime = new Date(now.getTime() + 5000);
    
    const hr = String(demoTime.getHours()).padStart(2, '0');
    const min = String(demoTime.getMinutes()).padStart(2, '0');
    const sec = String(demoTime.getSeconds()).padStart(2, '0');
    const timeStr = `${hr}:${min}:${sec}`;

    // Permitir probar el demo con notas
    const noteValue = elRoundNoteInput.value.trim() || 'Ronda de prueba (Demo)';

    const demoRound = {
        id: Date.now(),
        timeStr: timeStr,
        targetTime: demoTime,
        demo: true,
        note: noteValue
    };

    state.scheduledRounds.push(demoRound);
    sortRounds();
    renderScheduledRounds();
    
    const originalText = elBtnDemoMode.innerHTML;
    elBtnDemoMode.disabled = true;
    elBtnDemoMode.innerHTML = 'Programada (5s)...';
    
    setTimeout(() => {
        elBtnDemoMode.disabled = false;
        elBtnDemoMode.innerHTML = originalText;
    }, 5000);

    // Limpiar input
    elRoundNoteInput.value = '';
}

export function clearHistory() {
    state.historyRounds = [];
    renderHistory();
}
