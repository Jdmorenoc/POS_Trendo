import { db } from './db'

/**
 * Servicio de chatbot inteligente - MODO LOCAL (Dexie)
 * Maneja consultas y responde basado en datos locales de IndexedDB
 */

// Obtener todos los productos locales
export async function getAllProducts() {
  try {
    const items = await db.table('items').where('deleted').equals(0).toArray()
    return items || []
  } catch (e) {
    console.error('Error fetching products:', e)
    return []
  }
}

// Obtener resumen de inventario
export async function getInventorySummary() {
  try {
    const products = await getAllProducts()
    
    const totalProducts = products.length
    const totalStock = products.reduce((sum, p) => {
      return sum + (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
    }, 0)

    const lowStockCount = products.filter(p => {
      const total = (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
      return total <= 5
    }).length

    const avgPriceTotal = products.reduce((sum, p) => sum + (p.price || 0), 0)
    const avgPrice = products.length > 0 ? Math.round(avgPriceTotal / products.length) : 0

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      avgPrice,
      products
    }
  } catch (e) {
    console.error('Error getting inventory summary:', e)
    return null
  }
}

// Obtener productos con stock bajo
export async function getProductsLowStock(threshold = 5) {
  try {
    const products = await getAllProducts()
    
    const lowStockProducts = products.filter(p => {
      const totalStock = (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
      return totalStock <= threshold
    })
    
    return lowStockProducts
  } catch (e) {
    console.error('Error fetching low stock products:', e)
    return []
  }
}

// Obtener productos más costosos
export async function getExpensiveProducts(limit = 5) {
  try {
    const products = await getAllProducts()
    
    return products
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, limit)
  } catch (e) {
    console.error('Error fetching expensive products:', e)
    return []
  }
}

// Obtener productos más económicos
export async function getCheapProducts(limit = 5) {
  try {
    const products = await getAllProducts()
    
    return products
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, limit)
  } catch (e) {
    console.error('Error fetching cheap products:', e)
    return []
  }
}

// Obtener productos con mayor stock
export async function getHighStockProducts(limit = 5) {
  try {
    const products = await getAllProducts()
    
    const withTotalStock = products.map(p => ({
      ...p,
      totalStock: (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
    }))
    
    return withTotalStock
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, limit)
  } catch (e) {
    console.error('Error fetching high stock products:', e)
    return []
  }
}

// Buscar producto por nombre
export async function searchProductByName(keyword) {
  try {
    const products = await getAllProducts()
    const searchTerm = keyword.toLowerCase()
    
    return products.filter(p => {
      const name = (p.product_name || p.name || '').toLowerCase()
      return name.includes(searchTerm)
    }).slice(0, 10)
  } catch (e) {
    console.error('Error searching products:', e)
    return []
  }
}

// Análisis de tallas
export async function getTallaSizeAnalysis() {
  try {
    const products = await getAllProducts()
    
    const sizeStats = {
      xs: products.reduce((sum, p) => sum + (p.xs || 0), 0),
      s: products.reduce((sum, p) => sum + (p.s || 0), 0),
      m: products.reduce((sum, p) => sum + (p.m || 0), 0),
      l: products.reduce((sum, p) => sum + (p.l || 0), 0),
      xl: products.reduce((sum, p) => sum + (p.xl || 0), 0)
    }
    
    const total = Object.values(sizeStats).reduce((a, b) => a + b, 0)
    
    const percentages = {
      xs: total > 0 ? Math.round((sizeStats.xs / total) * 100) : 0,
      s: total > 0 ? Math.round((sizeStats.s / total) * 100) : 0,
      m: total > 0 ? Math.round((sizeStats.m / total) * 100) : 0,
      l: total > 0 ? Math.round((sizeStats.l / total) * 100) : 0,
      xl: total > 0 ? Math.round((sizeStats.xl / total) * 100) : 0
    }
    
    return { sizeStats, percentages }
  } catch (e) {
    console.error('Error analyzing sizes:', e)
    return null
  }
}

