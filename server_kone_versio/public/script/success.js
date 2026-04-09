// Tyhjennetaan kori
localStorage.removeItem('eduko_cart');

const RESPONSIBLES = {
    '1': { nimi: 'Matti Meikalainen', email: 'matti.ajoneuvo@eduko.fi', puh: '040 123 4567' },
    '2': { nimi: 'Sanni Suortuva', email: 'sanni.hius@eduko.fi', puh: '040 234 5678' },
    '3': { nimi: 'Kalle Koneistaja', email: 'kalle.metalli@eduko.fi', puh: '040 345 6789' },
    '4': { nimi: 'Lauri Lastaus', email: 'lauri.logistiikka@eduko.fi', puh: '040 456 7890' },
    '5': { nimi: 'Paula Putki', email: 'paula.prosessi@eduko.fi', puh: '040 567 8901' },
    '6': { nimi: 'Teemu Turva', email: 'teemu.turva@eduko.fi', puh: '040 678 9012' },
    '7': { nimi: 'Risto Rakentaja', email: 'risto.raksa@eduko.fi', puh: '040 789 0123' },
    '8': { nimi: 'Keijo Kokki', email: 'keijo.kokki@eduko.fi', puh: '040 890 1234' },
    '9': { nimi: 'Seppo Sahko', email: 'seppo.sahko@eduko.fi', puh: '040 901 2345' },
    '10': { nimi: 'Sari Sote', email: 'sari.sote@eduko.fi', puh: '040 012 3456' },
    '11': { nimi: 'Iiro It', email: 'iiro.it@eduko.fi', puh: '040 111 2222' }
};
const DEFAULT_RESPONSIBLE = { nimi: 'Eduko Asiakaspalvelu', email: 'info@eduko.fi', puh: '020 61511' };

async function fetchOrderDetails(orderId) {
    const paths = [
        `/verkkokauppa/api/order-details?id=${encodeURIComponent(orderId)}`,
        `/api/order-details?id=${encodeURIComponent(orderId)}`
    ];

    for (const url of paths) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                continue;
            }

            return await response.json();
        } catch (error) {
            console.error('fetchOrderDetails error:', url, error);
        }
    }

    return null;
}

async function fetchProductDetails(productId) {
    const paths = [
        `/verkkokauppa/api/products/${encodeURIComponent(productId)}?lang=fi`,
        `/api/products/${encodeURIComponent(productId)}?lang=fi`
    ];

    for (const url of paths) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                continue;
            }

            return await response.json();
        } catch (error) {
            console.error('fetchProductDetails error:', url, error);
        }
    }

    return null;
}

async function buildFallbackOrderDetails(orderId) {
    let pendingOrder = null;

    try {
        pendingOrder = JSON.parse(sessionStorage.getItem('eduko_pending_order') || 'null');
    } catch (error) {
        console.error('pending order parse error:', error);
    }

    if (!pendingOrder || !Array.isArray(pendingOrder.items) || pendingOrder.items.length === 0) {
        return null;
    }

    const enrichedItems = await Promise.all(
        pendingOrder.items.map(async item => {
            const product = item.id ? await fetchProductDetails(item.id) : null;
            const responsible = product && product.category_id && RESPONSIBLES[String(product.category_id)]
                ? RESPONSIBLES[String(product.category_id)]
                : DEFAULT_RESPONSIBLE;

            return {
                ...item,
                category_id: product ? String(product.category_id) : null,
                responsible
            };
        })
    );

    return {
        id: orderId,
        amount: Number(pendingOrder.amount) || 0,
        customer_email: pendingOrder.customer?.email || '',
        customer_name: `${pendingOrder.customer?.fname || ''} ${pendingOrder.customer?.lname || ''}`.trim(),
        customer_phone: pendingOrder.customer?.phone || '',
        customer_address: pendingOrder.customer?.address || '',
        customer_postcode: pendingOrder.customer?.postcode || '',
        customer_city: pendingOrder.customer?.city || '',
        created_at: pendingOrder.created_at || new Date().toISOString(),
        items: enrichedItems
    };
}

function formatPrice(value) {
    return Number(value || 0).toFixed(2).replace('.', ',') + ' EUR';
}

function formatDateTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        return new Date().toLocaleString('fi-FI');
    }

    return date.toLocaleString('fi-FI', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatAddress(orderDetails) {
    const cityLine = [orderDetails.customer_postcode, orderDetails.customer_city]
        .filter(Boolean)
        .join(' ');
    const parts = [orderDetails.customer_address, cityLine].filter(Boolean);
    return parts.length ? parts.join(', ') : '-';
}

function ensurePageSpace(pdf, cursorY, neededHeight) {
    if (cursorY + neededHeight <= 780) {
        return cursorY;
    }

    pdf.addPage();
    return 50;
}

function drawWrappedText(pdf, text, x, y, maxWidth, lineHeight) {
    const lines = pdf.splitTextToSize(text || '-', maxWidth);
    pdf.text(lines, x, y);
    return y + Math.max(lines.length, 1) * lineHeight;
}

function buildPdf(orderDetails) {
    const { jsPDF } = window.jspdf || {};
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const createdAtText = formatDateTime(orderDetails.created_at);
    const items = Array.isArray(orderDetails.items) ? orderDetails.items : [];

    pdf.setFillColor(176, 160, 120);
    pdf.rect(30, 30, 535, 110, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Eduko Verkkokauppa', 50, 75);

    pdf.setFontSize(12);
    pdf.text('Tilausvahvistus / kuitti', 50, 95);
    pdf.text(`Paivamaara: ${createdAtText}`, 50, 110);
    pdf.text(`Tilausnumero: ${orderDetails.id || '-'}`, 50, 125);

    pdf.setTextColor(34, 34, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('Asiakastiedot', 50, 170);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Nimi: ${orderDetails.customer_name || '-'}`, 50, 192);
    pdf.text(`Sahkoposti: ${orderDetails.customer_email || '-'}`, 50, 208);
    pdf.text(`Puhelin: ${orderDetails.customer_phone || '-'}`, 50, 224);
    drawWrappedText(pdf, `Osoite: ${formatAddress(orderDetails)}`, 50, 240, 470, 14);

    let cursorY = 285;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('Tilatut tuotteet', 50, cursorY);
    cursorY += 20;

    items.forEach((item, index) => {
        cursorY = ensurePageSpace(pdf, cursorY, 120);

        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const lineTotal = quantity * price;
        const responsible = item.responsible || {};

        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(40, cursorY, 515, 94, 6, 6);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        let textY = drawWrappedText(pdf, `${index + 1}. ${item.name || 'Tuote'}`, 50, cursorY + 18, 300, 14);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Maara: ${quantity} kpl`, 50, textY + 6);
        pdf.text(`Hinta / kpl: ${formatPrice(price)}`, 160, textY + 6);
        pdf.text(`Yhteensa: ${formatPrice(lineTotal)}`, 320, textY + 6);

        textY = drawWrappedText(
            pdf,
            `Vastuuhenkilo: ${responsible.nimi || 'Eduko Asiakaspalvelu'}`,
            50,
            textY + 24,
            470,
            12
        );
        textY = drawWrappedText(
            pdf,
            `Sahkoposti: ${responsible.email || '-'}`,
            50,
            textY,
            470,
            12
        );
        drawWrappedText(
            pdf,
            `Puhelin: ${responsible.puh || '-'}`,
            50,
            textY,
            470,
            12
        );

        cursorY += 108;
    });

    cursorY = ensurePageSpace(pdf, cursorY, 80);
    pdf.setDrawColor(176, 160, 120);
    pdf.setLineWidth(0.5);
    pdf.line(40, cursorY + 5, 555, cursorY + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Tilauksen loppusumma', 50, cursorY + 28);
    pdf.text(formatPrice(orderDetails.amount), 470, cursorY + 28, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    drawWrappedText(
        pdf,
        'Tuotteiden noudosta sovitaan kuitissa nimetyn vastuuhenkilon kanssa.',
        50,
        cursorY + 50,
        470,
        12
    );

    pdf.setTextColor(130, 130, 130);
    pdf.text('Kuitti luotu Eduko Verkkokaupassa.', 45, 810);

    return pdf;
}

function renderSuccessPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const tilausId = urlParams.get('id');
    const orderInfo = document.getElementById('order-info');
    const displayId = document.getElementById('display-id');
    const downloadButton = document.getElementById('download-receipt');
    let orderDetails = null;

    async function ensureOrderDetails() {
        if (!tilausId) {
            return null;
        }

        if (orderDetails) {
            return orderDetails;
        }

        orderDetails = await fetchOrderDetails(tilausId);
        if (!orderDetails) {
            orderDetails = await buildFallbackOrderDetails(tilausId);
        }
        return orderDetails;
    }

    if (tilausId) {
        orderInfo.style.display = 'block';
        displayId.innerText = tilausId;
    }

    if (downloadButton && tilausId) {
        ensureOrderDetails();

        downloadButton.addEventListener('click', async () => {
            downloadButton.disabled = true;

            const latestOrderDetails = await ensureOrderDetails();
            if (!latestOrderDetails) {
                downloadButton.disabled = false;
                alert('Tilaustietoja ei saatu. Yrita hetken kuluttua uudelleen.');
                return;
            }

            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                downloadButton.disabled = false;
                alert('PDF-latausta ei voitu luoda. Yrita myohemmin uudelleen.');
                return;
            }

            const pdf = buildPdf(latestOrderDetails);
            pdf.save(`kuitti-${latestOrderDetails.id || tilausId}.pdf`);
            sessionStorage.removeItem('eduko_pending_order');
            downloadButton.disabled = false;
        });
    }
}

document.addEventListener('DOMContentLoaded', renderSuccessPage);
