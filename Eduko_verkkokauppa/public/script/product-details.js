document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');

            // 1. Poista 'active' kaikista painikkeista
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // 2. Piilota kaikki paneelit ja poista niistä 'active'
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                pane.style.display = 'none'; // Pakotetaan piiloon
            });

            // 3. Aktivoi klikattu painike
            button.classList.add('active');

            // 4. Näytä oikea paneeli
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.style.display = 'block'; // Pakotetaan näkyviin
            }
        });
    });
});