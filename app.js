     // Verifica se está logado
let usuario = localStorage.getItem("usuarioLogado");

if(!usuario) {
    window.location.href = "login.html";
}

// Função logout
function logout() {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "login.html";
}   