console.log("Login script loaded");

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const codeInput = document.getElementById('code');
const step1Error = document.getElementById('error-step1');
const step2Error = document.getElementById('error-step2');

let clearCodeOnNextInput = false;

codeInput.setAttribute('autocomplete', 'off');
codeInput.setAttribute('inputmode', 'numeric');

emailInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        sendCode();
    }
});

passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        sendCode();
    }
});

codeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        verifyCode();
    }
});

codeInput.addEventListener('input', function() {
    if (clearCodeOnNextInput) {
        codeInput.value = codeInput.value.slice(-1);
        clearCodeOnNextInput = false;
    }

    step2Error.innerText = "";
});

async function sendCode() {
    const email = emailInput.value;
    const password = passwordInput.value;
    step1Error.innerText = "";

    try {
        const response = await fetch('api/login-step1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            codeInput.value = "";
            clearCodeOnNextInput = false;
            step2Error.innerText = "";
            codeInput.focus();
        } else {
            step1Error.innerText = result.message || "Kirjautuminen epäonnistui";
        }
    } catch (err) {
        step1Error.innerText = "Yhteysvirhe palvelimeen.";
    }
}

async function verifyCode() {
    const code = codeInput.value;
    step2Error.innerText = "";

    try {
        const response = await fetch('api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok) {
            window.location.href = result.redirect;
        } else {
            step2Error.innerText = result.message;
            clearCodeOnNextInput = true;
            codeInput.focus();
            codeInput.select();
        }
    } catch (err) {
        step2Error.innerText = "Vahvistus epäonnistui.";
        clearCodeOnNextInput = true;
        codeInput.focus();
        codeInput.select();
    }
}
