# ❓ PREGUNTAS FRECUENTES - Chatbot Ollama

## Instalación

### P: ¿Dónde descargo Ollama?
**R:** En https://ollama.ai - Busca el botón de descarga para Windows.

### P: ¿Ollama es gratuito?
**R:** Sí, completamente gratuito. Es software open-source.

### P: ¿Ollama funciona en Mac/Linux?
**R:** Sí, Ollama funciona en Windows, Mac y Linux. Ve a ollama.ai para descargar.

### P: ¿Necesito internet para usar Ollama después de instalado?
**R:** No. Solo necesitas internet para:
- Descargar Ollama (primera vez)
- Descargar el modelo llama2 (primera vez)
Después, funciona 100% sin internet.

### P: ¿Cuánto espacio en disco necesito?
**R:** 
- Ollama: ~500MB
- llama2: ~4GB
- Total: ~4.5GB

### P: ¿Puedo descargar mientras uso Trendo?
**R:** Sí, pero será lento. Es mejor descargar primero y luego usar.

---

## Uso

### P: ¿Qué debo hacer para que el chatbot funcione?
**R:** 
1. Ollama descargado
2. PowerShell abierto con `ollama serve`
3. Ese comando DEBE estar ejecutándose mientras usas Trendo

### P: ¿Qué significa "✅ Ollama conectado"?
**R:** Significa que Ollama está ejecutándose correctamente y el chatbot puede comunicarse con él.

### P: ¿Qué significa "❌ Ollama no disponible"?
**R:** Significa que:
- Ollama no está instalado, O
- PowerShell no tiene `ollama serve` ejecutándose, O
- PowerShell fue cerrado

Solución: Abre PowerShell y ejecuta `ollama serve`

### P: ¿El chatbot funciona sin mi intervención?
**R:** El chatbot funciona mientras:
- Trendo POS esté abierto
- PowerShell tenga `ollama serve` ejecutándose
- Tengas conexión local (no requiere internet después de instalado)

### P: ¿Puedo hacer preguntas en diferentes idiomas?
**R:** Sí, llama2 soporta español, inglés y otros idiomas.

---

## Rendimiento

### P: ¿Por qué tarda tanto en responder?
**R:** Es normal. El modelo IA llama2 corre en tu PC:
- Primera respuesta: 10-30 segundos
- Respuestas posteriores: 5-20 segundos
Esto es mucho más rápido que esperar a un servidor en la nube.

### P: ¿Cómo hago que sea más rápido?
**R:** Opciones:
1. Cierra otros programas pesados
2. Usa un modelo más pequeño: `ollama pull orca-mini:3b`
3. Actualiza: edita ollamaService.js línea 6 a `const OLLAMA_MODEL = 'orca-mini:3b'`

### P: ¿Mi PC se va a ir lenta?
**R:** Solo mientras el chatbot está pensando la respuesta. Después vuelve a la normalidad.

---

## Datos y Privacidad

### P: ¿Dónde se guardan mis datos?
**R:** En tu PC, en Dexie (IndexedDB). El chatbot lee de ahí automáticamente.

### P: ¿Se envían datos a internet?
**R:** No. Ollama funciona localmente en tu PC (localhost:11434).

### P: ¿Alguien puede ver mis datos?
**R:** No. Todo está en tu PC. Ni siquiera Ollama envía datos afuera.

### P: ¿Es seguro tener Ollama ejecutándose?
**R:** Sí, es muy seguro. Solo escucha en localhost, no accesible desde internet (a menos que lo configures manualmente).

---

## Preguntas y Respuestas

### P: ¿Qué preguntas puedo hacer?
**R:** Cualquier pregunta relacionada con tu negocio:
- Ventas: "¿Cuáles son mis ingresos?"
- Inventario: "¿Qué tengo en stock?"
- Clientes: "¿Quién es mi mejor cliente?"
- Devoluciones: "¿Cuántas devoluciones tengo?"
- Análisis: "¿Cuál es mi margen de ganancia?"

### P: ¿El chatbot entiende sínonimos?
**R:** Sí. No necesitas palabras exactas. Por ejemplo:
- "¿Cuáles son mis ingresos?" = "¿Cuánto dinero gané?" = "¿Cuál es mi ganancia?"
El chatbot entiende que hablas de lo mismo.

### P: ¿Qué pasa si hago una pregunta que no puede responder?
**R:** El chatbot será honesto y dirá que no tiene esa información.

### P: ¿El chatbot aprende de mis preguntas?
**R:** No. Cada pregunta es independiente. El modelo no se actualiza con tus preguntas.

### P: ¿Puedo hacer preguntas muy complejas?
**R:** Sí, intenta. El chatbot hará su mejor esfuerzo, pero si es muy complicada, la respuesta puede no ser perfecta.

---

## Modelos y Configuración

### P: ¿Qué es llama2?
**R:** Es un modelo de inteligencia artificial gratuito creado por Meta (Facebook). Es muy versátil.

### P: ¿Hay otros modelos disponibles?
**R:** Sí. En https://ollama.ai/library puedes ver todos. Algunos populares:
- `llama2` (4GB) - Recomendado
- `llama2:7b` (3.5GB) - Para PCs medianas
- `llama2:13b` (8GB) - Para PCs potentes
- `orca-mini:3b` (2GB) - Para PCs lentas
- `llama3.2` (cuando salga) - Más nuevo

