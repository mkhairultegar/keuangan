const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = document.getElementById('type').value;
    const description = document.getElementById('description').value;
    const amount = parseInt(document.getElementById('amount').value);
    const dueDate = document.getElementById('due-date').value;

    const newTransaction = {
        type,
        description,
        amount,
        dueDate: dueDate || null,
        timestamp: Date.now()
    };

    // Simpan ke Firebase
    const newRef = database.ref('transactions').push();
    newRef.set(newTransaction);

    // Reset form
    form.reset();
});

// Ambil data dari Firebase dan tampilkan
database.ref('transactions').on('value', snapshot => {
    list.innerHTML = '';
    const data = snapshot.val();
    for (let key in data) {
        const item = data[key];
        const li = document.createElement('li');
        li.textContent = `${item.type.toUpperCase()}: ${item.description} - Rp${item.amount}` + (item.dueDate ? ` | Jatuh tempo: ${item.dueDate}` : '');
        list.appendChild(li);
    }
});
