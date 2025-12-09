import { supabase } from './supabaseClient'

// Validación de seguridad
function ensureSupabase() {
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Cliente Supabase no disponible o mal configurado')
  }
}

const NORMALIZED_GENDERS = {
  hombre: 'Hombre',
  masculino: 'Hombre',
  mujer: 'Mujer',
  femenino: 'Mujer'
}

/**
 * Guarda o actualiza un producto en el esquema 'trendo' de Supabase.
 */
export async function insertProductToCloud(productData) {
  ensureSupabase()

  // 🚨 VERIFICACIÓN DE CONEXIÓN REAL
  if (!supabase.auth) {
    const msg = '⚠️ MODO DEMO DETECTADO: Faltan credenciales en .env';
    console.error(msg);
    throw new Error(msg);
  }

  // --- 🛡️ FILTRO ANTI-FANTASMAS V2 ---
  const nombreDetectado = productData.nombre || productData.product_name || productData.name;
  const idDetectado = productData.id || productData.code || productData.codigo;
  const precioDetectado = parseInt(productData.precio || productData.price || 0, 10);

  // REGLA 1: Si no tiene nombre, NO GUARDAR.
  if (!nombreDetectado || nombreDetectado.trim() === '') {
    return { success: false, error: "El producto debe tener un nombre." };
  }

  // REGLA 2: Bloqueo de nombres tipo "Código Automático"
  const pareceCodigoAutomatico = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/.test(nombreDetectado) || 
                                 (nombreDetectado === idDetectado && nombreDetectado.length > 10);

  if (pareceCodigoAutomatico) {
    return { success: false, error: "Nombre inválido (parece automático)." };
  }

  // REGLA 3: Bloqueo de Precio Cero
  if (precioDetectado === 0) {
    return { success: false, error: "El producto debe tener un precio mayor a 0." };
  }

  console.log("📤 Subiendo a esquema 'trendo':", nombreDetectado);

  const genderInput = (productData.gender || productData.gender_prod || productData.genero || '').trim().toLowerCase()
  const generoDetectado = NORMALIZED_GENDERS[genderInput]
  if (!generoDetectado) {
    return { success: false, error: 'Selecciona género válido (Hombre / Mujer).' }
  }

  const payload = {
    product_id: idDetectado, 
    product_name: nombreDetectado,
    price: precioDetectado,
    description: productData.descripcion || productData.description || null,
    gender_prod: generoDetectado,
    stock_xs: parseInt(productData.tallas?.xs || productData.stock_xs || 0, 10),
    stock_s:  parseInt(productData.tallas?.s  || productData.stock_s  || 0, 10),
    stock_m:  parseInt(productData.tallas?.m  || productData.stock_m  || 0, 10),
    stock_l:  parseInt(productData.tallas?.l  || productData.stock_l  || 0, 10),
    stock_xl: parseInt(productData.tallas?.xl || productData.stock_xl || 0, 10)
  };

  if (!payload.product_id) throw new Error('❌ Error: Falta ID del producto.');

  const sanitized = Object.entries(payload).reduce((acc, [key, value]) => {
    if (value !== undefined) acc[key] = value
    return acc
  }, {})

  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .upsert(sanitized, { onConflict: 'product_id' })
      .select()
      .single()

    if (error) throw error
    if (!data) console.warn("⚠️ Guardado sin retorno de datos (revisar RLS).");

    // --- CORRECCIÓN FINAL PARA VISUALIZACIÓN ---
    // Usamos los valores de Supabase (data) si existen. 
    // Si no, usamos el 'payload' que acabamos de enviar para asegurar que el UI se actualice con lo que escribiste.
    const source = data || payload;

    const dataAdaptada = {
      ...source,
      id: source.product_id || payload.product_id,
      code: source.product_id || payload.product_id,
      nombre: source.product_name || payload.product_name,
      gender: source.gender_prod ?? generoDetectado,
      gender_prod: source.gender_prod ?? generoDetectado,
      
      // FORMATO PLANO (BD - stock_x)
      stock_xs: source.stock_xs ?? payload.stock_xs ?? 0,
      stock_s: source.stock_s ?? payload.stock_s ?? 0,
      stock_m: source.stock_m ?? payload.stock_m ?? 0,
      stock_l: source.stock_l ?? payload.stock_l ?? 0,
      stock_xl: source.stock_xl ?? payload.stock_xl ?? 0,

      // FORMATO CORTO (x, s, m...) - Muchos grids usan esto
      xs: source.stock_xs ?? payload.stock_xs ?? 0,
      s: source.stock_s ?? payload.stock_s ?? 0,
      m: source.stock_m ?? payload.stock_m ?? 0,
      l: source.stock_l ?? payload.stock_l ?? 0,
      xl: source.stock_xl ?? payload.stock_xl ?? 0,
      
      // OBJETO TALLAS (Para formularios de edición)
      tallas: {
        xs: source.stock_xs ?? payload.stock_xs ?? 0,
        s: source.stock_s ?? payload.stock_s ?? 0,
        m: source.stock_m ?? payload.stock_m ?? 0,
        l: source.stock_l ?? payload.stock_l ?? 0,
        xl: source.stock_xl ?? payload.stock_xl ?? 0,
        // Agregamos también keys tipo stock_s por si acaso
        stock_xs: source.stock_xs ?? payload.stock_xs ?? 0,
        stock_s: source.stock_s ?? payload.stock_s ?? 0,
        stock_m: source.stock_m ?? payload.stock_m ?? 0,
        stock_l: source.stock_l ?? payload.stock_l ?? 0,
        stock_xl: source.stock_xl ?? payload.stock_xl ?? 0
      }
    };

    console.log('✅ Guardado y Sincronizado:', dataAdaptada);
    return { success: true, data: dataAdaptada }

  } catch (error) {
    console.error('❌ Error Supabase (Insert):', error.message);
    return { success: false, error: error.message }
  }
}

