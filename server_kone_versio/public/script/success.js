        // Tyhjennetään kori
        localStorage.removeItem('eduko_cart');

        // Haetaan id URL:sta
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');
        
        if (orderId) {
            document.getElementById('order-info').style.display = 'block';
            document.getElementById('display-id').innerText = orderId;
        }

        // Esimerkki siitä, miten tilausnumero näytetään
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tilausId = urlParams.get('id'); // Esim. ?id=12345
    
    if (tilausId) {
        document.getElementById('order-info').style.display = 'block';
        document.getElementById('display-id').innerText = tilausId;
    }
});