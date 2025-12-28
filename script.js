/* VARIÁVEIS GLOBAIS DE CONTROLE */
let selectedTime = null;
let cartCountElement
let selectedElement = null;
let bookedTimes = [];
let cart = JSON.parse(localStorage.getItem('cartItems')) || []; 

/* ---------------------------------------------------- */
/* ---------------- 1. NAVIGATION --------------------- */
/* ---------------------------------------------------- */
function showSection(sectionId){
    document.querySelectorAll('.section-card').forEach(sec=>sec.style.display='none');
    const el = document.getElementById(sectionId);
    if (el) el.style.display = 'block';
    window.scrollTo(0,0);
    // Garante que os horários e produtos sejam carregados ao mudar de seção
    if(sectionId==='barbearia-section') generateSchedule(); 
    if(sectionId==='produtos-section') renderProducts(); // GARANTIDO AQUI TAMBÉM
}

/* ---------------------------------------------------- */
/* ---------------- 2. LOGIN / ACCOUNT ---------------- */
/* ---------------------------------------------------- */

// Função de inicialização no carregamento da página
window.onload = function() {
    checkLoginStatusOnLoad(); 
    showSection('home-section'); 
    generateSchedule(); // Gera os horários na inicialização (Barbearia)
    if (typeof updateCartDisplay === 'function') {
        updateCartDisplay(); // Tenta atualizar o carrinho, se a função existir.
    }
};

function checkLoginStatusOnLoad() {
    if (localStorage.getItem('ahadi_user')) {
        updateHeaderForLoginStatus(true);
    } else {
        updateHeaderForLoginStatus(false);
    }
}

function updateHeaderForLoginStatus(isLoggedIn) {
    const loginIcon = document.getElementById('login-icon');
    const createAccountBtn = document.getElementById('create-account-btn');
    const userStatus = document.getElementById('user-status');
    const userNameElement = document.getElementById('logged-in-user-name');
    
    if (loginIcon) loginIcon.style.display = isLoggedIn ? 'none' : 'block';
    if (createAccountBtn) createAccountBtn.style.display = isLoggedIn ? 'none' : 'block';
    if (userStatus) userStatus.style.display = isLoggedIn ? 'flex' : 'none';

    if (isLoggedIn) {
        const userStorage = localStorage.getItem('ahadi_user');
        if (userStorage) {
            const user = JSON.parse(userStorage);
            if (userNameElement) {
                const name = user.nome ? user.nome.split(' ')[0] : user.usuario;
                userNameElement.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            }
        }
    }
}

function logout() {
    localStorage.removeItem('ahadi_user');
    updateHeaderForLoginStatus(false);
    alert('Você foi desconectado.');
    showSection('home-section');
    closeLoginPanel();
}

function openCreateAccount(){
    document.getElementById('modalCreateAccount').style.display = 'flex';
}
function closeCreateAccount(){
    document.getElementById('modalCreateAccount').style.display = 'none';
}

function openLoginPanel() {
    document.querySelector('.login-panel').classList.add('open');
    const passInput = document.getElementById('loginPass');
    if (passInput) {
        passInput.addEventListener('keydown', handleLoginEnter);
    }
}

function closeLoginPanel() {
    const loginPanel = document.querySelector('.login-panel');
    if (loginPanel && loginPanel.classList.contains('open')) {
        loginPanel.classList.remove('open');
    }
    const passInput = document.getElementById('loginPass');
    if (passInput) {
        passInput.removeEventListener('keydown', handleLoginEnter);
    }
}

function handleLoginEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        login();
    }
}

function login() {
    const usuarioOuEmail = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value;

    if (!usuarioOuEmail || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const loginData = { usuarioOuEmail, senha };

   fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
})
.then(response => response.json())
.then(data => {
if (data.success) {
    alert('Login realizado com sucesso!');
    
    const panel = document.querySelector('.login-panel');
    if (panel) {
        panel.classList.remove('open');
        // Removemos o style.display = 'none' daqui
    }

    document.getElementById('login-icon').style.display = 'none';
    document.getElementById('create-account-btn').style.display = 'none';
    
    const userStatus = document.getElementById('user-status');
    const userNameSpan = document.getElementById('logged-in-user-name');
    
    if (userStatus && userNameSpan) {
        userNameSpan.innerText = data.usuario.nome;
        userStatus.style.display = 'flex';
    }
} else {
    alert('Erro: ' + data.message);
}

})
.catch(error => console.error('Erro no fetch:', error));

}
    
function createAccount() {
    const nome = document.getElementById('newName').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const usuario = document.getElementById('newUser').value.trim();
    const senha = document.getElementById('newPass').value;

    if (!nome || !email || !usuario || !senha) {
        alert("Preencha todos os campos.");
        return;
    }

    const userData = { nome, email, usuario, senha };

    fetch('http://localhost:3000/api/criar-conta', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        alert('Conta criada com sucesso! Agora você pode fazer login.');
    } else {
        alert('Erro ao criar conta: ' + data.message);
    }
})
.catch(error => console.error('Erro:', error));

}


/* ---------------------------------------------------- */
/* ---------------- 3. AGENDAMENTO -------------------- */
/* ---------------------------------------------------- */

const availableTimes = [
    { time: "09:00", type: 'manha' },
    { time: "10:00", type: 'manha' },
    { time: "11:00", type: 'manha' },
    { time: "12:00", type: 'manha' },
    { time: "13:00", type: 'tarde' },
    { time: "14:00", type: 'tarde' },
    { time: "15:00", type: 'tarde' },
    { time: "16:00", type: 'tarde' },
    { time: "17:00", type: 'tarde' },
    { time: "18:00", type: 'tarde' },
    { time: "19:00", type: 'tarde' },
];

