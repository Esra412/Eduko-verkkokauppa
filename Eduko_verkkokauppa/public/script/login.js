async function sendCode() {
    const email = document.getElementById("email").value;

    const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.message;

    if (data.success) {
        document.getElementById("code").disabled = false;
    }
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const code = document.getElementById("code").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.message;
}
