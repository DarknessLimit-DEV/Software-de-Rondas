import { state } from './state.js';
import { elBtnTestSound, elBtnTestCameraSound } from './dom.js';

let audioCtx = null;
let mainGainNode = null;
let alarmIntervalId = null;
let activeOscillators = [];
let cameraSoundIntervalId = null;

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mainGainNode = audioCtx.createGain();
        mainGainNode.gain.setValueAtTime(state.volume, audioCtx.currentTime);
        mainGainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function updateVolume(newVolume) {
    state.volume = newVolume;
    if (mainGainNode && audioCtx) {
        mainGainNode.gain.setValueAtTime(state.volume, audioCtx.currentTime);
    }
}

function stopActiveOscillators() {
    activeOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {}
    });
    activeOscillators = [];
}

export function startAlarmSound() {
    initAudio();
    if (alarmIntervalId) return;

    let toggle = false;
    alarmIntervalId = setInterval(() => {
        stopActiveOscillators();

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
        localGain.gain.setValueAtTime(state.volume, audioCtx.currentTime);
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
            } catch (e) {}
        }, 560);
    }, 600);
}

export function stopAlarmSound() {
    if (alarmIntervalId) {
        clearInterval(alarmIntervalId);
        alarmIntervalId = null;
    }
    stopActiveOscillators();
}

export function playTestSound() {
    initAudio();
    stopAlarmSound();
    
    const testOsc = audioCtx.createOscillator();
    const testGain = audioCtx.createGain();
    
    testOsc.type = 'sine';
    testOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
    
    testGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    testGain.gain.exponentialRampToValueAtTime(state.volume, audioCtx.currentTime + 0.1);
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

export function playTestCameraChime() {
    initAudio();
    stopAlarmSound();
    stopCameraAlertSound();

    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(state.volume * 0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(mainGainNode);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(state.volume * 0.6, now + 0.15);
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

export function startCameraAlertSound() {
    initAudio();
    if (cameraSoundIntervalId) return;

    const playChime = () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(state.volume * 0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(mainGainNode);
        osc1.start(now);
        osc1.stop(now + 0.25);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.15);
        gain2.gain.setValueAtTime(state.volume * 0.6, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(mainGainNode);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.4);
    };

    playChime();
    cameraSoundIntervalId = setInterval(playChime, 2500);
}

export function stopCameraAlertSound() {
    if (cameraSoundIntervalId) {
        clearInterval(cameraSoundIntervalId);
        cameraSoundIntervalId = null;
    }
}
