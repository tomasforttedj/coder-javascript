// --- CONSTANTES GLOBALES Y REGLAS DE NEGOCIO ---
const COSTO_ENVIO_BASE = 500;
const IVA = 0.21;
const LIMITE_ENVIO_GRATIS = 10000;
const ZONAS_PREMIUM = ["1400", "2000", "5000"]; 
const STORAGE_KEY = 'carritoProductos'; 
const URL_CATALOGO = './productos.json'; 

// --- ESTADO GLOBAL ---
let catalogoGlobal = []; 
let carrito = []; 


// --- SELECTORES DEL DOM ---
const catalogoDOM = document.getElementById('catalogo-productos');
const listaCarritoDOM = document.getElementById('lista-carrito');
const checkEnvio = document.getElementById('check-envio');
const inputCP = document.getElementById('input-cp');
const btnCalcular = document.getElementById('btn-calcular');
const btnLimpiar = document.getElementById('btn-limpiar');
const subtotalSpan = document.getElementById('subtotal-span');
const envioSpan = document.getElementById('envio-span');
const ivaSpan = document.getElementById('iva-span');
const totalFinalSpan = document.getElementById('total-final-span');


// --- 1. CARGA DE DATOS ASÍNCRONOS ---

async function cargarCatalogo() {
    try {
        const respuesta = await fetch(URL_CATALOGO); 
        const datos = await respuesta.json(); 
        catalogoGlobal = datos; 
        
        mostrarCatalogoDOM(catalogoGlobal);
        cargarCarritoDesdeStorage();
        actualizarCarritoDOM();
        handleCalcularPedido(); 
        
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de carga',
            text: 'No se pudo cargar el catálogo de productos. Verifique el archivo JSON.',
        });
        console.error("Error al cargar el catálogo:", error);
    }
}


// --- 2. MANEJO DE STORAGE Y CARRITO ---

function cargarCarritoDesdeStorage() {
    const carritoJSON = localStorage.getItem(STORAGE_KEY);
    if (carritoJSON) {
        carrito = JSON.parse(carritoJSON);
    }
}

function guardarCarritoEnStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
}

// --- 3. LÓGICA DEL SIMULADOR (Cálculos) ---

function calcularSubtotal() {
    return carrito.reduce((acum, item) => acum + (item.precio * item.cantidad), 0);
}

function calcularCostoEnvio(subtotal, codigoPostal) {
    let costoEnvio = COSTO_ENVIO_BASE;

    if (subtotal >= LIMITE_ENVIO_GRATIS) {
        return 0; 
    }
    
    if (ZONAS_PREMIUM.includes(codigoPostal)) {
        costoEnvio += 750; 
    }
    
    return costoEnvio;
}

function calcularTotal(subtotal, costoEnvio) {
    const totalSinIva = subtotal + costoEnvio;
    const montoIVA = totalSinIva * IVA;
    const totalFinal = totalSinIva + montoIVA;
    
    return { subtotal, envio: costoEnvio, montoIVA, totalFinal };
}


// --- 4. GENERACIÓN DE HTML (Manipulación del DOM) ---

function mostrarCatalogoDOM(productos) {
    catalogoDOM.innerHTML = ''; 
    
    productos.forEach(producto => {
        const divCard = document.createElement('div');
        divCard.classList.add('tarjeta-producto');
        
        divCard.innerHTML = `
            <h3>${producto.nombre}</h3>
            <strong>$${producto.precio.toFixed(2)}</strong>
            <button id="btn-agregar-${producto.id}" class="btn-agregar">
                ➕ Agregar
            </button>
        `;
        
        catalogoDOM.appendChild(divCard);
        
        document.getElementById(`btn-agregar-${producto.id}`).addEventListener('click', () => {
            agregarAlCarrito(producto.id);
        });
    });
}