// Productos trending (análisis basado en stock)
export async function getTrendingProducts(limit = 5) {
  try {
    const products = await getAllProducts()
    
    const withScore = products.map(p => {
      const totalStock = (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
      const price = p.price || 0
      // Score basado en stock * precio (productos caros con stock suelen ser trending)
      const trendingScore = totalStock * price
      return {
        ...p,
        totalStock,
        trendingScore
      }
    })
    
    return withScore
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
  } catch (e) {
    console.error('Error fetching trending products:', e)
    return []
  }
}

// Cobertura de stock
export async function getStockCoverage() {
  try {
    const products = await getAllProducts()
    
    const totalValue = products.reduce((sum, p) => {
      const totalStock = (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
      return sum + (totalStock * (p.price || 0))
    }, 0)
    
    const avgDailySales = 5 // Estimación conservadora
    const daysOfCoverage = avgDailySales > 0 ? Math.round(totalValue / (avgDailySales * 100)) : 0
    
    return {
      totalInventoryValue: Math.round(totalValue),
      estimatedDays: daysOfCoverage,
      status: daysOfCoverage < 7 ? 'Bajo' : daysOfCoverage < 30 ? 'Normal' : 'Alto'
    }
  } catch (e) {
    console.error('Error calculating stock coverage:', e)
    return null
  }
}

// Función para procesar preguntas del chatbot
export async function processChatbotQuery(userMessage) {
  const message = userMessage.toLowerCase().trim()
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Calcular stock total para cada producto
    const withTotal = (data || []).map(p => ({
      ...p,
      totalStock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
    }))
    
    // Ordenar por stock descendente y tomar los top
    return withTotal.sort((a, b) => b.totalStock - a.totalStock).slice(0, limit)
  } catch (e) {
    console.error('Error fetching high stock products:', e)
    return []
  }
}

// Obtener productos que se venderán más rápido (stock medio con buen precio)
export async function getTrendingProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Calcular score de trending (stock medio + precio bueno)
    const withScore = (data || []).map(p => {
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      const avgStockPerSize = totalStock / 5
      // Score: productos con stock balanceado entre tallas (entre 3-15 por talla) = buenos candidatos de venta
      const stockScore = Math.abs(avgStockPerSize - 8) < 10 ? avgStockPerSize : avgStockPerSize / 2
      const priceScore = p.price > 0 ? p.price : 0
      const trendingScore = stockScore * (priceScore / 100)
      
      return {
        ...p,
        totalStock,
        trendingScore
      }
    })
    
    return withScore.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, limit)
  } catch (e) {
    console.error('Error fetching trending products:', e)
    return []
  }
}

// Análisis por talla (cuál talla es la más popular por volumen)
export async function getTallaSizeAnalysis() {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    const products = data || []
    const sizeStats = {
      xs: products.reduce((sum, p) => sum + (p.stock_xs || 0), 0),
      s: products.reduce((sum, p) => sum + (p.stock_s || 0), 0),
      m: products.reduce((sum, p) => sum + (p.stock_m || 0), 0),
      l: products.reduce((sum, p) => sum + (p.stock_l || 0), 0),
      xl: products.reduce((sum, p) => sum + (p.stock_xl || 0), 0)
    }
    
    const total = Object.values(sizeStats).reduce((a, b) => a + b, 0)
    const percentages = {}
    
    Object.keys(sizeStats).forEach(size => {
      percentages[size] = total > 0 ? ((sizeStats[size] / total) * 100).toFixed(1) : 0
    })
    
    return { sizeStats, percentages, total }
  } catch (e) {
    console.error('Error analyzing sizes:', e)
    return null
  }
}

// Productos con mejor relación stock/precio (más rentables)
export async function getProfitableProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Score de rentabilidad: precio alto + stock disponible
    const withProfit = (data || []).map(p => {
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      const potentialRevenue = (p.price || 0) * totalStock
      
      return {
        ...p,
        totalStock,
        potentialRevenue: Math.round(potentialRevenue)
      }
    })
    
    return withProfit.sort((a, b) => b.potentialRevenue - a.potentialRevenue).slice(0, limit)
  } catch (e) {
    console.error('Error calculating profitable products:', e)
    return []
  }
}

