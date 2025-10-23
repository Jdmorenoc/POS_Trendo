/* eslint-env node */
/* eslint-disable no-undef */
// Test de conexión a Supabase desde Node
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

		const supabase = createClient(url, key, { auth: { persistSession: false } })
		const table = process.argv[2] || process.env.SUPABASE_TEST_TABLE || 'items'

	// Probar lectura a una tabla pública esperada (items). Cambia por tu tabla si usas otra.
	try {
		const { data, error } = await supabase.from(table).select('*').limit(1)
		if (error) {
					if (error.code === 'PGRST205') {
						console.error(`Conexión OK, pero la tabla '${table}' no existe en el esquema 'public'. Crea la tabla o cambia el nombre (pasa otro nombre como argumento).`)
				process.exit(2)
			}
			const msg = String(error.message || '').toLowerCase()
			if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) {
				console.error('Conexión OK, pero RLS/permiso bloquea la lectura con el anon key. Ajusta políticas de SELECT en la tabla.')
				process.exit(2)
			}
			console.error('Error en consulta:', error)
			process.exit(2)
		}
		console.log('Conexión OK. Resultado de prueba:', data)
		process.exit(0)
	} catch (e) {
		console.error('Fallo de conexión:', e.message || e)
		process.exit(3)
	}
}

main()

