// متغيرات اللعبة
let currentUser = null;
let gameState = 'waiting'; // waiting, countdown, running, crashed
let currentMultiplier = 1.00;
let crashPoint = 0;
let gameInterval = null;
let countdownInterval = null;
let currentBet = 0;
let gameHistory = [];
let countdown = 10;
let autoGameInterval = null;
let playerJoined = false;
let gamePath = [];
let canvas = null;
let ctx = null;
let autoBetEnabled = false;
let playersData = [];

// بيانات المستخدمين (في التطبيق الحقيقي ستكون في قاعدة بيانات)
let users = JSON.parse(localStorage.getItem('aviatorUsers') || '{}');
let gameResults = JSON.parse(localStorage.getItem('aviatorHistory') || '[]');

// عناصر DOM
const loginScreen = document.getElementById('loginScreen');
const gameScreen = document.getElementById('gameScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const usernameSpan = document.getElementById('username');
const balanceSpan = document.getElementById('balance');
const multiplierDiv = document.getElementById('multiplier');
const gameStatusDiv = document.getElementById('gameStatus');
const startBtn = document.getElementById('startBtn');
const cashoutBtn = document.getElementById('cashoutBtn');
const autoBetBtn = document.getElementById('autoBetBtn');
const betAmountInput = document.getElementById('betAmount');
const currentBetSpan = document.getElementById('currentBet');
const potentialWinSpan = document.getElementById('potentialWin');
const gameHistoryDiv = document.getElementById('gameHistory');
const depositModal = document.getElementById('depositModal');
const depositBtn = document.getElementById('depositBtn');
const logoutBtn = document.getElementById('logoutBtn');
const plane = document.getElementById('plane');
const playersTableBody = document.getElementById('playersTableBody');

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // إعداد Canvas
    canvas = document.getElementById('flightCanvas');
    ctx = canvas.getContext('2d');
    
    // إعداد أحداث النماذج
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // إعداد أحداث اللعبة
    startBtn.addEventListener('click', joinGame);
    cashoutBtn.addEventListener('click', cashOut);
    autoBetBtn.addEventListener('click', toggleAutoBet);
    betAmountInput.addEventListener('input', updatePotentialWin);
    
    // إعداد أحداث أخرى
    depositBtn.addEventListener('click', () => depositModal.style.display = 'block');
    logoutBtn.addEventListener('click', logout);
    
    // إعداد نافذة الإيداع
    document.querySelector('.close').addEventListener('click', () => depositModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === depositModal) {
            depositModal.style.display = 'none';
        }
    });
    
    // تحديث التاريخ
    updateGameHistory();
    updatePlayersTable();
    
    // التحقق من وجود مستخدم مسجل
    const savedUser = localStorage.getItem('currentAviatorUser');
    if (savedUser) {
        currentUser = savedUser;
        showGameScreen();
    }
}

// تسجيل الدخول
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        localStorage.setItem('currentAviatorUser', username);
        showGameScreen();
    } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
}

// إنشاء حساب جديد
function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('كلمة المرور غير متطابقة');
        return;
    }
    
    if (users[username]) {
        alert('اسم المستخدم موجود بالفعل');
        return;
    }
    
    users[username] = {
        password: password,
        balance: 100, // رصيد ابتدائي للتجربة
        totalDeposited: 0,
        gamesPlayed: 0,
        totalWon: 0,
        totalLost: 0
    };
    
    localStorage.setItem('aviatorUsers', JSON.stringify(users));
    
    currentUser = username;
    localStorage.setItem('currentAviatorUser', username);
    showGameScreen();
}

// عرض شاشة اللعبة
function showGameScreen() {
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    usernameSpan.textContent = `مرحباً، ${currentUser}`;
    updateBalance();
    updatePotentialWin();
    startAutoGame(); // بدء اللعبة التلقائية
}

// تحديث الرصيد
function updateBalance() {
    if (currentUser && users[currentUser]) {
        balanceSpan.textContent = users[currentUser].balance.toFixed(2);
    }
}

// بدء النظام التلقائي للعبة
function startAutoGame() {
    if (autoGameInterval) {
        clearInterval(autoGameInterval);
    }
    
    // بدء أول دورة
    startNewRound();
}