// Recomendación de qué comprar más (falta stock)
export async function getRestockRecommendations() {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    const products = data || []
    
    // Detectar desbalances en tallas (una talla tiene mucho menos que otras)
    const recommendations = products.map(p => {
      const stocks = [
        { talla: 'XS', stock: p.stock_xs || 0 },
        { talla: 'S', stock: p.stock_s || 0 },
        { talla: 'M', stock: p.stock_m || 0 },
        { talla: 'L', stock: p.stock_l || 0 },
        { talla: 'XL', stock: p.stock_xl || 0 }
      ]
      
      const totalStock = stocks.reduce((sum, s) => sum + s.stock, 0)
      const avgStock = totalStock / 5
      
      // Encontrar tallas con stock bajo vs promedio
      const lowTallas = stocks.filter(s => s.stock < avgStock / 2)
      
      return {
        product_name: p.product_name,
        price: p.price,
        totalStock,
        lowTallas,
        priority: lowTallas.length > 2 ? 'ALTA' : lowTallas.length > 0 ? 'MEDIA' : 'BAJA'
      }
    }).filter(r => r.priority !== 'BAJA')
    
    return recommendations.sort((a, b) => {
      if (a.priority === 'ALTA' && b.priority !== 'ALTA') return -1
      if (a.priority !== 'ALTA' && b.priority === 'ALTA') return 1
      return b.totalStock - a.totalStock
    }).slice(0, 8)
  } catch (e) {
    console.error('Error getting restock recommendations:', e)
    return []
  }
}

// Análisis de cobertura (cuántas semanas de stock tenemos aprox)
export async function getStockCoverageAnalysis() {
  try {
    const summary = await getInventorySummary()
    if (!summary) return null
    
    const { totalStock, totalProducts } = summary
    const avgStockPerProduct = totalProducts > 0 ? totalStock / totalProducts : 0
    
    // Estimación: si vendemos ~2 piezas por producto por semana
    const estimatedWeeklyVelocity = totalProducts * 2
    const coverageWeeks = estimatedWeeklyVelocity > 0 ? (totalStock / estimatedWeeklyVelocity).toFixed(1) : 0
    
    return {
      totalStock,
      estimatedWeeklyVelocity,
      coverageWeeks,
      status: coverageWeeks > 8 ? '✅ Excelente' : coverageWeeks > 4 ? '⚠️ Normal' : '🔴 Crítico'
    }
  } catch (e) {
    console.error('Error analyzing stock coverage:', e)
    return null
  }
}

// ============= FUNCIONES DE VENTAS, FACTURAS Y DEVOLUCIONES (LOCAL) =============

// Obtener resumen de ventas
export async function getSalesSummary() {
  try {
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    
    const totalSales = sales.length
    const uniqueCustomers = new Set(sales.filter(s => s.customerId).map(s => s.customerId)).size
    
    // Calcular promedio de ventas por día (últimos 30 días aproximadamente)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentSales = sales.filter(s => new Date(s.created_at) >= thirtyDaysAgo)
    
    return {
      totalSales,
      uniqueCustomers,
      averageSalesPerDay: (recentSales.length / 30).toFixed(1)
    }
  } catch (e) {
    console.error('Error fetching sales summary:', e)
    return null
  }
}

// Obtener ingresos totales
export async function getTotalRevenue() {
  try {
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    
    if (sales.length === 0) {
      return {
        totalRevenue: 0,
        totalItems: 0,
        totalBills: 0,
        averageTicket: 0
      }
    }
    
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalItems = sales.reduce((sum, sale) => sum + (sale.items || 0), 0)
    const totalBills = sales.length
    
    return {
      totalRevenue: Math.round(totalRevenue),
      totalItems: Math.round(totalItems),
      totalBills: totalBills,
      averageTicket: totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0
    }
  } catch (e) {
    console.error('Error calculating total revenue:', e)
    return null
  }
}

// Obtener métodos de pago más usados
export async function getPaymentMethods() {
  try {
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    
    if (sales.length === 0) {
      return {}
    }
    
    const paymentStats = {}
    
    sales.forEach(sale => {
      const method = (sale.method || 'Efectivo').trim()
      const amount = sale.total || 0
      
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, total: 0 }
      }
      paymentStats[method].count += 1
      paymentStats[method].total += amount
    })
    
    // Redondear totales
    Object.keys(paymentStats).forEach(method => {
      paymentStats[method].total = Math.round(paymentStats[method].total)
    })
    
    return paymentStats
  } catch (e) {
    console.error('Error getting payment methods:', e)
    return {}
  }
}

// Obtener devoluciones
export async function getReturns() {
  try {
    const returns = await db.table('returns').where('deleted').equals(0).toArray()
    
    return returns.map(ret => ({
      ...ret,
      refundAmount: ret.refund_amount || ret.amount || 0
    }))
  } catch (e) {
    console.error('Error fetching returns:', e)
    return []
  }
}

