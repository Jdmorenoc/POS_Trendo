import axios from 'axios'
import { db } from './db'

/* eslint-disable no-undef */

// Configuración de Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api/generate'
const OLLAMA_MODEL = 'llama2' // Cambiar a 'llama3.2' cuando esté instalado

/**
 * Obtiene el contexto de datos del POS para enriquecer las respuestas
 */
async function getPOSContext() {
  try {
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    const items = await db.table('items').where('deleted').equals(0).toArray()
    const returns = await db.table('returns').where('deleted').equals(0).toArray()
    const customers = await db.table('customers').where('deleted').equals(0).toArray()

    // Calcular estadísticas
    const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0)
    const totalItems = sales.reduce((sum, s) => sum + (parseInt(s.items) || 0), 0)
    const totalStock = items.reduce((sum, i) => {
      const stock = (i.xs || 0) + (i.s || 0) + (i.m || 0) + (i.l || 0) + (i.xl || 0)
      return sum + stock
    }, 0)
    const totalReturns = returns.reduce((sum, r) => sum + (parseFloat(r.refund_amount || r.amount) || 0), 0)

    // Productos más vendidos
    const productSales = {}
    sales.forEach(s => {
      if (s.product_name) {
        productSales[s.product_name] = (productSales[s.product_name] || 0) + 1
      }
    })
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count} ventas)`)

    // Métodos de pago
    const paymentMethods = {}
    sales.forEach(s => {
      if (s.method) {
        paymentMethods[s.method] = (paymentMethods[s.method] || 0) + 1
      }
    })
    const paymentSummary = Object.entries(paymentMethods)
      .map(([method, count]) => `${method}: ${count} transacciones`)

    // Clientes principales
    const customerSpent = {}
    sales.forEach(s => {
      if (s.customerId) {
        customerSpent[s.customerId] = (customerSpent[s.customerId] || 0) + parseFloat(s.total || 0)
      }
    })
    const topCustomers = Object.entries(customerSpent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, amount]) => {
        const customer = customers.find(c => c.id === id)
        return `${customer?.name || 'Cliente ' + id}: $${Math.round(amount)}`
      })

    // Stock bajo
    const lowStockProducts = items
      .filter(i => {
        const stock = (i.xs || 0) + (i.s || 0) + (i.m || 0) + (i.l || 0) + (i.xl || 0)
        return stock <= 5
      })
      .slice(0, 10)
      .map(i => `${i.product_name} (stock: ${(i.xs || 0) + (i.s || 0) + (i.m || 0) + (i.l || 0) + (i.xl || 0)})`)

    return {
      totalSales: sales.length,
      totalRevenue: Math.round(totalRevenue),
      totalItems: totalItems,
      totalProducts: items.length,
      totalStock: totalStock,
      totalCustomers: customers.length,
      totalReturns: returns.length,
      totalRefundAmount: Math.round(totalReturns),
      averageTicket: sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
      topProducts,
      paymentMethods: paymentSummary,
      topCustomers,
      lowStockProducts
    }
  } catch (error) {
    console.error('Error obteniendo contexto del POS:', error)
    return {}
  }
}

/**
 * Genera un prompt contextualizado con información del POS
 */
async function buildContextPrompt(userQuery) {
  const context = await getPOSContext()
  
  const contextString = `
Eres un asistente de inteligencia artificial para TRENDO, una tienda de ropa.
Tu objetivo es ayudar al propietario con preguntas sobre su negocio: ventas, inventario, clientes, pagos y análisis.

=== RESUMEN DEL NEGOCIO TRENDO ===

MÉTRICAS GENERALES:
- Total de Transacciones: ${context.totalSales || 0}
- Ingresos Totales: $${context.totalRevenue || 0}
- Artículos Vendidos: ${context.totalItems || 0}
- Ticket Promedio: $${context.averageTicket || 0}
- Clientes Registrados: ${context.totalCustomers || 0}

INVENTARIO:
- Productos en Catálogo: ${context.totalProducts || 0}
- Stock Total: ${context.totalStock || 0} unidades
${context.lowStockProducts && context.lowStockProducts.length > 0 ? `
Productos con Stock Bajo:
${context.lowStockProducts.map(p => `  • ${p}`).join('\n')}` : ''}

PRODUCTOS MÁS VENDIDOS:
${context.topProducts && context.topProducts.length > 0 ? context.topProducts.map(p => `  • ${p}`).join('\n') : '  No hay datos'}

MÉTODOS DE PAGO UTILIZADOS:
${context.paymentMethods && context.paymentMethods.length > 0 ? context.paymentMethods.map(p => `  • ${p}`).join('\n') : '  No hay datos'}

MEJORES CLIENTES:
${context.topCustomers && context.topCustomers.length > 0 ? context.topCustomers.map(c => `  • ${c}`).join('\n') : '  No hay datos'}

DEVOLUCIONES:
- Total de Devoluciones: ${context.totalReturns || 0}
- Monto Total Devuelto: $${context.totalRefundAmount || 0}

=== INSTRUCCIONES ===
1. Eres un asesor de negocios especializado en tiendas de ropa
2. Responde en español, claro y directo
3. Usa SIEMPRE los datos reales de Trendo para tus respuestas
4. Haz análisis e interpretaciones de los datos
5. Si hay stock bajo, menciona los productos específicos
6. Da recomendaciones basadas en los datos (ej: qué reabastecerse, qué está funcionando, etc.)
7. Sé profesional pero amigable
8. Si no tienes datos específicos, di "No hay datos registrados para eso"