// بدء دورة جديدة
function startNewRound() {
    gameState = 'countdown';
    countdown = 10;
    playerJoined = false;
    currentBet = 0;
    gamePath = [];
    playersData = [];
    
    // تحديد نقطة التحطم للدورة الجديدة
    crashPoint = generateCrashPoint();
    
    // إرسال بيانات اللعبة للأداة السرية
    sendGameDataToAdmin();
    
    // بدء العد التنازلي
    startCountdown();
}

// العد التنازلي
function startCountdown() {
    gameStatusDiv.textContent = `الدورة القادمة تبدأ خلال: ${countdown}`;
    startBtn.textContent = 'انضم للدورة القادمة';
    startBtn.disabled = false;
    cashoutBtn.disabled = true;
    
    // إعادة تعيين الط��ارة والمنحنى
    plane.classList.remove('crashed', 'flying');
    plane.style.left = '20px';
    plane.style.bottom = '20px';
    multiplierDiv.textContent = '1.00x';
    multiplierDiv.style.color = '#FFD700';
    
    // مسح Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    countdownInterval = setInterval(() => {
        countdown--;
        gameStatusDiv.textContent = `الدورة القادمة تبدأ خلال: ${countdown}`;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startGameRound();
        }
    }, 1000);
}

// الانضمام للعبة
function joinGame() {
    if (gameState !== 'countdown') {
        alert('انتظر الدورة القادمة');
        return;
    }
    
    const betAmount = parseFloat(betAmountInput.value);
    
    if (!betAmount || betAmount <= 0) {
        alert('يرجى إدخال مبلغ رهان صحيح');
        return;
    }
    
    if (betAmount > users[currentUser].balance) {
        alert('الرصيد غير كافي');
        return;
    }
    
    // خصم الرهان من الرصيد
    users[currentUser].balance -= betAmount;
    currentBet = betAmount;
    playerJoined = true;
    
    // تحديث البيانات
    updateBalance();
    updateCurrentBet();
    localStorage.setItem('aviatorUsers', JSON.stringify(users));
    
    // تحديث واجهة المستخدم
    startBtn.disabled = true;
    startBtn.textContent = 'تم الانضمام';
    gameStatusDiv.textContent = `تم الانضمام بمبلغ ${betAmount} USDT - انتظار بدء الدورة...`;
}

// تفعيل/إلغاء الرهان التلقائي
function toggleAutoBet() {
    autoBetEnabled = !autoBetEnabled;
    autoBetBtn.textContent = autoBetEnabled ? 'إيقاف الرهان التلقائي' : 'رهان تلقائي';
    autoBetBtn.style.background = autoBetEnabled ? '#f44336' : '#9c27b0';
}

// بدء دورة اللعبة
function startGameRound() {
    gameState = 'running';
    currentMultiplier = 1.00;
    gamePath = [{x: 20, y: canvas.height - 20}]; // نقطة البداية
    
    // إضافة لاعبين وهميين
    generateFakePlayers();
    
    // تحديث واجهة المستخدم
    if (playerJoined) {
        cashoutBtn.disabled = false;
        gameStatusDiv.textContent = 'الطيارة تحلق... اضغط على البراشوت للخروج!';
    } else {
        gameStatusDiv.textContent = 'الطيارة تحلق... لم تنضم لهذه الدورة';
    }
    
    startBtn.textContent = 'ابدأ اللعبة';
    
    // بدء العداد
    gameInterval = setInterval(updateGame, 100); // تحديث كل 100ms
}

// تحديث اللعبة
function updateGame() {
    if (gameState !== 'running') return;
    
    currentMultiplier += 0.015; // سرعة متوسطة
    multiplierDiv.textContent = currentMultiplier.toFixed(2) + 'x';
    updatePotentialWin();
    
    // حساب موضع الطيارة الجديد (حركة أفقية)
    const progress = Math.min(1, (currentMultiplier - 1) / (crashPoint - 1));
    const maxX = canvas.width - 100;
    const translateX = Math.min(maxX, progress * maxX);
    
    // حركة أفقية مع تذبذب بسيط
    const oscillation = Math.sin(Date.now() * 0.005) * 5;
    const finalY = canvas.height - 60 + oscillation;
    
    // إضافة النقطة الجديدة للمسار
    gamePath.push({x: translateX + 20, y: finalY});
    
    // رسم المنحنى
    drawFlightCurve();
    
    // تحريك الطيارة
    plane.classList.add('flying');
    plane.style.left = translateX + 'px';
    plane.style.bottom = (canvas.height - finalY) + 'px';
    
    // التحقق من التحطم
    if (currentMultiplier >= crashPoint) {
        crashGame();
    }
}

