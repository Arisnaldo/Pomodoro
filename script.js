// --- Estado da Aplicação ---
const State = {
    mode: 'WORK', // Modo atual: WORK (Foco), SHORT_BREAK (Curta), LONG_BREAK (Longa)
    timeLeft: 25 * 60, // Tempo restante em segundos
    isRunning: false, // Se o timer está rodando
    isDarkMode: false, // Se o modo escuro está ativo
    settings: {
        work: 25, // Tempo de foco padrão
        shortBreak: 5, // Tempo de pausa curta padrão
        longBreak: 15 // Tempo de pausa longa padrão
    }
};

let timerInterval = null; // Referência para o intervalo do timer

// --- Configurações Visuais e de Texto ---
const CONFIG = {
    modes: {
        WORK: { label: 'Tempo de Foco', color: 'brand' },
        SHORT_BREAK: { label: 'Pausa Curta', color: 'emerald' },
        LONG_BREAK: { label: 'Pausa Longa', color: 'indigo' }
    },
    colors: {
        WORK: 'text-brand-600 dark:text-brand-500',
        SHORT_BREAK: 'text-emerald-500',
        LONG_BREAK: 'text-indigo-500'
    }
};

// --- Motor de Som (Web Audio API) apenas para o Alarme ---
const SoundEngine = {
    ctx: null,
    masterGain: null,

    // Inicializa o contexto de áudio
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Toca o som de alarme
    playAlarm() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Primeiro beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);

        // Segundo beep
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, now + 0.6);
        osc2.frequency.exponentialRampToValueAtTime(400, now + 0.7);
        gain2.gain.setValueAtTime(0.5, now + 0.6);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now + 0.6);
        osc2.stop(now + 1.1);
    }
};

// --- Elementos do DOM ---
const el = (id) => document.getElementById(id);
const elems = {
    app: el('app'),
    timerDisplay: el('timer-display'),
    playBtn: el('play-btn'),
    resetBtn: el('reset-btn'),
    // Ícones
    playIcon: el('play-icon'),
    pauseIcon: el('pause-icon'),
    // Botões de Modo
    modeWork: el('mode-work'),
    modeShort: el('mode-short'),
    modeLong: el('mode-long'),
    modeLabel: el('mode-label'),
    // Inputs de Configuração
    inputWork: el('input-work'),
    inputShort: el('input-short'),
    inputLong: el('input-long'),
    // Tema
    themeToggle: el('theme-toggle'),
    title: el('app-title')
};

// --- Lógica da Aplicação ---

function init() {
    lucide.createIcons();
    updateTimerDisplay();
    updateThemeIcon();

    // Desbloquear AudioContext na primeira interação do usuário (necessário para navegadores modernos)
    const unlock = () => {
        SoundEngine.init();
        document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);

    // Ouvintes de Eventos
    elems.playBtn.addEventListener('click', toggleTimer);
    elems.resetBtn.addEventListener('click', resetTimer);
    elems.themeToggle.addEventListener('click', toggleTheme);
}

// Alterna entre Iniciar e Pausar o timer
function toggleTimer() {
    if (State.isRunning) {
        clearInterval(timerInterval);
        State.isRunning = false;
    } else {
        if (State.timeLeft > 0) {
            State.isRunning = true;
            timerInterval = setInterval(() => {
                if (State.timeLeft > 0) {
                    State.timeLeft--;
                    updateTimerDisplay();
                } else {
                    completeTimer();
                }
            }, 1000);
        }
    }
    render();
}

// Executado quando o timer chega a zero
function completeTimer() {
    clearInterval(timerInterval);
    State.isRunning = false;
    SoundEngine.playAlarm();
    render();
}

// Reseta o timer para o valor inicial do modo atual
function resetTimer() {
    clearInterval(timerInterval);
    State.isRunning = false;

    // Reseta para as configurações atuais do modo
    let mins = 25;
    if (State.mode === 'WORK') mins = State.settings.work;
    if (State.mode === 'SHORT_BREAK') mins = State.settings.shortBreak;
    if (State.mode === 'LONG_BREAK') mins = State.settings.longBreak;

    State.timeLeft = mins * 60;
    updateTimerDisplay();
    render();
}