### P: ¿Cómo cambio de modelo?
**R:**
1. Descarga el nuevo: `ollama pull llama2:13b`
2. Edita `src/renderer/src/services/ollamaService.js`
3. Busca línea 6: `const OLLAMA_MODEL = 'llama2'`
4. Cambia a: `const OLLAMA_MODEL = 'llama2:13b'`
5. Reinicia Trendo POS

### P: ¿Cuál modelo debo usar?
**R:** Depende de tu PC:
- **Débil** (4GB RAM): `orca-mini:3b`
- **Normal** (8GB RAM): `llama2` (default)
- **Potente** (16GB RAM): `llama2:13b`

### P: ¿Puedo tener múltiples modelos?
**R:** Sí, puedes descargarlos todos. Pero solo uno activo a la vez.

---

## Problemas Comunes

### P: Error "Conexión rechazada"
**R:** Causa: Ollama no está ejecutándose
Solución:
```
1. Abre PowerShell
2. Escribe: ollama serve
3. Espera a ver "starting ollama serve"
4. Vuelve a intentar en Trendo
```

### P: Error "Timeout"
**R:** Causa: La respuesta tardó más de 2 minutos
Solución:
1. Cierra otros programas
2. Intenta otra pregunta
3. O usa un modelo más pequeño

### P: Error "Modelo no encontrado"
**R:** Causa: No descargaste el modelo
Solución:
```
ollama pull llama2
```

### P: El chatbot muestra "0" en todo
**R:** Normal. Significa que aún no has registrado ventas en Trendo.
Crea una venta de prueba y vuelve a intentar.

### P: "debug" muestra errores
**R:** Significa que hay un problema con la base de datos.
Intenta:
1. Cerrar y abrir Trendo
2. Si persiste, contacta soporte

---

## Rendimiento y Recursos

### P: ¿Cuánta RAM usa Ollama?
**R:**
- Inactivo: ~0MB
- Respuesta: 4-8GB (depende del modelo)
- Después: vuelve a ~0MB

### P: ¿Puedo tener otras cosas abiertas mientras uso el chatbot?
**R:** Sí, pero el rendimiento será mejor si:
1. Cierras navegador con muchas pestañas
2. Cierras programas de edición (Photoshop, VS Code)
3. Cierras juegos o software pesado

### P: ¿Por qué mi PC se calienta cuando el chatbot responde?
**R:** Es normal. El CPU/GPU trabaja duro ejecutando el modelo IA.
Soluciones:
1. Cierra otros programas
2. Usa un modelo más pequeño
3. Asegúrate de que el ventilador de tu PC funcione

---

## Actualización y Cambios Futuros

### P: ¿Qué cambió exactamente?
**R:** El chatbot anterior usaba reglas fijas (si pregunta X, responde Y).
El nuevo usa IA real que entiende lenguaje natural.

### P: ¿Volverá a cambiar?
**R:** Posiblemente. Cuando llame3.2 esté disponible, podremos mejorarlo aún más.

### P: ¿Necesito actualizar Ollama?
**R:** Es buena idea actualizar ocasionalmente:
1. Abre PowerShell
2. `ollama --version` (para ver versión actual)
3. Ollama se actualiza automáticamente si cierras y abres la app

---

## Soporte

### P: ¿Qué hago si nada funciona?
**R:** Pasos de troubleshooting:
1. Lee START_HERE_CHATBOT.md
2. Ejecuta el comando `debug` en el chatbot
3. Toma una captura de lo que ves
4. Verifica que PowerShell tenga `ollama serve` abierto
5. Reinicia Trendo POS

### P: ¿Dónde reporto bugs?
**R:** En el repositorio de GitHub del proyecto.

### P: ¿Hay foro de soporte?
**R:** Puedes consultar documentación en:
- GitHub: https://github.com/ollama/ollama
- Sitio oficial: https://ollama.ai

---

## Miscelánea

### P: ¿Es Ollama legal?
**R:** Sí, completamente legal. Es software open-source con licencia MIT.

### P: ¿Puedo usar esto comercialmente?
**R:** Sí, para tu negocio POS.

### P: ¿Puedo vender un producto con Ollama incluido?
**R:** Sí, Ollama es open-source.

### P: ¿Hay restricciones de uso?
**R:** No. Usa Ollama como quieras en tu PC.

### P: ¿Puedo desinstalar Ollama?
**R:** Sí. Panel de Control > Programas > Desinstalar un programa > Ollama.

### P: ¿Puedo reinstalar sin perder datos?
**R:** Sí. Tus datos de Trendo están en Dexie, no en Ollama.

---

## Preguntas Técnicas Avanzadas

### P: ¿Cómo veo los logs de Ollama?
**R:** En PowerShell donde ejecutaste `ollama serve` verás todos los logs.

### P: ¿Puedo cambiar el puerto de Ollama?
**R:** Es posible pero no recomendado. Requiere cambiar ollamaService.js.

### P: ¿Ollama funciona en Docker?
**R:** Sí, pero para Trendo POS recomendamos instalación estándar.

### P: ¿Puedo usar Ollama remoto (en otro PC)?
**R:** Tecnicamente sí, pero requiere cambiar ollamaService.js línea 4.

---

**¿Tienes más preguntas?** Lee los otros archivos de documentación en la carpeta raíz:
- START_HERE_CHATBOT.md
- CHATBOT_AI_SETUP.md
- OLLAMA_SETUP.md
- CHATBOT_CHANGES_SUMMARY.md