// رسم منحنى الطيران
function drawFlightCurve() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gamePath.length < 2) return;
    
    // رسم الشبكة
    drawGrid();
    
    // رسم المنحنى
    ctx.beginPath();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    
    ctx.moveTo(gamePath[0].x, gamePath[0].y);
    
    for (let i = 1; i < gamePath.length; i++) {
        ctx.lineTo(gamePath[i].x, gamePath[i].y);
    }
    
    ctx.stroke();
    
    // رسم منطقة تحت المنحنى
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.moveTo(gamePath[0].x, canvas.height);
    
    for (let i = 0; i < gamePath.length; i++) {
        ctx.lineTo(gamePath[i].x, gamePath[i].y);
    }
    
    ctx.lineTo(gamePath[gamePath.length - 1].x, canvas.height);
    ctx.closePath();
    ctx.fill();
}

// رسم الشبكة
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // خطوط عمودية
    for (let x = 0; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // خطوط أفقية
    for (let y = 0; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// إنشاء لاعبين وهميين
function generateFakePlayers() {
    const fakeNames = ['أحمد', 'محمد', 'علي', 'سارة', 'فاطمة', 'عمر', 'نور', 'ليلى'];
    const numPlayers = Math.floor(Math.random() * 5) + 3; // 3-7 لاعبين
    
    for (let i = 0; i < numPlayers; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)] + Math.floor(Math.random() * 100);
        const bet = Math.floor(Math.random() * 500) + 10;
        const cashoutPoint = 1 + Math.random() * (crashPoint - 1);
        
        playersData.push({
            name: name,
            bet: bet,
            cashoutPoint: cashoutPoint,
            cashedOut: false
        });
    }
    
    // إضافة اللاعب الحالي إذا انضم
    if (playerJoined) {
        playersData.push({
            name: currentUser,
            bet: currentBet,
            cashoutPoint: crashPoint,
            cashedOut: false,
            isCurrentUser: true
        });
    }
}

// تحطم الطيارة
function crashGame() {
    gameState = 'crashed';
    clearInterval(gameInterval);
    
    // تأثير التحطم البصري
    plane.classList.remove('flying');
    plane.classList.add('crashed');
    multiplierDiv.style.color = '#f44336';
    
    // إضافة تأثير انفجار
    createExplosionEffect();
    
    // تحديث نتائج اللاعبين
    updatePlayersResults();
    
    if (playerJoined) {
        gameStatusDiv.textContent = `تحطمت الطيارة عند ${crashPoint.toFixed(2)}x - خسرت ${currentBet} USDT`;
        
        // تحديث الإحصائيات
        users[currentUser].gamesPlayed++;
        users[currentUser].totalLost += currentBet;
        
        // إضافة للتاريخ
        addToHistory(currentBet, 0, crashPoint, false);
        
        // حفظ البيانات
        localStorage.setItem('aviatorUsers', JSON.stringify(users));
    } else {
        gameStatusDiv.textContent = `تحطمت الطيارة عند ${crashPoint.toFixed(2)}x`;
    }
    
    // الرهان التلقائي
    if (autoBetEnabled && !playerJoined) {
        setTimeout(() => {
            joinGame();
        }, 1000);
    }
    
    // إعادة تعيين اللعبة بعد 5 ثوان
    setTimeout(() => {
        resetGame();
        startNewRound();
    }, 5000);
}

// تحديث نتائج اللاعبين
function updatePlayersResults() {
    playersData.forEach(player => {
        if (!player.cashedOut) {
            // اللاعب خسر
            player.multiplier = 0;
            player.profit = -player.bet;
        }
    });
    
    updatePlayersTable();
}

