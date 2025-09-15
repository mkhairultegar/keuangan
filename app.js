const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalSaldoEl = document.getElementById('total-saldo');
const totalUtangEl = document.getElementById('total-utang');
const filterType = document.getElementById('filter-type');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = document.getElementById('type').value.trim().toLowerCase();
    const description = document.getElementById('description').value.trim();
    const amount = parseInt(document.getElementById('amount').value);
    const dueDate = document.getElementById('due-date').value;

    if(!type || !description || !amount || amount <=0) return alert('Isi semua kolom dengan benar!');

    const newTransaction = { type, description, amount, dueDate: dueDate || null, timestamp: Date.now() };
    const newRef = database.ref('transactions').push();
    newRef.set(newTransaction);

    form.reset();
});

function renderTransactions(filter="all") {
    database.ref('transactions').once('value', snapshot => {
        list.innerHTML = '';
        let totalSaldo = 0;
        let totalUtang = 0;

        const data = snapshot.val();
        if(!data) return;

        for(let key in data){
            const item = data[key];
            const type = item.type.toLowerCase();

            if(type === 'pemasukan') totalSaldo += Number(item.amount);
            else if(type === 'pengeluaran') totalSaldo -= Number(item.amount);
            else if(type === 'utang') totalUtang += Number(item.amount);

            if(filter !== "all" && type !== filter) continue;

            const li = document.createElement('li');
            li.textContent = `${item.type.toUpperCase()}: ${item.description} - Rp${item.amount}` + (item.dueDate ? ` | Jatuh tempo: ${item.dueDate}` : '');

            // Highlight utang dekat jatuh tempo
            if(type === 'utang' && item.dueDate){
                const due = new Date(item.dueDate);
                const now = new Date();
                const diffDays = Math.ceil((due - now)/(1000*60*60*24));
                if(diffDays <= 3) li.classList.add('utang-soon');
            }

            const btnDelete = document.createElement('button');
            btnDelete.textContent = 'Hapus';
            btnDelete.addEventListener('click', () => {
                database.ref('transactions/' + key).remove();
                renderTransactions(filterType.value);
            });

            li.appendChild(btnDelete);
            list.appendChild(li);
        }

        totalSaldoEl.textContent = `Rp${totalSaldo}`;
        totalUtangEl.textContent = `Rp${totalUtang}`;
    });
}

// Render awal & saat filter berubah
renderTransactions();
filterType.addEventListener('change', () => {
    renderTransactions(filterType.value);
});

// Update otomatis saat ada perubahan database
database.ref('transactions').on('value', () => {
    renderTransactions(filterType.value);
});
