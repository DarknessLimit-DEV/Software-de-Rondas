// Estado Global de la Aplicación
export const state = {
    scheduledRounds: [],
    historyRounds: [],
    volume: 0.8,
    notepadText: '',
    
    // Alarma de Rondas
    isAlarmActive: false,
    currentActiveRound: null,
    graceSecondsLeft: 0,
    
    // Cámaras
    cameraEnabled: true,
    cameraIntervalMins: 15,
    cameraSecondsLeft: 15 * 60,
    isCameraAlertActive: false,
    cameraAlertSecondsLeft: 18
};

// Guardar rondas en LocalStorage
export function saveRoundsToLocalStorage() {
    const roundsToSave = state.scheduledRounds.filter(r => !r.demo).map(r => ({
        id: r.id,
        timeStr: r.timeStr,
        note: r.note || ''
    }));
    localStorage.setItem('scheduledRounds', JSON.stringify(roundsToSave));
}

// Ordenar las rondas por hora programada
export function sortRounds() {
    state.scheduledRounds.sort((a, b) => a.targetTime - b.targetTime);
}
