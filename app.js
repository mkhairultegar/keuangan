// Global Variables
let currentUser = null;
let auth = null;
let db = null;

// Initialize Firebase
function initializeFirebase() {
    try {
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Enable offline persistence
        db.enablePersistence()
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.log('The current browser does not support all features required to enable persistence');
                }
            });
        
        // Auth state observer
        auth.onAuthStateChanged((user) => {
            hideLoading();
            if (user) {
                currentUser = user;
                showMainApp();
                loadDashboard();
                console.log('User authenticated:', user.uid);
            } else {
                currentUser = null;
                showAuth();
            }
        });
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        hideLoading();
        alert('Error initializing app. Please refresh the page.');
    }
}

// Loading Functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Authentication Functions
function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

async function loginAnonymously() {
    try {
        showLoading();
        
        // Sign in anonymously
        await auth.signInAnonymously();
        console.log('Anonymous login successful');
        
    } catch (error) {
        hideLoading();
        console.error('Anonymous login failed:', error);
        alert('Login failed: ' + error.message);
    }
}

async function logout() {
    if (confirm('Yakin mau logout? Anda bisa login lagi nanti dengan data yang sama.')) {
        try {
            await auth.signOut();
        } catch (error) {
            alert('Logout failed: ' + error.message);
        }
    }
}

function resetData() {
    if (confirm('⚠️ PERINGATAN! Ini akan menghapus SEMUA data keuangan Anda. Yakin ingin reset?')) {
        if (confirm('Konfirmasi sekali lagi: Semua transaksi dan utang akan hilang permanen!')) {
            Promise.all([
                // Delete all transactions
                db.collection('transactions')
                    .where('userId', '==', currentUser.uid)
                    .get()
                    .then(snapshot => {
                        const batch = db.batch();
                        snapshot.docs.forEach(doc => {
                            batch.delete(doc.ref);
                        });
                        return batch.commit();
                    }),
                    
                // Delete all debts
                db.collection('debts')
                    .where('userId', '==', currentUser.uid)
                    .get()
                    .then(snapshot => {
                        const batch = db.batch();
                        snapshot.docs.forEach(doc => {
                            batch.delete(doc.ref);
                        });
                        return batch.commit();
                    })
            ])
            .then(() => {
                loadDashboard();
                loadTransactions();
                loadDebts();
                alert('✅ Data berhasil direset! Mulai dari awal.');
            })
            .catch(error => {
                console.error('Error resetting data:', error);
                alert('Error resetting data: ' + error.message);
            });
        }
    }
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Initialize theme on load
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.getElementById('themeToggle').textContent = '☀️';
    }
}

// Page Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageName + 'Page').classList.remove('hidden');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load page-specific data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'debts':
            loadDebts();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    if (!currentUser) return;
    
    try {
        const [balance, monthlyStats, recentTransactions, urgentDebts, totalDebt] = await Promise.all([
            calculateBalance(),
            getMonthlyStats(),
            getRecentTransactions(),
            getUrgentDebts(),
            getTotalDebt()
        ]);
        
        // Update balance cards
        document.getElementById('currentBalance').textContent = formatCurrency(balance);
        document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyStats.income);
        document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyStats.expense);
        document.getElementById('totalDebt').textContent = formatCurrency(totalDebt);
        
        // Update recent lists
        displayRecentTransactions(recentTransactions);
        displayUrgentDebts(urgentDebts);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function calculateBalance() {
    const snapshot = await db.collection('transactions')
        .where('userId', '==', currentUser.uid)
        .get();
    
    let balance = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') {
            balance += data.amount;
        } else {
            balance -= data.amount;
        }
    });
    
    return balance;
}

async function getMonthlyStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const snapshot = await db.collection('transactions')
        .where('userId', '==', currentUser.uid)
        .where('createdAt', '>=', startOfMonth)
        .get();
    
    let income = 0, expense = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') {
            income += data.amount;
        } else {
            expense += data.amount;
        }
    });
    
    return { income, expense };
}

async function getRecentTransactions() {
    const snapshot = await db.collection('transactions')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUrgentDebts() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const snapshot = await db.collection('debts')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .where('deadline', '<=', nextWeek)
        .orderBy('deadline', 'asc')
        .limit(5)
        .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getTotalDebt() {
    const snapshot = await db.collection('debts')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .get();
    
    let total = 0;
    snapshot.forEach(doc => {
        total += doc.data().amount;
    });
    
    return total;
}

function displayRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    container.innerHTML = '';
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>Belum ada transaksi</p>';
        return;
    }
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <div>
                <strong>${transaction.category}</strong>
                <p>${transaction.note || 'No notes'}</p>
            </div>
            <div class="item-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        `;
        container.appendChild(item);
    });
}

function displayUrgentDebts(debts) {
    const container = document.getElementById('urgentDebts');
    container.innerHTML = '';
    
    if (debts.length === 0) {
        container.innerHTML = '<p>Tidak ada utang mendesak</p>';
        return;
    }
    
    debts.forEach(debt => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        const daysLeft = Math.ceil((debt.deadline.toDate() - new Date()) / (1000 * 60 * 60 * 24));
        item.innerHTML = `
            <div>
                <strong>${debt.name}</strong>
                <p>${daysLeft} hari lagi</p>
            </div>
            <div class="item-amount debt">
                ${formatCurrency(debt.amount)}
            </div>
        `;
        container.appendChild(item);
    });
}

// Transaction Functions
function showAddTransaction() {
    document.getElementById('addTransactionForm').classList.remove('hidden');
}

