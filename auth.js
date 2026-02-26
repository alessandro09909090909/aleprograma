async function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const mensagem = document.getElementById("mensagem");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagem.innerText = "Erro: " + error.message;
    mensagem.style.color = "red";
  } else {
    mensagem.innerText = "Login realizado com sucesso!";
    mensagem.style.color = "green";

    // Redirecionar após login
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  }
}