function generateSchedule() {
    const listaManha = document.getElementById('lista-manha');
    const listaTarde = document.getElementById('lista-tarde');

    if (listaManha) listaManha.innerHTML = '';
    if (listaTarde) listaTarde.innerHTML = '';

    availableTimes.forEach(slot => {
        const isBooked = bookedTimes.includes(slot.time);
        let htmlSlot = '';

        if (isBooked) {
            htmlSlot = `
                <div class="schedule-slot-container" style="display:flex; justify-content:space-between; width:100%; max-width: 320px; align-items:center;">
                    <button class="horario-btn indisponivel" data-time="${slot.time}">${slot.time}</button>
                    <button class="btn-primary indisponivel" style="padding: 8px 15px; font-size: 14px; margin-left: 10px;">Indisponível</button>
                </div>
            `;
        } else {
            // Horário Disponível
            htmlSlot = `
                <div class="schedule-slot-container" style="display:flex; justify-content:space-between; width:100%; max-width: 320px; align-items:center;">
                    <button class="horario-btn ${selectedTime === slot.time ? 'selected' : ''}" data-time="${slot.time}" 
                            onclick="selectTimeSlot(this, '${slot.time}')">
                        ${slot.time}
                    </button>
                    <button class="btn-primary btn-agendar-pequeno" 
                            style="padding: 8px 15px; font-size: 14px; margin-left: 10px;" 
                            onclick="openModalPagamento('${slot.time}')">
                        Agendar
                    </button>
                </div>
            `;
        }

        if (slot.type === 'manha' && listaManha) {
            listaManha.insertAdjacentHTML('beforeend', htmlSlot);
        } else if (slot.type === 'tarde' && listaTarde) {
            listaTarde.insertAdjacentHTML('beforeend', htmlSlot);
        }
    });
}

function selectTimeSlot(element, time) {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    selectedElement = element;
    selectedTime = time;
    element.classList.add('selected');
    console.log(`Horário selecionado: ${selectedTime}`);
}

// Função para abrir o Agendamento (Botão da Grade de Horários)
function openModalPagamento(horario) {
    selectedTime = horario; // <<< AQUI ESTAVA O PROBLEMA
    
    console.log("Horário selecionado:", selectedTime);

    const modal = document.getElementById('modalPagamento');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModalPagamento() {
    document.getElementById('modalPagamento').style.display = 'none';
}


function closeCart() {
    document.getElementById('modalCart').style.display = 'none';
}

// Função Única de Copiar (funciona para os dois modais)
function copyPix(idElemento) {
    const campo = document.getElementById(idElemento);
    if (campo) {
        campo.select();
        campo.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(campo.value);
        alert("Código PIX copiado!");
    }
}

function handlePaymentChange() {
    const forma = document.getElementById('modalForma').value;
    const pixDetails = document.getElementById('pixDetails');
    
    if (pixDetails) {
        pixDetails.style.display = (forma === 'PIX') ? 'block' : 'none';
    }
}

/**
 * Funçao Unificada: Confirma o agendamento, marca o horário como ocupado e atualiza a tela.
 */
function confirmarAgendamento() {
    if (!selectedTime) {
        alert("Erro: Nenhum horário selecionado.");
        return;
    }

    // 🔒 Proteção contra elementos que não existem
    const formaPagamentoEl = document.getElementById('modalForma');
    const obsEl = document.getElementById('modalObs');

    const formaPagamento = formaPagamentoEl ? formaPagamentoEl.value : 'Não informado';
    const observacao = obsEl ? obsEl.value.trim() : '';

    // 1. Marca o horário como ocupado
    if (!bookedTimes.includes(selectedTime)) {
        bookedTimes.push(selectedTime);
    }

    // 2. Guarda o horário antes de limpar
    const tempTime = selectedTime;
    selectedTime = null;

    if (selectedElement) {
        selectedElement.classList.remove('active');
        selectedElement = null;
    }

    // 3. Atualiza os horários
    generateSchedule();

    // 4. Log e feedback
    console.log(`✅ Agendamento Confirmado:
Horário: ${tempTime}
Pagamento: ${formaPagamento}
Observação: ${observacao || 'Nenhuma'}
    `);

    alert(`🎉 Horário das ${tempTime} agendado com sucesso!`);

    closeModalPagamento();
}



/* ---------------------------------------------------- */
/* ---------------- 4. PRODUTOS E CARRINHO ------------ */
/* ---------------------------------------------------- */

function parsePrice(priceStr) {
    return Number(priceStr.toString().replace(/[R$\s]/g, '').replace(',', '.')) || 0;
}


/* ---------------------------------------------------- */
/* ---------------- 4. PRODUTOS E CARRINHO (Cont.) ---- */
/* ---------------------------------------------------- */

// Variável para armazenar o filtro de categoria atualmente ativo
let currentCategory = 'todas';

/**
 * 💡 NOVIDADE: Adiciona a lógica de Limite (select de 20, 40, 50...)
 * Esta função chama o filtro e define o limite de exibição.
 */
function renderProducts() {
    const displayCountElement = document.getElementById('displayCount');
    const limit = parseInt(displayCountElement?.value || 50);

    filterProducts(currentCategory, limit);
}

function filterProducts(category, limit = 50) {
    currentCategory = category;
    const productContainer = document.getElementById('produtos-grid');

    let filteredProducts = produtos;
    if (category !== 'todas') {
        filteredProducts = produtos.filter(product => product.category === category);
    }

    filteredProducts = filteredProducts.slice(0, limit);

    if (!productContainer) return;
    productContainer.innerHTML = '';

    filteredProducts.forEach(product => {
        const imagePath = `./images/${product.imageName}`;
        const productHtml = `
            <div class="product-card">
                <img src="${imagePath}" alt="${product.title}">
                <h3>${product.title}</h3>
                <p class="price">${product.price}</p>
                <button class="btn-primary"
                    onclick="addToCart(${product.id}, '${product.title.replace(/'/g, "\\'")}', '${product.price}')">
                    Adicionar ao Carrinho
                </button>
            </div>
        `;
        productContainer.insertAdjacentHTML('beforeend', productHtml);
    });

    // 🔥 AQUI sim faz sentido
    document.querySelectorAll('.categorias button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(`'${currentCategory}'`)) {
            btn.classList.add('active');
        }
    });

    const titleElement = document.querySelector('#produtos-section h2');
    if (titleElement) {
        titleElement.textContent =
            `Produtos de Tabacaria (${filteredProducts.length} de ${produtos.length} Itens)`;
    }
}