function hideAddTransaction() {
    document.getElementById('addTransactionForm').classList.add('hidden');
    clearTransactionForm();
}

function clearTransactionForm() {
    document.getElementById('transactionType').value = 'income';
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionCategory').value = 'makanan';
    document.getElementById('transactionNote').value = '';
}

async function addTransaction() {
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const category = document.getElementById('transactionCategory').value;
    const note = document.getElementById('transactionNote').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: type,
            amount: amount,
            category: category,
            note: note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        hideAddTransaction();
        loadTransactions();
        loadDashboard();
        alert('Transaction added successfully!');
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Error adding transaction: ' + error.message);
    }
}

async function loadTransactions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    container.innerHTML = '';
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-center">Belum ada transaksi</p>';
        return;
    }
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="item-info">
                <h4>${transaction.category}</h4>
                <p>${transaction.note || 'No notes'}</p>
                <p>${formatDate(transaction.createdAt)}</p>
            </div>
            <div>
                <div class="item-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
                <div class="item-actions mt-20">
                    <button class="btn-small btn-danger" onclick="deleteTransaction('${transaction.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
        await db.collection('transactions').doc(id).delete();
        loadTransactions();
        loadDashboard();
        alert('Transaction deleted successfully!');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction: ' + error.message);
    }
}

// Debt Functions
function showAddDebt() {
    document.getElementById('addDebtForm').classList.remove('hidden');
}

function hideAddDebt() {
    document.getElementById('addDebtForm').classList.add('hidden');
    clearDebtForm();
}

function clearDebtForm() {
    document.getElementById('debtName').value = '';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtDeadline').value = '';
    document.getElementById('debtNote').value = '';
}

async function addDebt() {
    const name = document.getElementById('debtName').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const deadline = new Date(document.getElementById('debtDeadline').value);
    const note = document.getElementById('debtNote').value;
    
    if (!name || !amount || amount <= 0 || !deadline) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        await db.collection('debts').add({
            userId: currentUser.uid,
            name: name,
            amount: amount,
            deadline: deadline,
            note: note,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        hideAddDebt();
        loadDebts();
        loadDashboard();
        alert('Debt added successfully!');
    } catch (error) {
        console.error('Error adding debt:', error);
        alert('Error adding debt: ' + error.message);
    }
}

async function loadDebts() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('debts')
            .where('userId', '==', currentUser.uid)
            .orderBy('deadline', 'asc')
            .get();
        
        const debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayDebts(debts);
    } catch (error) {
        console.error('Error loading debts:', error);
    }
}

function displayDebts(debts) {
    const container = document.getElementById('debtsList');
    container.innerHTML = '';
    
    if (debts.length === 0) {
        container.innerHTML = '<p class="text-center">Belum ada utang</p>';
        return;
    }
    
    debts.forEach(debt => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const deadline = debt.deadline.toDate();
        const isOverdue = deadline < new Date() && debt.status === 'pending';
        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        
        item.innerHTML = `
            <div class="item-info">
                <h4>${debt.name}</h4>
                <p>${debt.note || 'No notes'}</p>
                <p>Deadline: ${formatDate(debt.deadline)}</p>
                <span class="status-badge ${debt.status === 'paid' ? 'status-paid' : (isOverdue ? 'status-overdue' : 'status-pending')}">
                    ${debt.status === 'paid' ? 'Lunas' : (isOverdue ? 'Terlambat' : `${daysLeft} hari lagi`)}
                </span>
            </div>
            <div>
                <div class="item-amount debt">
                    ${formatCurrency(debt.amount)}
                </div>
                <div class="item-actions mt-20">
                    ${debt.status === 'pending' ? `
                        <button class="btn-small btn-success" onclick="markDebtPaid('${debt.id}')">
                            Lunas
                        </button>
                    ` : ''}
                    <button class="btn-small btn-danger" onclick="deleteDebt('${debt.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function markDebtPaid(id) {
    try {
        await db.collection('debts').doc(id).update({
            status: 'paid',
            paidAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loadDebts();
        loadDashboard();
        alert('Debt marked as paid!');
    } catch (error) {
        console.error('Error updating debt:', error);
        alert('Error updating debt: ' + error.message);
    }
}

async function deleteDebt(id) {
    if (!confirm('Are you sure you want to delete this debt?')) return;
    
    try {
        await db.collection('debts').doc(id).delete();
        loadDebts();
        loadDashboard();
        alert('Debt deleted successfully!');
    } catch (error) {
        console.error('Error deleting debt:', error);
        alert('Error deleting debt: ' + error.message);
    }
}

// History Functions
async function loadHistory() {
    if (!currentUser) return;
    
    const filter = document.getElementById('historyFilter').value;
    
    try {
        let query = db.collection('transactions')
            .where('userId', '==', currentUser.uid);
        
        if (filter !== 'all') {
            query = query.where('type', '==', filter);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        displayHistory(transactions);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayHistory(transactions) {
    const container = document.getElementById('historyList');
    container.innerHTML = '';
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-center">Tidak ada data</p>';
        return;
    }
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="item-info">
                <h4>${transaction.category}</h4>
                <p>${transaction.note || 'No notes'}</p>
                <p>${formatDate(transaction.createdAt)}</p>
            </div>
            <div class="item-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        `;
        container.appendChild(item);
    });
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initializeFirebase();
    
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadHistory);
});

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initTheme();
        initializeFirebase();
    });
} else {
    initTheme();
    initializeFirebase();
}
