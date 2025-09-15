const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalSaldoEl = document.getElementById('total-saldo');
const totalUtangEl = document.getElementById('total-utang');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = document.getElementById('type').value.trim().toLowerCase();
    const description = document.getElementById('description').value.trim();
    const amount = parseInt(document.getElementById('amount').value);
    const dueDate = document.getElementById('due-date').value;

    if(!type || !description || !amount) return alert('Isi semua kolom dengan benar!');

    const newTransaction = {
        type,
        description,
        amount,
        dueDate: dueDate || null,
        timestamp: Date.now()
    };

    const newRef = database.ref('transactions').push();
    newRef.set(newTransaction);

    form.reset();
});

database.ref('transactions').on('value', snapshot => {
    list.innerHTML = '';
    let totalSaldo = 0;
    let totalUtang = 0;

    const data = snapshot.val();
    for (let key in data) {
        const item = data[key];

        // Hitung saldo & utang
        if(item.type === 'pemasukan') totalSaldo += item.amount;
        else if(item.type === 'pengeluaran') totalSaldo -= item.amount;
        else if(item.type === 'utang') totalUtang += item.amount;

        // Buat li
        const li = document.createElement('li');
        li.textContent = `${item.type.toUpperCase()}: ${item.description} - Rp${item.amount}` + (item.dueDate ? ` | Jatuh tempo: ${item.dueDate}` : '');

        // Tombol hapus
        const btnDelete = document.createElement('button');
        btnDelete.textContent = 'Hapus';
        btnDelete.addEventListener('click', () => {
            database.ref('transactions/' + key).remove();
        });

        li.appendChild(btnDelete);
        list.appendChild(li);
    }

    totalSaldoEl.textContent = `Rp${totalSaldo}`;
    totalUtangEl.textContent = `Rp${totalUtang}`;
});