/**
 * Elimina producto de la nube.
 * Mejorado para aceptar tanto el ID suelto como el objeto completo del producto.
 */
export async function deleteProductFromCloud(productId) {
  ensureSupabase()
  
  // 🛡️ LIMPIEZA DE ID: Extraemos el ID si nos envían el objeto completo
  const idReal = (typeof productId === 'object' && productId !== null)
    ? (productId.id || productId.code || productId.product_id || productId.codigo)
    : productId;

  if (!idReal) {
    console.error("❌ Error Delete: Se intentó borrar pero no llegó un ID válido.", productId);
    return { success: false, error: "Falta ID válido" };
  }

  console.log("🗑️ Eliminando de nube ID:", idReal);

  try {
    // Usamos .select() para ver si realmente se borró algo
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .delete()
      .eq('product_id', idReal)
      .select();

    if (error) throw error;
    
    // Si data está vacío, significa que ya no existía en la nube.
    // Devolvemos SUCCESS de todas formas para que el software local lo borre de su lista.
    if (!data || data.length === 0) {
      console.warn("⚠️ El producto no existía en Supabase (quizás era local), pero se confirma borrado.");
    } else {
      console.log('✅ Producto eliminado correctamente de Supabase');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando en Supabase:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los productos de la nube y los adapta al formato local
 */
export async function getProductsFromCloud() {
  ensureSupabase()
  
  const { data, error } = await supabase
    .schema('trendo')
    .from('product')
    .select(`
      product_id,
      product_name,
      description,
      price,
      gender_prod,
      stock_xs,
      stock_s,
      stock_m,
      stock_l,
      stock_xl
    `)

  if (error) throw error
  
  const productosAdaptados = data.map(p => {
    const normalizedGender = NORMALIZED_GENDERS[(p.gender_prod || '').trim().toLowerCase()] || ''
    return {
      ...p,
      id: p.product_id,
      code: p.product_id,
      nombre: p.product_name,
      gender: normalizedGender,
      gender_prod: normalizedGender,
      
      // Formato BD
      stock_xs: p.stock_xs || 0,
      stock_s: p.stock_s || 0,
      stock_m: p.stock_m || 0,
      stock_l: p.stock_l || 0,
      stock_xl: p.stock_xl || 0,

      // Formato Corto
      xs: p.stock_xs || 0,
      s: p.stock_s || 0,
      m: p.stock_m || 0,
      l: p.stock_l || 0,
      xl: p.stock_xl || 0,

      // Objeto Tallas
      tallas: {
        xs: p.stock_xs || 0,
        s: p.stock_s || 0,
        m: p.stock_m || 0,
        l: p.stock_l || 0,
        xl: p.stock_xl || 0,
        stock_xs: p.stock_xs || 0,
        stock_s: p.stock_s || 0,
        stock_m: p.stock_m || 0,
        stock_l: p.stock_l || 0,
        stock_xl: p.stock_xl || 0
      }
    }
  })

  return productosAdaptados
}

/**
 * 📡 SUSCRIPCIÓN EN TIEMPO REAL (NUEVO)
 * Escucha cambios en la base de datos (Supabase) y avisa al software
 * para que se actualice automáticamente sin recargar.
 */
export function subscribeToInventory(callback) {
  ensureSupabase()

  console.log("📡 Conectando al canal de actualizaciones en tiempo real...");

  const channel = supabase
    .channel('cambios-inventario')
    .on(
      'postgres_changes',
      {
        event: '*', // Escuchar INSERT, UPDATE y DELETE
        schema: 'trendo',
        table: 'product'
      },
      (payload) => {
        // payload.eventType será 'INSERT', 'UPDATE' o 'DELETE'
        // payload.new tiene el dato nuevo (en insert/update)
        // payload.old tiene el dato viejo o el ID (en delete)
        console.log("🔔 Cambio en Nube recibido:", payload.eventType);
        
        // Pasamos el evento al callback para que el UI decida qué hacer
        // (Por ejemplo: eliminar de la lista si es DELETE, o agregar si es INSERT)
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("✅ Sincronización automática activada.");
      }
    });

  // Retorna función para desconectar cuando cierres la ventana
  return () => {
    supabase.removeChannel(channel);
  }
}
