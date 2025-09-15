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
        const deadline = new Date(debt.deadline);
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

function markDebtPaid(id) {
    try {
        const debtIndex = userData.debts.findIndex(d => d.id === id);
        if (debtIndex !== -1) {
            userData.debts[debtIndex].status = 'paid';
            userData.debts[debtIndex].paidAt = new Date().toISOString();
            saveUserData();
            
            loadDebts();
            loadDashboard();
            alert('Debt marked as paid!');
        }
    } catch (error) {
        alert('Error updating debt: ' + error.message);
    }
}

function deleteDebt(id) {
    if (!confirm('Are you sure you want to delete this debt?')) return;
    
    try {
        userData.debts = userData.debts.filter(d => d.id !== id);
        saveUserData();
        
        loadDebts();
        loadDashboard();
        alert('Debt deleted successfully!');
    } catch (error) {
        alert('Error deleting debt: ' + error.message);
    }
}

// History Functions
function loadHistory() {
    if (!currentUser) return;
    
    const filter = document.getElementById('historyFilter').value;
    
    try {
        let transactions = userData.transactions;
        
        if (filter !== 'all') {
            transactions = transactions.filter(t => t.type === filter);
        }
        
        transactions = transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
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

function formatDate(dateInput) {
    if (!dateInput) return 'Unknown date';
    
    const date = new Date(dateInput);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initializeApp();
    
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadHistory);
});

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initTheme();
        initializeApp();
    });
} else {
    initTheme();
    initializeApp();
}// Global Variables
let currentUser = null;
let userData = {
    transactions: [],
    debts: []
};

// Initialize App
function initializeApp() {
    // Load data from localStorage
    loadUserData();
    
    // Check if user has used app before
    const hasUsedApp = localStorage.getItem('myfinance_user');
    
    hideLoading();
    
    if (hasUsedApp) {
        // Auto login for returning users
        currentUser = { uid: hasUsedApp };
        showMainApp();
        loadDashboard();
    } else {
        showAuth();
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
        
        // Generate unique user ID
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Save user ID
        localStorage.setItem('myfinance_user', userId);
        
        currentUser = { uid: userId };
        
        hideLoading();
        showMainApp();
        loadDashboard();
        
    } catch (error) {
        hideLoading();
        alert('Error starting app: ' + error.message);
    }
}

function logout() {
    if (confirm('Yakin mau logout? Data akan hilang jika tidak dibookmark!')) {
        localStorage.removeItem('myfinance_user');
        localStorage.removeItem('myfinance_data');
        localStorage.removeItem('theme');
        
        currentUser = null;
        userData = { transactions: [], debts: [] };
        
        showAuth();
    }
}

// Data Management
function saveUserData() {
    if (currentUser) {
        const dataToSave = {
            ...userData,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('myfinance_data', JSON.stringify(dataToSave));
    }
}

function loadUserData() {
    const savedData = localStorage.getItem('myfinance_data');
    if (savedData) {
        userData = JSON.parse(savedData);
        
        // Ensure data structure
        if (!userData.transactions) userData.transactions = [];
        if (!userData.debts) userData.debts = [];
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
        const balance = calculateBalance();
        const monthlyStats = getMonthlyStats();
        const recentTransactions = getRecentTransactions();
        const urgentDebts = getUrgentDebts();
        
        // Update balance cards
        document.getElementById('currentBalance').textContent = formatCurrency(balance);
        document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyStats.income);
        document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyStats.expense);
        document.getElementById('totalDebt').textContent = formatCurrency(getTotalDebt());
        
        // Update recent lists
        displayRecentTransactions(recentTransactions);
        displayUrgentDebts(urgentDebts);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function calculateBalance() {
    let balance = 0;
    userData.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            balance += transaction.amount;
        } else {
            balance -= transaction.amount;
        }
    });
    return balance;
}

function getMonthlyStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let income = 0, expense = 0;
    
    userData.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        if (transactionDate >= startOfMonth) {
            if (transaction.type === 'income') {
                income += transaction.amount;
            } else {
                expense += transaction.amount;
            }
        }
    });
    
    return { income, expense };
}

function getRecentTransactions() {
    return userData.transactions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
}

function getUrgentDebts() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return userData.debts
        .filter(debt => debt.status === 'pending')
        .filter(debt => new Date(debt.deadline) <= nextWeek)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
}

function getTotalDebt() {
    return userData.debts
        .filter(debt => debt.status === 'pending')
        .reduce((total, debt) => total + debt.amount, 0);
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
        const daysLeft = Math.ceil((new Date(debt.deadline) - new Date()) / (1000 * 60 * 60 * 24));
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

function addTransaction() {
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const category = document.getElementById('transactionCategory').value;
    const note = document.getElementById('transactionNote').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        const newTransaction = {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: currentUser.uid,
            type: type,
            amount: amount,
            category: category,
            note: note,
            createdAt: new Date().toISOString()
        };
        
        userData.transactions.push(newTransaction);
        saveUserData();
        
        hideAddTransaction();
        loadTransactions();
        loadDashboard();
        alert('Transaction added successfully!');
    } catch (error) {
        alert('Error adding transaction: ' + error.message);
    }
}

function loadTransactions() {
    if (!currentUser) return;
    
    try {
        const transactions = userData.transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
        userData.transactions = userData.transactions.filter(t => t.id !== id);
        saveUserData();
        
        loadTransactions();
        loadDashboard();
        alert('Transaction deleted successfully!');
    } catch (error) {
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

function addDebt() {
    const name = document.getElementById('debtName').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const deadline = document.getElementById('debtDeadline').value;
    const note = document.getElementById('debtNote').value;
    
    if (!name || !amount || amount <= 0 || !deadline) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const newDebt = {
            id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: currentUser.uid,
            name: name,
            amount: amount,
            deadline: deadline,
            note: note,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        userData.debts.push(newDebt);
        saveUserData();
        
        hideAddDebt();
        loadDebts();
        loadDashboard();
        alert('Debt added successfully!');
    } catch (error) {
        alert('Error adding debt: ' + error.message);
    }
}

function loadDebts() {
    if (!currentUser) return;
    
    try {
        const debts = userData.debts
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
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
        alert('Error deleting debt: ' + error.message);
    }
}

// History Functions
async function loadHistory() {
    if (!currentUser) return;
    
    const filter = document.getElementById('historyFilter').value;
    
    try {
        let query = db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc');
        
        if (filter !== 'all') {
            query = query.where('type', '==', filter);
        }
        
        const snapshot = await query.get();
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