const produtos = [
    // PITEIRAS (1 a 41)
    { id: 1, title: "A-PITEIRA (GORILA) EXTRA LONGA", price: "R$ 8,00", category: "piteiras", imageName: "01.jpg" },
    { id: 2, title: "A-PITEIRA CLÁSSICA (PEQUENA)", price: "R$ 8,00", category: "piteiras", imageName: "02.jpg" },
    { id: 3, title: "A-PITEIRA SADHU (EXTRA LONGA)", price: "R$ 8,00", category: "piteiras", imageName: "03.jpg" },
    { id: 4, title: "PITEIRA - A PITEIRA (CLÁSSICA)", price: "R$ 8,00", category: "piteiras", imageName: "04.jpg" },
    { id: 5, title: "PITEIRA BAWG", price: "R$ 7,00", category: "piteiras", imageName: "05.jpg" },
    { id: 6, title: "PITEIRA DE SILICONE SADHU", price: "R$ 12,00", category: "piteiras", imageName: "06.jpg" },
    { id: 7, title: "PITEIRA DE VIDRO SIMPSONS", price: "R$ 25,00", category: "piteiras", imageName: "07.jpg" },
    { id: 8, title: "PITEIRA DE VIDRO TIME", price: "R$ 30,00", category: "piteiras", imageName: "08.jpg" },
    { id: 9, title: "PITEIRA GELO", price: "R$ 8,00", category: "piteiras", imageName: "09.jpg" },
    { id: 10, title: "PITEIRA GELO (TUTU)", price: "R$ 8,00", category: "piteiras", imageName: "10.jpg" },
    { id: 11, title: "PITEIRA GIRLS GREEN HIPER LARGE", price: "R$ 7,00", category: "piteiras", imageName: "11.jpg" },
    { id: 12, title: "PITEIRA LONGA TABEAR", price: "R$ 8,00", category: "piteiras", imageName: "12.jpg" },
    { id: 13, title: "PITEIRA SADHU MAGO (MEGA LARGE)", price: "R$ 7,00", category: "piteiras", imageName: "13.jpg" },
    { id: 14, title: "PITEIRA SESH LARGE", price: "R$ 6,00", category: "piteiras", imageName: "14.jpg" },
    { id: 15, title: "PITEIRA SESH XL", price: "R$ 7,00", category: "piteiras", imageName: "15.jpg" },
    { id: 16, title: "PITEIRA SESH SMALL", price: "R$ 6,00", category: "piteiras", imageName: "16.jpg" },
    { id: 17, title: "PITEIRA TIP CHILLIN AZUL", price: "R$ 15,00", category: "piteiras", imageName: "17.jpg" },
    { id: 18, title: "PITEIRA TIP CHILLIN LARANJA", price: "R$ 15,00", category: "piteiras", imageName: "18.jpg" },
    { id: 19, title: "PITEIRA TONABE DOUBLE COTTON", price: "R$ 9,00", category: "piteiras", imageName: "19.jpg" },
    { id: 20, title: "PITEIRA TONABE MEGA LONGA", price: "R$ 9,00", category: "piteiras", imageName: "20.jpg" },
    { id: 21, title: "PITEIRA TONABE MEGA LONGA (OUTRA REF.)", price: "R$ 9,00", category: "piteiras", imageName: "21.jpg" },
    { id: 22, title: "PITEIRA ELEMENTS (PEQUENA)", price: "R$ 7,90", category: "piteiras", imageName: "22.jpg" },
    { id: 23, title: "PITEIRA GIRLS IN GREEN", price: "R$ 9,00", category: "piteiras", imageName: "23.jpg" },
    { id: 24, title: "PITEIRA SILICONE SADHU", price: "R$ 12,00", category: "piteiras", imageName: "24.jpg" },
    { id: 25, title: "PITEIRA TONABE EXTRA LARGE", price: "R$ 7,00", category: "piteiras", imageName: "25.jpg" },
    { id: 26, title: "PITEIRA VIDRO TIME BOCAL FLAT", price: "R$ 80,00", category: "piteiras", imageName: "26.jpg" },
    { id: 27, title: "PITEIRA VIDRO WIG WAG AZUL", price: "R$ 80,00", category: "piteiras", imageName: "27.jpg" },
    { id: 28, title: "PITEIRA BEM BOLADO POP LARGE VERDE", price: "R$ 6,00", category: "piteiras", imageName: "28.jpg" },
    { id: 29, title: "PITEIRA BEM BOLADO POP SLIM LARANJA", price: "R$ 5,00", category: "piteiras", imageName: "29.jpg" },
    { id: 30, title: "PITEIRA RAW SLIM", price: "R$ 8,00", category: "piteiras", imageName: "30.jpg" },
    { id: 31, title: "PITEIRA VIDRO ANTI-STRESS", price: "R$ 25,00", category: "piteiras", imageName: "31.jpg" },
    { id: 32, title: "PITEIRA VIDRO BOLINHA", price: "R$ 30,00", category: "piteiras", imageName: "32.jpg" },
    { id: 33, title: "PITEIRA VIDRO COLORIDA (AMARELO/VERDE)", price: "R$ 45,00", category: "piteiras", imageName: "33.jpg" },
    { id: 34, title: "PITEIRA VIDRO ESTAMPA ABELHA", price: "R$ 25,00", category: "piteiras", imageName: "34.jpg" },
    { id: 35, title: "PITEIRA VIDRO PRETA", price: "R$ 40,00", category: "piteiras", imageName: "35.jpg" },
    { id: 36, title: "PITEIRA VIDRO PONTA FIRME ROSA", price: "R$ 12,00", category: "piteiras", imageName: "36.jpg" },
    { id: 37, title: "PITEIRA VIDRO SIMPLES BLACK TRUNK", price: "R$ 25,00", category: "piteiras", imageName: "37.jpg" },
    { id: 38, title: "PITEIRA VIDRO SIMPLES TRANSPARENTE", price: "R$ 20,00", category: "piteiras", imageName: "38.jpg" },
    { id: 39, title: "PITEIRA VIDRO SIMPLES TRANSPARENTE (FINA)", price: "R$ 15,00", category: "piteiras", imageName: "39.jpg" },
    { id: 40, title: "PITEIRA VIDRO TRANSPARENTE GRANDE", price: "R$ 30,00", category: "piteiras", imageName: "40.jpg" },
    { id: 41, title: "PITEIRA VIDRO TONABE", price: "R$ 30,00", category: "piteiras", imageName: "41.jpg" },

    // SEDAS (42 a 95)
    { id: 42, title: "bem bolado Brown Large", price: "R$ 6,00", category: "sedas", imageName: "42.jpg" },
    { id: 43, title: "Pop Large Verde", price: "R$ 6,70", category: "sedas", imageName: "43.jpg" },
    { id: 44, title: "Pop Slim Laranja", price: "R$ 6,00", category: "sedas", imageName: "44.jpg" },
    { id: 45, title: "Celulose Slim", price: "R$ 5,00", category: "sedas", imageName: "45.jpg" },
    { id: 46, title: "D2 Slim", price: "R$ 5,00", category: "sedas", imageName: "46.jpg" },
    { id: 47, title: "MC Kevin King Size", price: "R$ 9,00", category: "sedas", imageName: "47.jpg" },
    { id: 48, title: "Pop Slim Pequena", price: "R$ 5,00", category: "sedas", imageName: "48.jpg" },
    { id: 49, title: "Pop Large", price: "R$ 5,00", category: "sedas", imageName: "49.jpg" },
    { id: 50, title: "Pop Brown Large", price: "R$ 6,00", category: "sedas", imageName: "50.jpg" },
    { id: 51, title: "Guru Spirit Tradicional", price: "R$ 6,00", category: "sedas", imageName: "51.jpg" },
    { id: 52, title: "Guru Spirit Brown", price: "R$ 6,00", category: "sedas", imageName: "52.jpg" },
    { id: 53, title: "Leda Celulose", price: "R$ 7,00", category: "sedas", imageName: "53.jpg" },
    { id: 54, title: "Leda King Size Vermelha", price: "R$ 5,00", category: "sedas", imageName: "54.jpg" },
    { id: 55, title: "Papelito Brown", price: "R$ 5,00", category: "sedas", imageName: "55.jpg" },
    { id: 56, title: "Papelito Tradicional Amarela", price: "R$ 7,00", category: "sedas", imageName: "56.jpg" },
    { id: 57, title: "Papelito Kingsize pequena", price: "R$ 4,50", category: "sedas", imageName: "57.jpg" },
    { id: 58, title: "Papelito Slim Verde", price: "R$ 5,00", category: "sedas", imageName: "58.jpg" },
    { id: 59, title: "Zomo Alfalfa", price: "R$ 6,00", category: "sedas", imageName: "59.jpg" },
    { id: 60, title: "Zomo Natural Slim", price: "R$ 6,00", category: "sedas", imageName: "60.jpg" },
    { id: 61, title: "Zomo Pink", price: "R$ 5,00", category: "sedas", imageName: "61.jpg" },
    { id: 62, title: "Raw Classic Black", price: "R$ 15,00", category: "sedas", imageName: "62.jpg" },
    { id: 63, title: "Raw Classic Bege", price: "R$ 15,00", category: "sedas", imageName: "63.jpg" },
    { id: 64, title: "Raw Classic Wide", price: "R$ 9,50", category: "sedas", imageName: "64.jpg" },
    { id: 65, title: "Raw Orgânica Black", price: "R$ 15,00", category: "sedas", imageName: "65.jpg" },
    { id: 66, title: "Raw Orgânica Bege", price: "R$ 12,00", category: "sedas", imageName: "66.jpg" },
    { id: 67, title: "OCB Clássica Preta Pequena", price: "R$ 6,00", category: "sedas", imageName: "67.jpg" },
    { id: 68, title: "OCB Kingsize X-Pert", price: "R$ 9,00", category: "sedas", imageName: "68.jpg" },
    { id: 69, title: "OCB Premium Slim", price: "R$ 8,00", category: "sedas", imageName: "69.jpg" },
    { id: 70, title: "OCB Ultimate Azul", price: "R$ 8,00", category: "sedas", imageName: "70.jpg" },
    { id: 71, title: "Smoking Deluxe", price: "R$ 9,00", category: "sedas", imageName: "71.jpg" },
    { id: 72, title: "Smoking Green", price: "R$ 6,50", category: "sedas", imageName: "72.jpg" },
    { id: 73, title: "Smoking Master", price: "R$ 9,00", category: "sedas", imageName: "73.jpg" },
    { id: 74, title: "Sasso Rolling Paper", price: "R$ 5,00", category: "sedas", imageName: "74.jpg" },
    { id: 75, title: "Keep Rolling Brown", price: "R$ 8,00", category: "sedas", imageName: "75.jpg" },
    { id: 76, title: "Keep Rolling Classic", price: "R$ 8,00", category: "sedas", imageName: "76.jpg" },
    { id: 77, title: "King (Vários Sabores)", price: "R$ 12,00", category: "sedas", imageName: "77.jpg" },
    { id: 78, title: "La Brisa", price: "R$ 5,00", category: "sedas", imageName: "78.jpg" },
    { id: 79, title: "Lion Rolling Circus Beijinhos", price: "R$ 6,00", category: "sedas", imageName: "79.jpg" },
    { id: 80, title: "Smoking Pequena", price: "R$ 5,02", category: "sedas", imageName: "80.jpg" },
    { id: 81, title: "MC Kevin Large", price: "R$ 9,00", category: "sedas", imageName: "81.jpg" },
    { id: 82, title: "Pay Pay Azul", price: "R$ 6,00", category: "sedas", imageName: "82.jpg" },
    { id: 83, title: "Pay Pay Marrom", price: "R$ 7,00", category: "sedas", imageName: "83.jpg" },
    { id: 84, title: "Pure Hemp", price: "R$ 4,50", category: "sedas", imageName: "84.jpg" },
    { id: 85, title: "Sabotagem", price: "R$ 6,00", category: "sedas", imageName: "85.jpg" },
    { id: 86, title: "White Grande", price: "R$ 5,00", category: "sedas", imageName: "86.jpg" },
    { id: 87, title: "White Preta Pequena", price: "R$ 4,50", category: "sedas", imageName: "87.jpg" },
    { id: 88, title: "White Verde Slim", price: "R$ 4,00", category: "sedas", imageName: "88.jpg" },
    { id: 89, title: "Brow 02", price: "R$ 5,00", category: "sedas", imageName: "89.jpg" },
    { id: 90, title: "OCB Wide Pequena", price: "R$ 8,00", category: "sedas", imageName: "90.jpg" },
    { id: 91, title: "King Brow Pequena", price: "R$ 4,00", category: "sedas", imageName: "91.jpg" },
    { id: 92, title: "King Paper Mini Size", price: "R$ 3,50", category: "sedas", imageName: "92.jpg" },
    { id: 93, title: "Tatudobem Brow", price: "R$ 6,00", category: "sedas", imageName: "93.jpg" },
    { id: 94, title: "Tatudobem Slim Amarela", price: "R$ 5,00", category: "sedas", imageName: "94.jpg" },
    { id: 95, title: "Tatudobem Verde", price: "R$ 6,00", category: "sedas", imageName: "95.jpg" },

    // TABACOS (96 a 118)
    { id: 96, title: "La Revolución Onsa", price: "R$ 24,00", category: "tabacos", imageName: "96.jpg" },
    { id: 97, title: "Santorini", price: "R$ 30,00", category: "tabacos", imageName: "97.jpg" },
    { id: 98, title: "Veio Pimenta", price: "R$ 25,00", category: "tabacos", imageName: "98.jpg" },
    { id: 99, title: "Veio Pimenta Preto", price: "R$ 25,00", category: "tabacos", imageName: "99.jpg" },
    { id: 100, title: "Jack Paiol Cravo", price: "R$ 21,00", category: "tabacos", imageName: "100.jpg" },
    { id: 101, title: "Jack Paiol Goiano", price: "R$ 30,00", category: "tabacos", imageName: "101.jpg" },
    { id: 102, title: "Jack Paiol Menta", price: "R$ 20,00", category: "tabacos", imageName: "102.jpg" },
    { id: 103, title: "Jack Paiol Tradicional", price: "R$ 20,00", category: "tabacos", imageName: "103.jpg" },
    { id: 104, title: "Bolados Natural Virgínia", price: "R$ 2,00", category: "tabacos", imageName: "104.jpg" },
    { id: 105, title: "Display The Tog Preto", price: "R$ 20,00", category: "tabacos", imageName: "105.jpg" },
    { id: 106, title: "Hi Tobacco Amarelo", price: "R$ 40,00", category: "tabacos", imageName: "106.jpg" },
    { id: 107, title: "Sasso Tabaco", price: "R$ 30,00", category: "tabacos", imageName: "107.jpg" },
    { id: 108, title: "Sasso Virginia Dourado", price: "R$ 28,00", category: "tabacos", imageName: "108.jpg" },
    { id: 109, title: "Tonabe Tanamao", price: "R$ 30,00", category: "tabacos", imageName: "109.jpg" },
    { id: 110, title: "Acrema", price: "R$ 25,00", category: "tabacos", imageName: "110.jpg" },
    { id: 111, title: "Amsterdam", price: "R$ 23,00", category: "tabacos", imageName: "111.jpg" },
    { id: 112, title: "Dublin Menta", price: "R$ 25,00", category: "tabacos", imageName: "112.jpg" },
    { id: 113, title: "Dublin Pink", price: "R$ 21,00", category: "tabacos", imageName: "113.jpg" },
    { id: 114, title: "Rainbow", price: "R$ 20,00", category: "tabacos", imageName: "114.jpg" },
    { id: 115, title: "Sesh", price: "R$ 28,00", category: "tabacos", imageName: "115.jpg" },
    { id: 116, title: "Tabaquin", price: "R$ 25,00", category: "tabacos", imageName: "116.jpg" },
    { id: 117, title: "Tabear", price: "R$ 23,00", category: "tabacos", imageName: "117.jpg" },
    { id: 118, title: "Tog", price: "R$ 28,00", category: "tabacos", imageName: "118.jpg" },

    // CHARUTOS (119 a 129)
    { id: 119, title: "Dona Flor Robusto", price: "R$ 59,99", category: "charutos", imageName: "119.jpg" },
    { id: 120, title: "Dona Flor Corona", price: "R$ 179,99", category: "charutos", imageName: "120.jpg" },
    { id: 121, title: "Alonso Menendez CC", price: "R$ 49,99", category: "charutos", imageName: "121.jpg" },
    { id: 122, title: "Alonso Menendez MF Robusto", price: "R$ 44,99", category: "charutos", imageName: "122.jpg" },
    { id: 123, title: "Alonso Menendez MF Corona", price: "R$ 59,99", category: "charutos", imageName: "123.jpg" },
    { id: 124, title: "Dellis", price: "R$ 29,99", category: "charutos", imageName: "124.jpg" },
    { id: 125, title: "Green Cubano", price: "R$ 20,00", category: "charutos", imageName: "125.jpg" },
    { id: 126, title: "Lanceiro", price: "R$ 79,99", category: "charutos", imageName: "126.jpg" },
    { id: 127, title: "Monte Pascoal", price: "R$ 89,99", category: "charutos", imageName: "127.jpg" },
    { id: 128, title: "Petit Lonsdale", price: "R$ 44,99", category: "charutos", imageName: "128.jpg" },
    { id: 129, title: "NUB", price: "R$ 100,00", category: "charutos", imageName: "129.jpg" },

    // INCENSOS (130 a 132)
    { id: 130, title: "Alfazema", price: "R$ 15,00", category: "incensos", imageName: "130.jpg" },
    { id: 131, title: "Palo Santo", price: "R$ 15,00", category: "incensos", imageName: "131.jpg" },
    { id: 132, title: "Sândalo", price: "R$ 15,00", category: "incensos", imageName: "132.jpg" },

    // CLIPPERS (133 a 135)
    { id: 133, title: "Clipper Recarregável Grande", price: "R$ 12,00", category: "clippers", imageName: "133.jpg" },
    { id: 134, title: "Clipper Tradicional", price: "R$ 10,00", category: "clippers", imageName: "134.jpg" },
    { id: 135, title: "Clipper PUFF", price: "R$ 45,00", category: "clippers", imageName: "135.jpg" },

    // MAÇARICOS (136 a 140)
    { id: 136, title: "Maçarico Metal", price: "R$ 30,00", category: "macaricos", imageName: "136.jpg" },
    { id: 137, title: "Maçarico Fire", price: "R$ 30,00", category: "macaricos", imageName: "137.jpg" },
    { id: 138, title: "Maçarico Zengaz", price: "R$ 30,00", category: "macaricos", imageName: "138.jpg" },
    { id: 139, title: "Maçarico Sadhu", price: "R$ 50,00", category: "macaricos", imageName: "139.jpg" },
    { id: 140, title: "Maçarico Zengaz 1 Flame", price: "R$ 150,00", category: "macaricos", imageName: "140.jpg" },

    // CUIAS (141 a 149)
    { id: 141, title: "Cuia Gelo", price: "R$ 35,00", category: "cuias", imageName: "141.jpg" },
    { id: 142, title: "Cuia Sadhu Silicone", price: "R$ 140,00", category: "cuias", imageName: "142.jpg" },
    { id: 143, title: "Cuia Cerâmica Grande", price: "R$ 150,00", category: "cuias", imageName: "143.jpg" },
    { id: 144, title: "Cuia Cerâmica Média", price: "R$ 110,00", category: "cuias", imageName: "144.jpg" },
    { id: 145, title: "Cuia Simples Grande", price: "R$ 15,00", category: "cuias", imageName: "145.jpg" },
    { id: 146, title: "Cuia Toka Hauu Mini", price: "R$ 20,00", category: "cuias", imageName: "146.jpg" },
    { id: 147, title: "Cuia Cerâmica Pequena", price: "R$ 50,00", category: "cuias", imageName: "147.jpg" },
    { id: 148, title: "Cuia Tabear G", price: "R$ 20,00", category: "cuias", imageName: "148.jpg" },
    { id: 149, title: "Cuia Tonabe", price: "R$ 20,00", category: "cuias", imageName: "149.jpg" },

    // BANDEJAS (150 a 155)
    { id: 150, title: "Sadhu Grande", price: "R$ 65,00", category: "bandejas", imageName: "150.jpg" },
    { id: 151, title: "Sadhu Média", price: "R$ 40,00", category: "bandejas", imageName: "151.jpg" },
    { id: 152, title: "Papelito M", price: "R$ 50,00", category: "bandejas", imageName: "152.jpg" },
    { id: 153, title: "Paravathi", price: "R$ 40,00", category: "bandejas", imageName: "153.jpg" },
    { id: 154, title: "Sadhu Grande (outra ref.)", price: "R$ 70,00", category: "bandejas", imageName: "154.jpg" },
    { id: 155, title: "Sadhu M", price: "R$ 50,00", category: "bandejas", imageName: "155.jpg" },
    { id: 156, title: "Sadhu P", price: "R$ 50,00", category: "bandejas", imageName: "156.jpg" },

    // CASES (157 a 166)
    { id: 157, title: "Hello Kitty", price: "R$ 40,00", category: "cases", imageName: "157.jpg" },
    { id: 158, title: "Sadhu Impermeável Grande", price: "R$ 90,00", category: "cases", imageName: "158.jpg" },
    { id: 159, title: "Puff Grande Black", price: "R$ 120,00", category: "cases", imageName: "159.jpg" },
    { id: 160, title: "Puff Slim Bege", price: "R$ 90,00", category: "cases", imageName: "160.jpg" },
    { id: 161, title: "Puff Slim Preta", price: "R$ 90,00", category: "cases", imageName: "161.jpg" },
    { id: 162, title: "Puff Slim Roxa", price: "R$ 90,00", category: "cases", imageName: "162.jpg" },
    { id: 163, title: "Puff Slim Verde", price: "R$ 90,00", category: "cases", imageName: "163.jpg" },
    { id: 164, title: "Sadhu Pequena", price: "R$ 90,00", category: "cases", imageName: "164.jpg" },
    { id: 165, title: "Tonabe Grande", price: "R$ 45,00", category: "cases", imageName: "165.jpg" },
    { id: 166, title: "Tonabe Colors", price: "R$ 40,00", category: "cases", imageName: "166.jpg" },
    { id: 167, title: "Guru Spirit Black", price: "R$ 40,00", category: "cases", imageName: "167.jpg" },

    // SLICKS (168 a 186)
    { id: 168, title: "Slick Squad 10ml", price: "R$ 30,00", category: "slicks", imageName: "168.jpg" },
    { id: 169, title: "Slick Cultura Dab Abelha", price: "R$ 35,00", category: "slicks", imageName: "169.jpg" },
    { id: 170, title: "Slick Lego", price: "R$ 50,00", category: "slicks", imageName: "170.jpg" },
    { id: 171, title: "Slick Médio Diversos 3ml", price: "R$ 12,00", category: "slicks", imageName: "171.jpg" },
    { id: 172, title: "Slick Mini 2ml", price: "R$ 10,00", category: "slicks", imageName: "172.jpg" },
    { id: 173, title: "Slick Patinhas 3ml", price: "R$ 15,00", category: "slicks", imageName: "173.jpg" },
    { id: 174, title: "Slick Porquinho 5ml", price: "R$ 25,00", category: "slicks", imageName: "174.jpg" },
    { id: 175, title: "Slick Vidro Tampa Derretida 5ml", price: "R$ 15,00", category: "slicks", imageName: "175.jpg" },
    { id: 176, title: "Slick Ricky 5ml", price: "R$ 20,00", category: "slicks", imageName: "176.jpg" },
    { id: 177, title: "Slick Sadhu Vidro", price: "R$ 50,00", category: "slicks", imageName: "177.jpg" },
    { id: 178, title: "Slick Nozes", price: "R$ 25,00", category: "slicks", imageName: "178.jpg" },
    { id: 179, title: "Slick Toka Hauu Grande", price: "R$ 40,00", category: "slicks", imageName: "179.jpg" },
    { id: 180, title: "Slick Tonabe Pequeno", price: "R$ 12,00", category: "slicks", imageName: "180.jpg" },
    { id: 181, title: "Slick Ursinho", price: "R$ 25,00", category: "slicks", imageName: "181.jpg" },
    { id: 182, title: "Slick Comeia", price: "R$ 35,00", category: "slicks", imageName: "182.jpg" },
    { id: 183, title: "Slick Vidro Gelo 9ml", price: "R$ 50,00", category: "slicks", imageName: "183.jpg" },
    { id: 184, title: "Slick Patinho Divisória", price: "R$ 50,00", category: "slicks", imageName: "184.jpg" },
    { id: 185, title: "Slick Sadhu Nuvem 22ml", price: "R$ 35,00", category: "slicks", imageName: "185.jpg" },
    { id: 186, title: "Slick Sadhu Silicone 11ml", price: "R$ 30,00", category: "slicks", imageName: "186.jpg" },

    // ACESSÓRIOS (187 a 219)
    { id: 187, title: "Bolador Hitobacco King Size", price: "R$ 40,00", category: "acessorios", imageName: "187.jpg" },
    { id: 188, title: "Bolador Hitobacco Pequeno", price: "R$ 35,00", category: "acessorios", imageName: "188.jpg" },
    { id: 189, title: "Bongs Pequenos", price: "R$ 60,00", category: "acessorios", imageName: "189.jpg" },
    { id: 190, title: "Bong Colorido Sadhu", price: "R$ 50,00", category: "acessorios", imageName: "190.jpg" },
    { id: 191, title: "Limpador de Piteira RAW", price: "R$ 3,00", category: "acessorios", imageName: "191.jpg" },
    { id: 192, title: "Pote Hermético 120ml", price: "R$ 25,00", category: "acessorios", imageName: "192.jpg" },
    { id: 193, title: "Pote Reversível 80ml", price: "R$ 35,00", category: "acessorios", imageName: "193.jpg" },
    { id: 194, title: "Porta Cigarro Papelito", price: "R$ 20,00", category: "acessorios", imageName: "194.jpg" },
    { id: 195, title: "Porta Cigarros Tradicional", price: "R$ 15,00", category: "acessorios", imageName: "195.jpg" },
    { id: 196, title: "Porta Isqueiro", price: "R$ 15,00", category: "acessorios", imageName: "196.jpg" },
    { id: 197, title: "Cortador de Charuto Prata", price: "R$ 50,00", category: "acessorios", imageName: "197.jpg" },
    { id: 198, title: "Cortador de Charuto Preto", price: "R$ 45,00", category: "acessorios", imageName: "198.jpg" },
    { id: 199, title: "Clip Cordão Puff Life", price: "R$ 45,00", category: "acessorios", imageName: "199.jpg" },
    { id: 200, title: "Tesoura de Metal Clássica", price: "R$ 50,00", category: "acessorios", imageName: "200.jpg" },
    { id: 201, title: "Tesoura de Metal Simples", price: "R$ 12,00", category: "acessorios", imageName: "201.jpg" },
    { id: 202, title: "Tesoura Metal Pequena Dobrável", price: "R$ 35,00", category: "acessorios", imageName: "202.jpg" },
    { id: 203, title: "Tesoura Metal Grande Dobrável", price: "R$ 40,00", category: "acessorios", imageName: "203.jpg" },
    { id: 204, title: "Tesoura Plástico Dobrável", price: "R$ 25,00", category: "acessorios", imageName: "204.jpg" },
    { id: 205, title: "Kit Tesoura + Cuia Sadhu", price: "R$ 50,00", category: "acessorios", imageName: "205.jpg" },
    { id: 206, title: "Gas Para Isqueiros", price: "R$ 30,00", category: "acessorios", imageName: "206.jpg" },
    { id: 207, title: "Papel Alumínio Narguilé", price: "R$ 25,00", category: "acessorios", imageName: "207.jpg" },
    { id: 208, title: "Pinça Dab Toka Hauu", price: "R$ 25,00", category: "acessorios", imageName: "208.jpg" },
    { id: 209, title: "Toka Hauu Box Metal c/ Bandeja", price: "R$ 24,00", category: "acessorios", imageName: "209.jpg" },
    { id: 210, title: "Dichavador Metal Colorido 3 Compart.", price: "R$ 50,00", category: "acessorios", imageName: "210.jpg" },
    { id: 211, title: "Dichavador Metal Manivela 3 Compart.", price: "R$ 77,00", category: "acessorios", imageName: "211.jpg" },
    { id: 212, title: "Dichavador Metal Caveira", price: "R$ 60,00", category: "acessorios", imageName: "212.jpg" },
    { id: 213, title: "Dichavador Tonabe Plástico", price: "R$ 30,00", category: "acessorios", imageName: "213.jpg" },
    { id: 214, title: "Dichavador Coco", price: "R$ 28,00", category: "acessorios", imageName: "214.jpg" },
    { id: 215, title: "Dichavador Kings Grande", price: "R$ 25,00", category: "acessorios", imageName: "215.jpg" },
    { id: 216, title: "Dichavador Zomo", price: "R$ 25,00", category: "acessorios", imageName: "216.jpg" },
    { id: 217, title: "Dichavador Grinder Branco", price: "R$ 15,00", category: "acessorios", imageName: "217.jpg" },
    { id: 218, title: "Dichavador Grinder Kings", price: "R$ 15,00", category: "acessorios", imageName: "218.jpg" },
    { id: 219, title: "Dichavador Tonabe Colorido", price: "R$ 40,00", category: "acessorios", imageName: "219.jpg" }
    // A lista tem 219 produtos no total. Os itens de 210 a 219 (Dichavadores) foram movidos para a categoria "Acessórios"
    // conforme o seu último feedback, mantendo a contagem de 219.
];

