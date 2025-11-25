/* eslint-env node */
/* eslint-disable no-undef */
// Test de conexión a Supabase: permite especificar esquema y tabla.
const { createClient } = require('@supabase/supabase-js')

async function main() {
	const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
	const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!url || !key) {
		console.error('Faltan SUPABASE_URL/ANON_KEY o VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY en el entorno')
		process.exit(1)
	}

	// Ping básico al endpoint REST para validar reachability/URL
		try {
			const res = await fetch(`${url}/rest/v1/`, {
				method: 'GET',
				headers: { apikey: key, Authorization: `Bearer ${key}` }
			})
		// 200/404 ambos indican que el endpoint respondió; 404 es normal sin ruta
		if (!(res.ok || res.status === 404)) {
			console.error('Ping al endpoint REST falló:', res.status, await res.text())
			process.exit(1)
		}
	} catch (e) {
		console.error('No se pudo alcanzar el endpoint REST:', e.message || e)
		process.exit(1)
	}

		const supabase = createClient(url, key, { auth: { persistSession: false }, db: { schema: 'public' } })

		// Args: [schema] [table1] [table2] ...
		const schema = process.argv[2] || process.env.SUPABASE_TEST_SCHEMA || 'public'
		const tableArgs = process.argv.slice(3)
		const tables = tableArgs.length > 0 ? tableArgs : [process.env.SUPABASE_TEST_TABLE || (schema === 'trendo' ? 'bill' : 'items')]

		try {
			for (const table of tables) {
				const source = schema === 'public' ? supabase.from(table) : supabase.schema(schema).from(table)
				const { data, error } = await source.select('*').limit(1)
				if (error) {
					if (error.code === 'PGRST205') {
						console.error(`Tabla inexistente: ${schema}.${table}`)
						continue
					}
					const msg = String(error.message || '').toLowerCase()
					if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) {
						console.error(`Sin permisos anon para ${schema}.${table}`)
						continue
					}
					console.error(`Error en ${schema}.${table}:`, error)
					continue
				}
				console.log(`OK ${schema}.${table}:`, data[0] || null)
			}
			// Exit 0 siempre que la conexión base haya funcionado
		process.exit(0)
	} catch (e) {
		console.error('Fallo de conexión:', e.message || e)
		process.exit(3)
	}
}

main()

