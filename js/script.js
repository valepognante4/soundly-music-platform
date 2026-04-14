
const form = document.querySelector('form');

form.addEventListener('submit', (event)=>{
    const pass = document.querySelector('input = [name="password"]').value;
    const confirmPass = document.querySelector('input = [name="confirmPassword"]').value;

    if(pass !== confirmPass){
        event.preventDefault();
        alert("¡Error! Las contraseñas no coinciden.");
    }else{
        console.log("Formulario validado correctamente");
    }
});