function actualizarCarritoDOM() {
    listaCarritoDOM.innerHTML = ''; 
    
    if (carrito.length === 0) {
        listaCarritoDOM.innerHTML = '<li>El carrito está vacío.</li>';
        handleCalcularPedido(); 
        return; 
    }

    carrito.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.nombre} x ${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}
            <button class="btn-eliminar" data-id="${item.id}">❌</button>
        `;
        listaCarritoDOM.appendChild(li);
    });

    document.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', (e) => {
            const productoId = parseInt(e.target.dataset.id); 
            eliminarDelCarrito(productoId);
        });
    });
}


// --- 5. MANEJADORES DE EVENTOS CLAVE ---

function agregarAlCarrito(productoId) {
    const productoAgregado = catalogoGlobal.find(prod => prod.id === productoId);
    const itemExistente = carrito.find(item => item.id === productoId);

    if (itemExistente) {
        itemExistente.cantidad++;
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `Se agregó una unidad más de ${itemExistente.nombre}`,
            showConfirmButton: false,
            timer: 1500
        });
    } else {
        carrito.push({
            id: productoAgregado.id,
            nombre: productoAgregado.nombre,
            precio: productoAgregado.precio,
            cantidad: 1
        });
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${productoAgregado.nombre} agregado!`,
            showConfirmButton: false,
            timer: 1500
        });
    }

    guardarCarritoEnStorage();
    actualizarCarritoDOM();
    handleCalcularPedido(); 
}

function eliminarDelCarrito(productoId) {
    const itemAEliminar = carrito.find(item => item.id === productoId);
    
    if (!itemAEliminar) return; 

    Swal.fire({
        title: `¿Quitar ${itemAEliminar.nombre}?`,
        text: "Esta acción eliminará el producto del pedido.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = carrito.filter(item => item.id !== productoId);

            Swal.fire(
                'Quitado!',
                `${itemAEliminar.nombre} ha sido eliminado.`,
                'success'
            );

            guardarCarritoEnStorage();
            actualizarCarritoDOM();
            handleCalcularPedido();
        }
    });
}


function handleCalcularPedido() {
    const subtotal = calcularSubtotal();
    
    if (subtotal === 0) {
        mostrarResultadoFinalDOM({ subtotal: 0, envio: 0, montoIVA: 0, totalFinal: 0 });
        return;
    }
    
    let costoEnvio = 0;
    
    if (checkEnvio.checked) {
        const codigoPostal = inputCP.value.trim();
        if (codigoPostal === '') {
             Swal.fire('🛑 Falta Código Postal', 'Por favor, ingrese el Código Postal para el cálculo del envío.', 'warning');
             return; 
        }
        costoEnvio = calcularCostoEnvio(subtotal, codigoPostal);
    }

    const resultado = calcularTotal(subtotal, costoEnvio);
    mostrarResultadoFinalDOM(resultado);
}


function mostrarResultadoFinalDOM(resultado) {
    subtotalSpan.textContent = `$${resultado.subtotal.toFixed(2)}`;
    envioSpan.textContent = `$${resultado.envio.toFixed(2)}`;
    ivaSpan.textContent = `$${resultado.montoIVA.toFixed(2)}`;
    totalFinalSpan.textContent = `$${resultado.totalFinal.toFixed(2)}`;
}


// --- EVENT LISTENERS FINALES ---

checkEnvio.addEventListener('change', () => {
    inputCP.disabled = !checkEnvio.checked;
    if (!checkEnvio.checked) {
        inputCP.value = '';
    }
    handleCalcularPedido();
});

btnCalcular.addEventListener('click', handleCalcularPedido);

btnLimpiar.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    carrito = []; 
    actualizarCarritoDOM(); 
    mostrarResultadoFinalDOM({
        subtotal: 0,
        envio: 0,
        montoIVA: 0,
        totalFinal: 0
    });
    Swal.fire('🗑️ Carrito Limpiado', 'El pedido y los datos guardados han sido eliminados.', 'success');
});


// --- INICIAR SIMULADOR ---
function iniciarSimulador() {
    cargarCatalogo();
}

iniciarSimulador();