// Define o modo de operação (Foco, Pausa Curta, Pausa Longa)
function setMode(mode) {
    State.mode = mode;
    resetTimer();
    render();
}

// Função global para atualizar os tempos personalizados via input
window.updateCustomTimes = function () {
    State.settings.work = parseInt(elems.inputWork.value) || 25;
    State.settings.shortBreak = parseInt(elems.inputShort.value) || 5;
    State.settings.longBreak = parseInt(elems.inputLong.value) || 15;

    // Atualiza o timer em tempo real se não estiver rodando
    if (!State.isRunning) {
        resetTimer();
    }
};

// Expondo funções para o escopo global (necessário para onclick no HTML)
window.setMode = setMode;
window.toggleTheme = toggleTheme;

// Atualiza o display do timer na tela e no título da aba
function updateTimerDisplay() {
    const minutes = Math.floor(State.timeLeft / 60);
    const seconds = State.timeLeft % 60;
    elems.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.title = `${elems.timerDisplay.textContent} - Pomodoro Br`;
}

// Alterna entre tema claro e escuro
function toggleTheme() {
    State.isDarkMode = !State.isDarkMode;
    if (State.isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
}

// Atualiza o ícone do botão de tema
function updateThemeIcon() {
    const sunIcon = `<i data-lucide="sun" class="w-5 h-5"></i>`;
    const moonIcon = `<i data-lucide="moon" class="w-5 h-5"></i>`;
    elems.themeToggle.innerHTML = State.isDarkMode ? sunIcon : moonIcon;
    lucide.createIcons();
}

// --- Loop de Renderização Visual ---
function render() {
    // Lógica do Ícone Play/Pause
    if (State.isRunning) {
        elems.playIcon.classList.add('hidden');
        elems.pauseIcon.classList.remove('hidden');
    } else {
        elems.playIcon.classList.remove('hidden');
        elems.pauseIcon.classList.add('hidden');
    }

    // Estilos dos Botões de Modo
    const activeClass = "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white";
    const inactiveClass = "text-gray-500 dark:text-gray-400";

    // Reseta todos os botões
    [elems.modeWork, elems.modeShort, elems.modeLong].forEach(btn => {
        btn.className = `px-4 sm:px-6 py-2 rounded-lg sm:rounded-full text-sm font-medium transition-all duration-300 ${inactiveClass}`;
    });

    // Define o estilo do botão ativo
    if (State.mode === 'WORK') elems.modeWork.className = `px-4 sm:px-6 py-2 rounded-lg sm:rounded-full text-sm font-medium transition-all duration-300 ${activeClass.replace('text-brand-600', 'text-brand-600')}`;
    if (State.mode === 'SHORT_BREAK') elems.modeShort.className = `px-4 sm:px-6 py-2 rounded-lg sm:rounded-full text-sm font-medium transition-all duration-300 ${activeClass.replace('text-brand-600', 'text-emerald-500')}`;
    if (State.mode === 'LONG_BREAK') elems.modeLong.className = `px-4 sm:px-6 py-2 rounded-lg sm:rounded-full text-sm font-medium transition-all duration-300 ${activeClass.replace('text-brand-600', 'text-indigo-500')}`;

    // Cores de Fundo da Aplicação
    elems.app.className = `min-h-screen transition-colors duration-500 flex flex-col items-center relative overflow-hidden ${State.mode === 'WORK' ? 'bg-white dark:bg-slate-900' :
        State.mode === 'SHORT_BREAK' ? 'bg-emerald-50 dark:bg-slate-900' :
            'bg-indigo-50 dark:bg-slate-900'
        }`;

    // Texto e Cor do Label de Modo
    elems.modeLabel.textContent = CONFIG.modes[State.mode].label;
    elems.modeLabel.className = `text-sm uppercase tracking-[0.2em] font-bold mb-4 ${CONFIG.colors[State.mode]}`;

    // Re-executa os ícones Lucide se o HTML mudou
    lucide.createIcons();
}

// --- Segurança (Desabilitar Inspeção e Teclas de Atalho de Dev) ---
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
    // Desabilita F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        e.ctrlKey // Desabilita Ctrl completamente conforme solicitado
    ) {
        e.preventDefault();
    }
});

// Inicializa a aplicação
init();
