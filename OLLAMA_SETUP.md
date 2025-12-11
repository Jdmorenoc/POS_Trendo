# 🤖 Instalación y Configuración de Ollama + llama2/llama3.2

Tu chatbot de Trendo POS ha sido actualizado para usar **Ollama** con **llama2** (o llama3.2), un modelo de IA local más potente y versátil que el anterior sistema basado en reglas.

## ¿Qué es Ollama?

Ollama es una herramienta que te permite ejecutar modelos de IA localmente en tu computadora sin necesidad de internet ni APIs en la nube. Esto significa:
- ✅ Privacidad total - tus datos nunca salen de tu equipo
- ✅ Sin costo - no pagas por API calls
- ✅ Disponible sin internet
- ✅ Respuestas más inteligentes y contextuales

## Pasos de Instalación

### 1️⃣ Descargar Ollama

Ve a [ollama.ai](https://ollama.ai) y descarga la versión para Windows.

### 2️⃣ Instalar Ollama

1. Ejecuta el instalador que descargaste
2. Sigue los pasos de instalación (acepta los valores por defecto)
3. Ollama se instalará y se ejecutará automáticamente

### 3️⃣ Descargar el Modelo

Una vez que Ollama está instalado, abre **PowerShell** o **CMD** y ejecuta:

```powershell
ollama pull llama2
```

Esto descargará el modelo llama2 (~4GB). Puede tomar algunos minutos.

**Alternativa (más reciente):**
```powershell
ollama pull llama2-uncensored
```

O si prefieres esperar a llama3.2:
```powershell
ollama pull llama3.2
```

### 4️⃣ Verificar que Funciona

En la terminal, ejecuta:
```powershell
ollama serve
```

Deberías ver algo como:
```
starting ollama serve
```

¡Excelente! Ollama está ejecutándose en `http://localhost:11434`

### 5️⃣ Usar el Chatbot

Ahora puedes:
1. Abrir Trendo POS
2. Hacer clic en el botón del chatbot
3. Escribe cualquier pregunta sobre tu negocio:
   - "¿Cuáles son mis ingresos totales?"
   - "¿Qué productos se venden más?"
   - "¿Cuál es mi margen de ganancia?"
   - O cualquier otra pregunta relacionada con tu POS

## Comandos Útiles de Ollama

```powershell
# Ver modelos instalados
ollama list

# Descargar otro modelo
ollama pull llama2:13b

# Eliminar un modelo
ollama rm llama2

# Ejecutar un modelo directamente en terminal
ollama run llama2
```

## Solución de Problemas

### Error: "Ollama no está disponible"

**Causa:** Ollama no está ejecutándose

**Solución:**
1. Abre PowerShell
2. Ejecuta: `ollama serve`
3. Vuelve a intentar en el chatbot

### Error: "Conexión rechazada"

**Causa:** El servicio de Ollama no está activo

**Solución:**
1. Verifica que ejecutaste `ollama serve` en una terminal
2. Deja esa ventana abierta mientras usas Trendo POS

### El chatbot tarda mucho en responder

**Causa:** Tu computadora necesita más recursos o el modelo es grande

**Soluciones:**
- Cierra otras aplicaciones pesadas
- Considera usar `llama2:7b` en lugar de `llama2:13b` si usaste el 13b
- Aguarda a que la primera respuesta se procese (las siguientes son más rápidas)

### Error: "Modelo no encontrado"

**Causa:** El modelo no fue descargado correctamente

**Solución:**
```powershell
ollama pull llama2
```

## Configuración Recomendada

Para Trendo POS, recomendamos:

### Si tu PC es potente (16GB+ RAM):
```powershell
ollama pull llama2:13b
```

### Si tu PC tiene recursos limitados (8GB RAM):
```powershell
ollama pull llama2:7b
```

### Si quieres lo más rápido (menos preciso):
```powershell
ollama pull orca-mini:3b
```

## Cambiar el Modelo

Si quieres cambiar de modelo, edita el archivo:
```
src/renderer/src/services/ollamaService.js
```

En la línea 6, cambia:
```javascript
const OLLAMA_MODEL = 'llama2' // Cambiar a 'llama3.2' cuando esté instalado
```

Por el modelo que prefieras:
```javascript
const OLLAMA_MODEL = 'llama2:13b'
// o
const OLLAMA_MODEL = 'llama3.2'
```

Luego reinicia Trendo POS.

## Características del Nuevo Chatbot

✨ **Basado en IA**: Responde de forma natural y contextualizada
✨ **Acceso a datos**: Conoce automáticamente tus ingresos, productos, clientes, etc.
✨ **Flexible**: Puedes hacer preguntas de muchas formas diferentes
✨ **Privado**: Todo funciona localmente en tu computadora
✨ **Offline**: Funciona sin conexión a internet

## Comando de Diagnóstico

Si tienes problemas, escribe en el chatbot:
```
debug
o
verificar
o
diagnóstico
```

Esto te mostrará:
- Cantidad de ventas registradas
- Cantidad de productos
- Cantidad de devoluciones
- Estado de Ollama

## Soporte

Si tienes problemas:
1. Ejecuta el comando `debug` en el chatbot
2. Verifica que Ollama esté ejecutándose
3. Revisa los logs en la consola del navegador (F12)

¡Disfruta tu nuevo chatbot potenciado por IA! 🚀