function closeCartModal() {
    document.getElementById('modalCart').style.display = 'none';
}

function removeItemFromCart(index) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    if (index >= 0 && index < cart.length) {
        const removedItemName = cart[index].name;
        cart.splice(index, 1); // Remove 1 item na posição 'index'
        localStorage.setItem('cartItems', JSON.stringify(cart));
        updateCartDisplay(); // Atualiza a exibição
        alert(`"${removedItemName}" removido do carrinho.`);
    }
}

/**
 * Atualiza a contagem de itens na sacola (ícone) e re-renderiza a lista de itens
 * dentro do modal do carrinho (#modalCart).
 */
function updateCartDisplay() {
    const cartList = document.getElementById('cartItems');
    const finalTotalElement = document.getElementById('cartTotal');

    if (!cartList || !finalTotalElement) return;

    let total = 0;
    cartList.innerHTML = '';

    cart.forEach((item, index) => {
        const itemPrice = Number(item.price) || 0;
        const subtotal = itemPrice * item.quantity;
        total += subtotal;

        cartList.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div>
                    <strong>${item.title}</strong><br>
                    <small>R$ ${itemPrice.toFixed(2)} x ${item.quantity}</small>
                </div>
                <div>R$ ${subtotal.toFixed(2)}</div>
                <button onclick="removeItemFromCart(${index})" style="background:none;border:none;color:#f00;cursor:pointer;font-weight:bold;margin-left:10px;">X</button>
            </div>
        `;
    });

    finalTotalElement.textContent = 'Total: R$ ' + total.toFixed(2);
}


    // 3. Renderiza a lista de itens no modal do carrinho
    const cartList = document.getElementById('cartItems');{
    const finalTotalElement = document.getElementById('finalTotal');
    
    if (cartList) {
        let total = 0;
        let cartHtml = '';

        if (cart.length === 0) {
            cartHtml = '<p style="color: #ccc; text-align: center;">Seu carrinho está vazio.</p>';
        } else {
            cart.forEach((item, index) => {
                // item.price já é um número graças ao parsePrice
                const itemPrice = item.price; 
                const itemTotal = itemPrice * item.quantity;
                total += itemTotal;
                
                cartHtml += `
                    <div class="cart-item">
                        <div class="item-info">
                            ${item.name} (${item.quantity}x)
                        </div>
                        <div class="item-price">R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
                        <button onclick="removeItemFromCart(${index})" style="background: none; border: none; color: #f00; cursor: pointer; font-weight: bold; margin-left: 10px;">
                            X
                        </button>
                    </div>
                `;
            });
        }
        
        cartList.innerHTML = cartHtml;
        
        // 4. Atualiza o total final
        if (finalTotalElement) {
            finalTotalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        }
    }
    
    console.log("Carrinho de compras atualizado.");
}

// Chamada da função para renderizar os produtos quando a página é carregada
document.addEventListener("DOMContentLoaded", () => {
    

    updateCartDisplay(); // Para carregar o carrinho do Local Storage
});

function loginGoogle() {
    alert("O login via Google está sendo configurado. Por favor, utilize seu usuário e senha.");
}

function logout() {
    const userStatus = document.getElementById('user-status');
    if (userStatus) userStatus.style.display = 'none';

    const loginIcon = document.getElementById('login-icon');
    const createBtn = document.getElementById('create-account-btn');
    
    if (loginIcon) loginIcon.style.display = 'block';
    if (createBtn) createBtn.style.display = 'block';

    const userNameSpan = document.getElementById('logged-in-user-name');
    if (userNameSpan) userNameSpan.innerText = 'Usuário';
    
    alert('Sessão encerrada com sucesso!');
}

function copyPixCodeCart() {
    const pixText = document.getElementById('pixCodeCart');
    if (pixText) {
        pixText.select();
        pixText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(pixText.value);
        alert("Código PIX copiado com sucesso!");
    }
}

function checkout() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalContainer = document.getElementById('cartTotal');
    const cart = JSON.parse(localStorage.getItem('cartItems')) || [];

    if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    // Calcula o total dinamicamente
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const valorTotal = 'R$ ' + total.toFixed(2).replace('.', ',');

    // Limpa e renderiza o modal PIX
    cartItemsContainer.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.5); border: 2px solid #e6b300; padding: 20px; border-radius: 12px; margin-top: 10px;"> 
            <p style="color: #e6b300; font-weight: bold; margin-bottom: 10px;">Pagar com PIX</p>
            
            <div style="width: 210px; height: 210px; margin: 0 auto; overflow: hidden; border-radius: 10px; border: 2px solid #333; background: #fff;">
                <img src="images/QRcode.png" alt="QR Code PIX" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            
            <label style="color: #ccc; font-size: 0.9em; display: block; margin-top: 15px;">Pix Copia e Cola:</label>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <textarea id="pixCodeCart" readonly style="flex: 1; min-height: 40px; resize: none; padding: 8px; border: 1px dashed #e6b300; background-color: #000; color: #fff; border-radius: 4px; font-size: 10px; font-family: monospace;">076f9685-d61e-4ad6-95d7-9e1566404628</textarea>
                <button type="button" onclick="copyPixCodeCart()" style="background:#e6b300; color:#000; border:none; padding: 0 10px; border-radius: 4px; font-weight: bold; cursor: pointer; height: 40px;">Copiar</button>
            </div>

            <p style="color: #ccc; font-size: 0.85em; margin-top: 15px;">Total: ${valorTotal}</p>

            <a href="https://wa.me/5579998422845?text=Olá, segue o comprovante do pagamento de ${valorTotal}" target="_blank" style="display: block; background: #25D366; color: #fff; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; font-size: 0.9em;">
                WhatsApp: Enviar Comprovante
            </a>
        </div>
    `;

    // Oculta o total antigo se existir
    if (cartTotalContainer) cartTotalContainer.style.display = 'none';

    // Oculta qualquer botão "Finalizar" antigo
    const botoes = document.querySelectorAll('#modalCart button');
    botoes.forEach(function(btn) {
        if (btn.innerText.includes('Finalizar')) {
            btn.style.display = 'none';
        }
    });
}


    // Limpa o carrinho após checkout
    cart = [];{
    localStorage.setItem('cartItems', JSON.stringify(cart));

    // Atualiza o ícone do carrinho
    if (cartCountElement) {
        cartCountElement.textContent = '0';
        cartCountElement.style.display = 'none';
    }

    console.log("Checkout concluído. Carrinho limpo e total exibido.");
}

function copyPixCodeCart() {
    const pixText = document.getElementById('pixCodeCart');
    if (pixText) {
        pixText.select();
        pixText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(pixText.value);
        alert("Código PIX copiado com sucesso!");
    }
}

function openModalVIP() {
    const modal = document.getElementById('modalVIP');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModalVIP() {
    const modal = document.getElementById('modalVIP');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        countEl.textContent = cart.reduce((s, i) => s + i.quantity, 0);
        countEl.style.display = cart.length ? 'inline-block' : 'none';
    }
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    cart.forEach(item => {
        const itemHtml = `
            <div class="cart-item">
                <div class="cart-info">
                    <h4>${item.title}</h4>
                    <p>R$ ${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div class="cart-controls">
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    
                    <button class="btn-delete" onclick="removeFromCart(${item.id})">❌</button>
                </div>
            </div>
        `;
        cartContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    updateCartCount();
    updateCartTotal();
    localStorage.setItem('cartItems', JSON.stringify(cart));
}

function addToCart(id, title, price) {
    const priceValue = parsePrice(price); // garante número
    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, title, price: priceValue, quantity: 1 });
    }

    renderCart();
    updateCartTotal(); // 🔴 ISSO É O QUE FALTAVA
    alert(`"${title}" adicionado ao carrinho!`);
}




function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) removeFromCart(id);
    else renderCart();
}

function openCartModal() {
    const modal = document.getElementById('modalCart');
    if (modal) {
        modal.style.display = 'flex';
        renderCart();
    }
}

function closeCartModal() {
    const modal = document.getElementById('modalCart');
    if (modal) modal.style.display = 'none';
}

// Inicializa contador ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});

function updateCartTotal() {
    const cartList = document.getElementById('cartItems');
    const finalTotalElement = document.getElementById('cartTotal');

    let total = 0;

    cart.forEach(item => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);

        if (!isNaN(price) && !isNaN(quantity)) {
            total += price * quantity;
        }
    });

    if (finalTotalElement) {
        finalTotalElement.innerHTML =
            'Total: R$ ' + total.toFixed(2).replace('.', ',');
    }
}

function selecionarHorario(el, horario) {
    document.querySelectorAll('.horario').forEach(h => {
        h.classList.remove('active');
    });

    el.classList.add('active');
    selectedTime = horario;

    console.log("Horário selecionado:", selectedTime);
}