// إنشاء تأثير الانفجار
function createExplosionEffect() {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.innerHTML = '💥';
    explosion.style.position = 'absolute';
    explosion.style.fontSize = '3em';
    explosion.style.zIndex = '10';
    explosion.style.animation = 'explode 1s ease-out';
    
    // موضع الانفجار عند الطيارة
    const planeRect = plane.getBoundingClientRect();
    const containerRect = document.querySelector('.flight-chart').getBoundingClientRect();
    
    explosion.style.left = (planeRect.left - containerRect.left) + 'px';
    explosion.style.top = (planeRect.top - containerRect.top) + 'px';
    
    document.querySelector('.flight-chart').appendChild(explosion);
    
    // إزالة التأثير بعد انتهاء الأنيميشن
    setTimeout(() => {
        if (explosion.parentNode) {
            explosion.parentNode.removeChild(explosion);
        }
    }, 1000);
}

// الخروج بالبراشوت
function cashOut() {
    if (gameState !== 'running' || !playerJoined) return;
    
    gameState = 'cashed_out';
    
    const winAmount = currentBet * currentMultiplier;
    users[currentUser].balance += winAmount;
    
    // تحديث بيانات اللاعب
    const currentPlayerData = playersData.find(p => p.isCurrentUser);
    if (currentPlayerData) {
        currentPlayerData.cashedOut = true;
        currentPlayerData.multiplier = currentMultiplier;
        currentPlayerData.profit = winAmount - currentBet;
    }
    
    // تحديث واجهة المستخدم
    multiplierDiv.style.color = '#4CAF50';
    gameStatusDiv.textContent = `نجحت في الخروج عند ${currentMultiplier.toFixed(2)}x - ربحت ${winAmount.toFixed(2)} USDT`;
    cashoutBtn.disabled = true;
    
    // تحديث الإحصائيات
    users[currentUser].gamesPlayed++;
    users[currentUser].totalWon += winAmount;
    
    // إضافة للتاريخ
    addToHistory(currentBet, winAmount, currentMultiplier, true);
    
    // حفظ البيانات
    updateBalance();
    localStorage.setItem('aviatorUsers', JSON.stringify(users));
    
    // تحديث جدول اللاعبين
    updatePlayersTable();
}

// تحديث جدول اللاعبين
function updatePlayersTable() {
    playersTableBody.innerHTML = '';
    
    playersData.forEach(player => {
        const row = document.createElement('tr');
        const multiplier = player.cashedOut ? player.multiplier.toFixed(2) + 'x' : 
                          (player.multiplier === 0 ? 'تحطمت' : 'يلعب...');
        const profit = player.profit !== undefined ? 
                      (player.profit > 0 ? '+' + player.profit.toFixed(2) : player.profit.toFixed(2)) : 
                      '0.00';
        
        row.className = player.profit > 0 ? 'win-row' : (player.profit < 0 ? 'loss-row' : '');
        
        row.innerHTML = `
            <td>${player.name}${player.isCurrentUser ? ' (أنت)' : ''}</td>
            <td>${player.bet.toFixed(2)}</td>
            <td>${multiplier}</td>
            <td>${profit}</td>
        `;
        
        playersTableBody.appendChild(row);
    });
}

// إعادة تعيين اللعبة
function resetGame() {
    gameState = 'waiting';
    currentMultiplier = 1.00;
    currentBet = 0;
    playerJoined = false;
    gamePath = [];
    
    // مسح Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // إعادة تعيين واجهة المستخدم
    startBtn.disabled = false;
    cashoutBtn.disabled = true;
    multiplierDiv.textContent = '1.00x';
    multiplierDiv.style.color = '#FFD700';
    plane.classList.remove('crashed', 'flying');
    plane.style.left = '20px';
    plane.style.bottom = '20px';
    
    updateCurrentBet();
    updatePotentialWin();
}

// توليد نقطة التحطم
function generateCrashPoint() {
    // خوارزمية لتوليد نقطة تحطم عادلة و��كن مربحة للبيت
    const random = Math.random();
    
    if (random < 0.5) {
        // 50% احتمال تحطم مبكر (1.00x - 2.00x)
        return 1.00 + Math.random() * 1.00;
    } else if (random < 0.8) {
        // 30% احتمال تحطم متوسط (2.00x - 5.00x)
        return 2.00 + Math.random() * 3.00;
    } else if (random < 0.95) {
        // 15% احتمال تحطم عالي (5.00x - 15.00x)
        return 5.00 + Math.random() * 10.00;
    } else {
        // 5% احتمال تحطم عالي جداً (15.00x - 30.00x)
        return 15.00 + Math.random() * 15.00;
    }
}

