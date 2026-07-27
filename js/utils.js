import { elLiveTime, elLiveDate, elRoundTimeInput } from './dom.js';

// Establece la hora por defecto en el selector (Hora actual + 1 hora)
export function setDefaultInputTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    elRoundTimeInput.value = `${hr}:${min}`;
}

// Actualiza el reloj digital
export function updateClock() {
    const now = new Date();
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elLiveTime.textContent = `${hours}:${minutes}:${seconds}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elLiveDate.textContent = now.toLocaleDateString('es-ES', options);
}

// Calcula la fecha objetivo en base a un string HH:MM
export function calculateTargetDate(timeStr) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    if (target < now) {
        target.setDate(target.getDate() + 1);
    }
    return target;
}