PREGUNTA DEL USUARIO: ${userQuery}

Responde basándote en los datos de Trendo:`

  return contextString
}

/**
 * Verifica si Ollama está disponible
 */
export async function isOllamaAvailable() {
  try {
    console.log('🔍 Verificando disponibilidad de Ollama en http://localhost:11434...')
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 })
    console.log('✅ Ollama disponible')
    return response.status === 200
  } catch (error) {
    console.error('❌ Ollama no disponible:', error.message)
    console.error('Error code:', error.code)
    console.error('Error config:', error.config?.url)
    return false
  }
}

/**
 * Consulta Ollama con streaming para obtener respuestas
 */
export async function queryOllama(userMessage) {
  try {
    // Verificar que Ollama esté disponible
    const available = await isOllamaAvailable()
    if (!available) {
      return {
        type: 'error',
        content: '⚠️ Ollama no está disponible. Por favor asegúrate de tener Ollama instalado y ejecutándose en tu sistema.\n\nDescarga Ollama desde: https://ollama.ai'
      }
    }

    // Construir el prompt contextualizado
    const contextPrompt = await buildContextPrompt(userMessage)

    console.log('📤 Enviando consulta a Ollama:', userMessage)

    // Llamar a Ollama
    const response = await axios.post(
      OLLAMA_API_URL,
      {
        model: OLLAMA_MODEL,
        prompt: contextPrompt,
        stream: false
      },
      {
        timeout: 120000, // 2 minutos timeout
        responseType: 'json'
      }
    )

    if (response.data && response.data.response) {
      const aiResponse = response.data.response.trim()
      console.log('✅ Respuesta de Ollama:', aiResponse.substring(0, 100) + '...')

      return {
        type: 'text',
        content: aiResponse,
        source: 'ollama'
      }
    } else {
      return {
        type: 'error',
        content: '⚠️ No se recibió respuesta válida de Ollama'
      }
    }
  } catch (error) {
    console.error('❌ Error consultando Ollama:', error.message)
    console.error('Tipo de error:', error.code)
    console.error('Response status:', error.response?.status)
    console.error('Response data:', error.response?.data)

    // Proporcionar ayuda específica según el tipo de error
    if (error.response?.status === 404) {
      return {
        type: 'error',
        content: '❌ Endpoint de Ollama no encontrado (404).\nVerifica que:\n1. Ollama esté instalado\n2. Ejecuta en PowerShell: ollama serve\n3. Intenta nuevamente'
      }
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return {
        type: 'error',
        content: '🔌 Ollama no está ejecutándose. Por favor:\n1. Abre PowerShell\n2. Ejecuta: ollama serve\n3. Deja la ventana abierta\n4. Vuelve a intentar'
      }
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return {
        type: 'error',
        content: '⏱️ La respuesta de Ollama tardó demasiado tiempo. Verifica que tu computadora tiene suficientes recursos.'
      }
    } else if (error.message.includes('ECONNREFUSED')) {
      return {
        type: 'error',
        content: '🔌 Ollama no está ejecutándose. Por favor abre Ollama y vuelve a intentar.'
      }
    } else {
      return {
        type: 'error',
        content: `❌ Error: ${error.message}`
      }
    }
  }
}

/**
 * Función principal para procesar queries del chatbot
 * Reemplaza completamente la funcionalidad anterior
 */
export async function processQuery(userMessage) {
  if (!userMessage || !userMessage.trim()) {
    return {
      type: 'text',
      content: 'Por favor escribe una pregunta.'
    }
  }

  // Convertir a minúsculas para búsqueda
  const messageLower = userMessage.toLowerCase()

  // Comando especial: debug
  if (messageLower.includes('debug') || messageLower.includes('verificar') || messageLower.includes('diagnóstico')) {
    try {
      const context = await getPOSContext()
      const available = await isOllamaAvailable()
      
      return {
        type: 'text',
        content: `📊 DIAGNÓSTICO DEL SISTEMA TRENDO:
        
MÉTRICAS PRINCIPALES:
- Ventas Registradas: ${context.totalSales || 0}
- Ingresos Totales: $${context.totalRevenue || 0}
- Artículos Vendidos: ${context.totalItems || 0}
- Ticket Promedio: $${context.averageTicket || 0}
- Clientes: ${context.totalCustomers || 0}

INVENTARIO:
- Productos: ${context.totalProducts || 0}
- Stock Total: ${context.totalStock || 0} unidades

PRODUCTOS TOP 5:
${context.topProducts && context.topProducts.length > 0 ? context.topProducts.map(p => `  • ${p}`).join('\n') : '  No hay datos'}

STOCK BAJO (≤5 unidades):
${context.lowStockProducts && context.lowStockProducts.length > 0 ? context.lowStockProducts.map(p => `  ⚠️ ${p}`).join('\n') : '  ✅ Todo bien abastecido'}

MÉTODOS DE PAGO:
${context.paymentMethods && context.paymentMethods.length > 0 ? context.paymentMethods.map(p => `  • ${p}`).join('\n') : '  No hay datos'}

DEVOLUCIONES:
- Total: ${context.totalReturns || 0}
- Monto: $${context.totalRefundAmount || 0}

SISTEMA:
- Ollama: ${available ? '✅ Conectado' : '❌ Desconectado'}
- Base de Datos: ✅ Conectada`
      }
    } catch (error) {
      return {
        type: 'error',
        content: '❌ Error en diagnóstico: ' + error.message
      }
    }
  }

  // Procesar con Ollama
  return await queryOllama(userMessage)
}

export default processQuery