// إضافة للتاريخ
function addToHistory(bet, win, multiplier, isWin) {
    const result = {
        bet: bet,
        win: win,
        multiplier: multiplier,
        isWin: isWin,
        timestamp: new Date().toISOString(),
        user: currentUser
    };
    
    gameResults.unshift(result);
    if (gameResults.length > 50) {
        gameResults = gameResults.slice(0, 50);
    }
    
    localStorage.setItem('aviatorHistory', JSON.stringify(gameResults));
    updateGameHistory();
}

// تحديث عرض التاريخ
function updateGameHistory() {
    gameHistoryDiv.innerHTML = '';
    
    gameResults.slice(0, 10).forEach(result => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${result.isWin ? 'win' : 'loss'}`;
        historyItem.innerHTML = `
            <div>${result.multiplier.toFixed(2)}x</div>
            <div>${result.isWin ? '+' : '-'}${result.isWin ? result.win.toFixed(2) : result.bet.toFixed(2)}</div>
        `;
        gameHistoryDiv.appendChild(historyItem);
    });
}

// تحديث الرهان الحالي
function updateCurrentBet() {
    currentBetSpan.textContent = currentBet.toFixed(2);
}

// تحديث المكسب المحتمل
function updatePotentialWin() {
    const betAmount = parseFloat(betAmountInput.value) || 0;
    const potentialWin = betAmount * currentMultiplier;
    potentialWinSpan.textContent = potentialWin.toFixed(2);
}

// تعديل مبلغ الرهان
function adjustBet(amount) {
    const currentAmount = parseFloat(betAmountInput.value) || 0;
    const newAmount = Math.max(1, currentAmount + amount);
    betAmountInput.value = newAmount;
    updatePotentialWin();
}

// تعيين مبلغ رهان سريع
function setBet(amount) {
    betAmountInput.value = amount;
    updatePotentialWin();
}

// نسخ عنوان المحفظة
function copyAddress() {
    const addressInput = document.querySelector('.wallet-address input');
    addressInput.select();
    document.execCommand('copy');
    alert('تم نسخ العنوان بنجاح!');
}

// تسجيل الخروج
function logout() {
    currentUser = null;
    localStorage.removeItem('currentAviatorUser');
    gameScreen.classList.remove('active');
    loginScreen.classList.add('active');
    
    // إيقاف اللعبة التلقائية
    if (autoGameInterval) {
        clearInterval(autoGameInterval);
    }
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // إعادة تعيين النماذج
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// التبديل بين تبويبات تسجيل الدخول
function showTab(tabName) {
    // إخفاء جميع التبويبات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إظهار التبويب المحدد
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// إرسال بيانات اللعبة للأداة السرية
function sendGameDataToAdmin() {
    // حفظ بيانات اللعبة الحالي�� للأداة السرية
    const gameData = {
        crashPoint: crashPoint,
        startTime: Date.now(),
        gameId: Date.now() + Math.random(),
        player: currentUser,
        bet: currentBet,
        gameState: gameState,
        countdown: countdown
    };
    
    localStorage.setItem('currentGameData', JSON.stringify(gameData));
    
    // إرسال إشعار للأداة السرية (في التطبيق الحقيقي سيكون عبر WebSocket أو API)
    if (window.adminTool) {
        window.adminTool.updateGameData(gameData);
    }
}

// دالة لمحاكاة شحن الرصيد (للاختبار فقط)
function simulateDeposit(amount) {
    if (currentUser && users[currentUser]) {
        users[currentUser].balance += amount;
        users[currentUser].totalDeposited += amount;
        updateBalance();
        localStorage.setItem('aviatorUsers', JSON.stringify(users));
        alert(`تم إضافة ${amount} USDT إلى رصيدك!`);
    }
}

// إضافة دالة للوحة المفاتيح للاختبار
document.addEventListener('keydown', function(e) {
    // Ctrl + Shift + D لإضافة 1000 USDT للاختبار
    if (e.ctrlKey && e.shiftKey && e.key === 'D' && currentUser) {
        simulateDeposit(1000);
    }
});