// Obtener resumen de devoluciones
export async function getReturnsSummary() {
  try {
    const returns = await getReturns()
    
    const totalReturns = returns.length
    const totalRefunded = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0)
    
    return {
      totalReturns,
      totalRefunded: Math.round(totalRefunded),
      averageReturn: totalReturns > 0 ? Math.round(totalRefunded / totalReturns) : 0
    }
  } catch (e) {
    console.error('Error getting returns summary:', e)
    return null
  }
}

// Análisis de margen de ganancia
export async function getProfitMarginAnalysis() {
  try {
    const revenue = await getTotalRevenue()
    if (!revenue || revenue.totalRevenue === 0) {
      return null
    }
    
    const products = await getAllProducts()
    
    // Estimación de costo (asumiendo 40% del precio de venta como costo)
    const estimatedCost = products.reduce((sum, p) => {
      const totalStock = (p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)
      return sum + ((p.price || 0) * totalStock * 0.4)
    }, 0)
    
    const estimatedProfit = revenue.totalRevenue - estimatedCost
    const profitMargin = revenue.totalRevenue > 0 ? ((estimatedProfit / revenue.totalRevenue) * 100).toFixed(1) : 0
    
    return {
      totalRevenue: revenue.totalRevenue,
      estimatedCost: Math.round(estimatedCost),
      estimatedProfit: Math.round(estimatedProfit),
      profitMargin: `${profitMargin}%`
    }
  } catch (e) {
    console.error('Error analyzing profit margin:', e)
    return null
  }
}

// Obtener productos más vendidos (basado en stock inicial vs actual)
export async function getTopSellingProducts(limit = 5) {
  try {
    const products = await getAllProducts()
    
    // Ordenar por precio (proxy de popularidad en modo local)
    // En modo local, usamos precio como indicador de demanda
    const topProducts = products
      .map(p => ({
        productId: p.id || p.product_id,
        quantity: Math.round((p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)),
        revenue: Math.round(((p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)) * (p.price || 0))
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
    
    return topProducts
  } catch (e) {
    console.error('Error fetching top selling products:', e)
    return []
  }
}

// Obtener mejores clientes
export async function getTopCustomers(limit = 5) {
  try {
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    
    if (sales.length === 0) {
      return []
    }
    
    const customerSales = {}
    
    sales.forEach(sale => {
      const customer = sale.customerId
      if (!customer) return
      
      const total = sale.total || 0
      
      if (!customerSales[customer]) {
        customerSales[customer] = { customer_name: customer, transaction_count: 0, total_spent: 0 }
      }
      customerSales[customer].transaction_count += 1
      customerSales[customer].total_spent += total
    })
    
    const sorted = Object.entries(customerSales)
      .map(([key, stats]) => ({
        customer_name: stats.customer_name,
        transaction_count: stats.transaction_count,
        total_spent: Math.round(stats.total_spent)
      }))
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, limit)
    
    return sorted
  } catch (e) {
    console.error('Error fetching top customers:', e)
    return []
  }
}

// Análisis de rotación de inventario
export async function getInventoryTurnoverAnalysis() {
  try {
    const products = await getAllProducts()
    const sales = await db.table('sales').where('deleted').equals(0).toArray()
    
    const totalSalesQuantity = sales.reduce((sum, s) => sum + (s.items || 0), 0)
    
    // Calcular días para agotar stock de cada producto
    const turnoverData = products.slice(0, 10).map(product => {
      const currentStock = (product.xs || 0) + (product.s || 0) + (product.m || 0) + (product.l || 0) + (product.xl || 0)
      const dailySalesRate = totalSalesQuantity > 0 ? 0.5 : 0 // Estimación conservadora
      
      return {
        productId: product.id || product.product_id,
        quantitySold: 0, // No tenemos histórico en modo local
        currentStock: currentStock,
        daysToSellOut: currentStock > 0 && dailySalesRate > 0 ? Math.ceil(currentStock / dailySalesRate) : Infinity,
        turnoverRate: dailySalesRate > 0 ? (dailySalesRate / currentStock).toFixed(2) : 'N/A'
      }
    })
    
    return turnoverData
  } catch (e) {
    console.error('Error analyzing inventory turnover:', e)
    return []
  }
}
      
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, total: 0 }
      }
      paymentStats[method].count += 1
      paymentStats[method].total += amount
    })
    
    // Asegurar que los totales sean números redondeados
    Object.keys(paymentStats).forEach(method => {
      paymentStats[method].total = Math.round(paymentStats[method].total)
    })
    
    return paymentStats
  } catch (e) {
    console.error('Error getting payment methods:', e)
    return {}
  }
}

  }
}

// Función para procesar preguntas del chatbot
export async function processChatbotQuery(userMessage) {
  const message = userMessage.toLowerCase().trim()

  // Saludos personalizados
  if (message === 'hola' || message === 'hi' || message === 'hey' || message === 'buenos días' || message === 'buenas noches' || message === 'buenas tardes') {
    const saludos = [
      '¡Hola! 👋 Soy tu asistente de Trendo. ¿Qué información sobre inventario, precios o productos buscas hoy?',
      '¡Hola! 👋 Bienvenido a Trendo. ¿En qué puedo ayudarte? Puedo consultar sobre stock, precios, productos y más.',
      '¡Hola! 🎉 Estoy aquí para ayudarte con información del POS. ¿Qué necesitas saber?'
    ]
    const random = Math.floor(Math.random() * saludos.length)
    return {
      type: 'text',
      content: saludos[random]
    }
  }

  // ============= VERIFICACIONES DE VENTAS PRIMERO (ANTES DE STOCK) =============

  // Resumen de ventas - TEMPRANA Y MUY ESPECÍFICA
  if (message.includes('resumen de ventas')) {
    const summary = await getSalesSummary()
    if (!summary) {
      return { type: 'text', content: 'No pude obtener el resumen de ventas.' }
    }
    return {
      type: 'stats',
      content: {
        'total ventas': summary.totalSales,
        'clientes únicos': summary.uniqueCustomers,
        'promedio ventas/día': summary.averageSalesPerDay
      }
    }
  }

  // Respuestas para consultas sobre inventario bajo
  if (message.includes('bajo stock') || message.includes('stock bajo') || message.includes('productos bajos') || message.includes('qué productos están bajos')) {
    const lowStock = await getProductsLowStock()
    if (lowStock.length === 0) {
      return {
        type: 'text',
        content: '✅ Excelente: todos los productos tienen stock adecuado. No hay productos con stock bajo en este momento.'
      }
    }
    return {
      type: 'table',
      content: lowStock.map(p => ({
        nombre: p.product_name,
        xs: p.stock_xs || 0,
        s: p.stock_s || 0,
        m: p.stock_m || 0,
        l: p.stock_l || 0,
        xl: p.stock_xl || 0,
        precio: `$${p.price || 0}`
      })),
      title: '📦 Productos con stock bajo'
    }
  }

  // Resumen de inventario (PERO NO si dice "ventas")
  if ((message.includes('inventario') || message.includes('stock total') || message.includes('cuánto stock') || message.includes('resumen de inventario')) && !message.includes('ventas')) {
    const summary = await getInventorySummary()
    if (!summary) {
      return { type: 'text', content: 'No pude obtener el resumen de inventario.' }
    }
    return {
      type: 'stats',
      content: {
        totalProducts: summary.totalProducts,
        totalStock: summary.totalStock,
        lowStockCount: summary.lowStockCount,
        avgPrice: summary.avgPrice
      }
    }
  }

  // Productos más caros
  if (message.includes('caro') || message.includes('costoso') || message.includes('precios altos') || message.includes('mayor precio')) {
    const expensive = await getExpensiveProducts()
    if (expensive.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: expensive.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      })),
      title: '💎 Productos más costosos'
    }
  }

  // Productos más económicos
  if (message.includes('barato') || message.includes('económico') || message.includes('precios bajos') || message.includes('menor precio') || message.includes('ofertas')) {
    const cheap = await getCheapProducts()
    if (cheap.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: cheap.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      })),
      title: '💰 Productos más económicos'
    }
  }

  // Consulta sobre tallas específicas
  if (message.includes('talla m') || message.includes('talla l') || message.includes('talla s') || message.includes('talla xl') || message.includes('talla xs')) {
    const products = await getAllProducts()
    
    let talla = ''
    if (message.includes('talla m') || message.includes('m ')) talla = 'm'
    else if (message.includes('talla l')) talla = 'l'
    else if (message.includes('talla s')) talla = 's'
    else if (message.includes('talla xl')) talla = 'xl'
    else if (message.includes('talla xs')) talla = 'xs'

    const stockKey = `stock_${talla}`
    const filtered = products.filter(p => (p[stockKey] || 0) > 0)
    
    if (filtered.length === 0) {
      return { type: 'text', content: `No hay productos disponibles en talla ${talla.toUpperCase()}.` }
    }

    return {
      type: 'table',
      content: filtered.slice(0, 10).map(p => ({
        nombre: p.product_name,
        stock: p[stockKey] || 0,
        precio: `$${p.price || 0}`
      })),
      title: `👕 Productos disponibles talla ${talla.toUpperCase()}`
    }
  }

  // Búsqueda por nombre de producto
  if (message.includes('busca') || message.includes('encuentra') || message.includes('camiseta') || message.includes('pantalón') || message.includes('zapatos')) {
    // Extraer palabras clave
    const keywords = message.replace(/busca|encuentra|producto/g, '').trim()
    if (keywords.length > 2) {
      const results = await searchProductByName(keywords)
      if (results.length === 0) {
        return { type: 'text', content: `No encontré productos que coincidan con "${keywords}".` }
      }
      return {
        type: 'table',
        content: results.map(p => ({
          nombre: p.product_name,
          precio: `$${p.price || 0}`,
          stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
        })),
        title: '🔍 Resultados de búsqueda'
      }
    }
  }

  // Productos con alto stock (bestsellers potenciales)
  if (message.includes('stock alto') || message.includes('más stock') || message.includes('más cantidad') || message.includes('bestseller') || message.includes('productos con más') || message.includes('más en stock')) {
    const highStock = await getHighStockProducts()
    if (highStock.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: highStock.map(p => ({
        nombre: p.product_name,
        stock: p.totalStock,
        precio: `$${p.price || 0}`
      })),
      title: '📊 Productos con mayor stock (Best sellers potenciales)'
    }
  }

  // Productos trending/que se venderán más
  if (message.includes('trending') || message.includes('se venderá más') || message.includes('vender más rápido') || message.includes('más popular') || message.includes('próximos a vender')) {
    const trending = await getTrendingProducts()
    if (trending.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: trending.map(p => ({
        nombre: p.product_name,
        stock: p.totalStock,
        precio: `$${p.price || 0}`,
        score: p.trendingScore.toFixed(0)
      })),
      title: '🔥 Productos que se venderán más rápido'
    }
  }

  // Análisis por tallas
  if (message.includes('análisis talla') || message.includes('talla más popular') || message.includes('cuál talla') || message.includes('análisis de tallas') || message.includes('distribución de tallas')) {
    const sizeAnalysis = await getTallaSizeAnalysis()
    if (!sizeAnalysis) {
      return { type: 'text', content: 'No pude obtener el análisis de tallas.' }
    }
    return {
      type: 'table',
      content: [
        {
          talla: 'XS',
          cantidad: sizeAnalysis.sizeStats.xs,
          porcentaje: `${sizeAnalysis.percentages.xs}%`
        },
        {
          talla: 'S',
          cantidad: sizeAnalysis.sizeStats.s,
          porcentaje: `${sizeAnalysis.percentages.s}%`
        },
        {
          talla: 'M',
          cantidad: sizeAnalysis.sizeStats.m,
          porcentaje: `${sizeAnalysis.percentages.m}%`
        },
        {
          talla: 'L',
          cantidad: sizeAnalysis.sizeStats.l,
          porcentaje: `${sizeAnalysis.percentages.l}%`
        },
        {
          talla: 'XL',
          cantidad: sizeAnalysis.sizeStats.xl,
          porcentaje: `${sizeAnalysis.percentages.xl}%`
        }
      ],
      title: '👕 Análisis de distribución por tallas'
    }
  }

  // Productos rentables (debe venir DESPUÉS de las nuevas consultas)
  if (message.includes('rentable') || message.includes('potencial de venta')) {
    const profitable = await getProfitableProducts()
    if (profitable.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: profitable.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: p.totalStock,
        'ingresos potenciales': `$${p.potentialRevenue || 0}`
      })),
      title: '💰 Productos más rentables (mayor potencial de ingresos)'
    }
  }

  // Recomendaciones de recompra
  if (message.includes('comprar') || message.includes('reabastecer') || message.includes('reponer') || message.includes('qué comprar') || message.includes('desabastecimiento') || message.includes('recomendación de compra')) {
    const recommendations = await getRestockRecommendations()
    if (recommendations.length === 0) {
      return { type: 'text', content: '✅ El inventario está bien balanceado. No hay recomendaciones urgentes de compra.' }
    }
    return {
      type: 'table',
      content: recommendations.map(r => ({
        producto: r.product_name,
        precio: `$${r.price || 0}`,
        'stock total': r.totalStock,
        'tallas bajas': r.lowTallas.map(t => t.talla).join(', ') || 'Ninguna',
        prioridad: r.priority
      })),
      title: '🛒 Recomendaciones de recompra por desbalance de tallas'
    }
  }

  // Cobertura de stock
  if (message.includes('cobertura') || message.includes('semanas de stock') || message.includes('cuánto dura el stock') || message.includes('tiempo de stock')) {
    const coverage = await getStockCoverageAnalysis()
    if (!coverage) {
      return { type: 'text', content: 'No pude calcular la cobertura de stock.' }
    }
    return {
      type: 'stats',
      content: {
        'stock total': coverage.totalStock,
        'velocidad estimada (por semana)': coverage.estimatedWeeklyVelocity,
        'cobertura': `${coverage.coverageWeeks} semanas`,
        'estado': coverage.status
      }
    }
  }

  // ============= CONSULTAS SOBRE VENTAS (CONTINÚAN) =============
  // Ingresos totales (Revenue)
  if (message.includes('ingresos totales')) {
    const revenue = await getTotalRevenue()
    if (!revenue || revenue.totalBills === 0) {
      return { type: 'text', content: '📊 No hay datos de facturas registradas todavía. ¡Realiza una venta para ver tus ingresos!' }
    }
    return {
      type: 'stats',
      content: {
        'ingresos totales': `$${revenue.totalRevenue.toLocaleString()}`,
        'total de items vendidos': revenue.totalItems,
        'número de facturas': revenue.totalBills,
        'ticket promedio': `$${revenue.averageTicket.toLocaleString()}`
      }
    }
  }

  // Productos más vendidos
  if (message.includes('productos más vendidos') || message.includes('productos se venden más')) {
    const topProducts = await getTopSellingProducts()
    if (topProducts.length === 0) {
      return { type: 'text', content: '📊 No hay datos de productos vendidos todavía. ¡Realiza tu primera venta para ver los datos!' }
    }
    return {
      type: 'table',
      content: topProducts.map((p, idx) => ({
        posición: idx + 1,
        'producto id': p.productId,
        'cantidad vendida': p.quantity,
        'ingresos': `$${Math.round(p.revenue)}`
      })),
      title: '🏆 Productos más vendidos'
    }
  }

  // Top clientes
  if (message.includes('mejores clientes') || message.includes('mejor cliente')) {
    const topCustomers = await getTopCustomers()
    if (topCustomers.length === 0) {
      return { type: 'text', content: '👥 No hay clientes registrados todavía. ¡Realiza una venta con cliente identificado para ver los datos!' }
    }
    return {
      type: 'table',
      content: topCustomers.map((c, idx) => ({
        posición: idx + 1,
        cliente: c.customer_name,
        'transacciones': c.transaction_count,
        'total gastado': `$${c.total_spent.toLocaleString()}`
      })),
      title: '👥 Clientes principales'
    }
  }

  // ============= CONSULTAS SOBRE FACTURAS =============

  // Métodos de pago
  if (message.includes('métodos de pago') || message.includes('método de pago')) {
    const methods = await getPaymentMethods()
    if (Object.keys(methods).length === 0) {
      return { type: 'text', content: '💳 No hay datos de métodos de pago registrados todavía. ¡Realiza una venta para ver los datos!' }
    }
    return {
      type: 'table',
      content: Object.entries(methods).map(([method, stats]) => ({
        método: method,
        'número de transacciones': stats.count,
        'total vendido': `$${Math.round(stats.total)}`
      })),
      title: '💳 Métodos de pago más utilizados'
    }
  }

  // Facturas detalladas
  if (message.includes('facturas recientes') || message.includes('últimas facturas') || message.includes('detalle de facturas') || message.includes('facturas') || message.includes('bills')) {
    const bills = await getDetailedBills()
    if (bills.length === 0) {
      return { type: 'text', content: '📄 No hay facturas registradas todavía. ¡Realiza una venta para ver los datos!' }
    }
    return {
      type: 'table',
      content: bills.slice(0, 8).map(bill => ({
        'línea': bill.line_item,
        'cantidad': bill.quantity,
        'precio': `$${bill.price}`,
        'total': `$${Math.round(bill.totalAmount)}`,
        'tipo': bill.type_transaction || 'N/A'
      })),
      title: '📄 Últimas facturas'
    }
  }

  // ============= CONSULTAS SOBRE DEVOLUCIONES =============

  // Resumen de devoluciones
  if (message.includes('resumen de devoluciones') || message.includes('cuántas devoluciones')) {
    const returnsSummary = await getReturnsSummary()
    if (!returnsSummary) {
      return { type: 'text', content: 'No pude calcular el resumen de devoluciones.' }
    }
    return {
      type: 'stats',
      content: {
        'total devoluciones': returnsSummary.totalReturns,
        'monto reembolsado': `$${returnsSummary.totalRefunded.toLocaleString()}`,
        'promedio devolución': `$${returnsSummary.averageReturn}`
      }
    }
  }

  // Artículos devueltos detallados
  if (message.includes('detalles devoluciones') || message.includes('artículos devoluciones') || message.includes('qué se devolvió')) {
    const returns = await getReturns()
    if (returns.length === 0) {
      return { type: 'text', content: '✅ Excelente: no hay devoluciones registradas.' }
    }
    return {
      type: 'table',
      content: returns.slice(0, 8).map(r => ({
        'producto': r.product_id || 'N/A',
        'cantidad devuelta': Math.abs(r.quantity),
        'reembolso': `$${Math.round(r.refundAmount)}`,
        'fecha': r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : 'N/A'
      })),
      title: '🔄 Devoluciones registradas'
    }
  }

  // ============= CONSULTAS SOBRE ANÁLISIS CONTABLE =============

  // Margen de ganancia
  if (message.includes('margen de ganancia')) {
    const margin = await getProfitMarginAnalysis()
    if (!margin) {
      return { type: 'text', content: 'No pude calcular el análisis de margen de ganancia.' }
    }
    return {
      type: 'stats',
      content: {
        'ingresos totales': `$${margin.totalRevenue.toLocaleString()}`,
        'costo estimado': `$${margin.estimatedCost.toLocaleString()}`,
        'ganancia estimada': `$${margin.estimatedProfit.toLocaleString()}`,
        'margen de ganancia': margin.profitMargin
      }
    }
  }

  // Rotación de inventario
  if (message.includes('rotación de inventario') || message.includes('rotación')) {
    const turnover = await getInventoryTurnoverAnalysis()
    if (turnover.length === 0) {
      return { type: 'text', content: 'No hay datos de rotación de inventario.' }
    }
    return {
      type: 'table',
      content: turnover.slice(0, 5).map(t => ({
        'producto': t.productId,
        'vendidos': t.quantitySold,
        'stock actual': t.currentStock,
        'días para agotar': t.daysToSellOut === Infinity ? '∞' : t.daysToSellOut,
        'velocidad': t.turnoverRate
      })),
      title: '⚡ Rotación de inventario (días para agotar stock)'
    }
  }

  // Respuesta clara para preguntas que no se entienden
  if (message.length > 0) {
    return {
      type: 'text',
      content: '❓ No entendí esa pregunta. Por favor, intenta preguntar sobre:\n\n💰 **Ventas:** resumen de ventas, ingresos totales, productos más vendidos, mejores clientes\n\n💳 **Facturas:** métodos de pago, últimas facturas\n\n🔄 **Devoluciones:** resumen de devoluciones\n\n📈 **Análisis:** margen de ganancia, rotación de inventario\n\n📦 **Stock:** inventario, stock bajo, productos económicos, análisis de tallas'
    }
  }

  // Fallback final
  return {
    type: 'text',
    content: '❓ No entendí tu pregunta. Aquí hay cosas que puedo hacer:\n\n📊 **Análisis de Stock:**\n• Productos con más stock\n• Qué se venderá más rápido (trending)\n• Cobertura de stock (semanas)\n• Stock bajo\n\n💰 **Análisis de Ventas:**\n• Resumen de ventas\n• Ingresos totales\n• Productos más vendidos\n• Clientes principales\n\n💳 **Análisis de Facturas:**\n• Métodos de pago\n• Últimas facturas\n• Detalles de transacciones\n\n🔄 **Devoluciones:**\n• Resumen de devoluciones\n• Artículos devueltos\n• Monto reembolsado\n\n📈 **Análisis Contable:**\n• Margen de ganancia\n• Rotación de inventario\n• Análisis de rentabilidad\n• Cobertura de stock'
  }
}
