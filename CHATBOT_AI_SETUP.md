# 🤖 Chatbot Trendo POS con Ollama + IA Local

Tu chatbot ha sido completamente reemplazado con una solución basada en **Ollama + llama2** (o llama3.2). Esto proporciona una experiencia de IA más poderosa, flexible y privada.

## ⚡ Cambios Principales

### ❌ Eliminado
- Sistema anterior basado en reglas predefinidas
- Respuestas limitadas a preguntas específicas
- Lógica de detección de palabras clave

### ✅ Nuevo
- **IA Conversacional Real**: Puede entender y responder a preguntas en lenguaje natural
- **Contexto Automático**: Conoce automáticamente tus datos de ventas, productos, clientes
- **Flexible**: Puedes hacer preguntas de muchas formas distintas
- **Privado**: Todo funciona localmente, sin enviar datos a internet
- **Gratuito**: Sin costos de API

## 📋 Requisitos

1. **Windows 10/11**
2. **Ollama** (descargado e instalado)
3. **Modelo llama2 o llama3.2** (descargado con Ollama)

## 🚀 Pasos de Instalación Rápida

### Paso 1: Instalar Ollama

1. Abre [ollama.ai](https://ollama.ai)
2. Descarga la versión para Windows
3. Ejecuta el instalador (acepta valores por defecto)
4. Ollama se ejecutará automáticamente

### Paso 2: Descargar el Modelo

Abre **PowerShell** (tecla Windows + R, escribe "powershell", presiona Enter):

```powershell
ollama pull llama2
```

Espera a que descargue (~4GB). La primera vez puede tardar bastante.

### Paso 3: Usar el Chatbot

1. Inicia Trendo POS
2. Haz clic en el botón del chatbot (esquina inferior derecha)
3. Verifica que diga "✅ Ollama conectado"
4. ¡Comienza a hacer preguntas!

## 💬 Ejemplos de Preguntas

Ahora puedes hacer preguntas de forma natural:

```
¿Cuáles son mis ingresos totales?
Cuéntame sobre las ventas de este mes
¿Qué productos se venden más frecuentemente?
¿Cuál es mi cliente más leal?
Necesito saber el margen de ganancia
¿Cuántos clientes tengo registrados?
Dime sobre las devoluciones
¿Cuál es la rotación de inventario?
```

## 🔧 Solución de Problemas

### ❌ "Ollama no está disponible"

**Solución:**
1. Abre PowerShell
2. Ejecuta: `ollama serve`
3. Verifica que salga algo como `starting ollama serve`
4. Deja esa ventana abierta mientras usas Trendo
5. Vuelve a intentar en el chatbot

### ❌ El chatbot no responde

**Pasos para diagnosticar:**
1. En el chatbot, escribe: `debug` o `verificar`
2. Verifica que muestre tus datos
3. Comprueba que Ollama esté ejecutándose (PowerShell con `ollama serve`)

### ❌ Descargas muy lenta de Ollama

**Causa**: Problema de conexión

**Soluciones:**
- Verifica tu conexión a internet
- Intenta descargando un modelo más pequeño: `ollama pull orca-mini:3b`
- Intenta en otro momento

### ❌ Las respuestas son lentas

**Causa**: Tu computadora necesita más recursos o proceso en background

**Soluciones:**
- Cierra otras aplicaciones
- Si usaste `llama2:13b`, intenta con `llama2:7b`
- Espera a que Ollama termine de responder (~1-2 minutos es normal)

## 📱 Comandos Especiales

### Debug / Diagnóstico

Escribe cualquiera de estos en el chatbot:
- `debug`
- `verificar`
- `diagnóstico`

Verá información sobre:
- Cantidad de ventas registradas
- Cantidad de productos
- Cantidad de devoluciones
- Estado de Ollama

## 🎯 Configuración Avanzada

### Cambiar a llama3.2 (cuando esté disponible)

Edita el archivo:
```
src/renderer/src/services/ollamaService.js
```

Busca esta línea (aproximadamente línea 6):
```javascript
const OLLAMA_MODEL = 'llama2'
```

Cambia a:
```javascript
const OLLAMA_MODEL = 'llama3.2'
```

Luego descarga el modelo:
```powershell
ollama pull llama3.2
```

Y reinicia Trendo POS.

### Usar modelo más pequeño (para PC limitadas)

```powershell
ollama pull orca-mini:3b
```

Luego en `ollamaService.js`:
```javascript
const OLLAMA_MODEL = 'orca-mini:3b'
```

## 📚 Recursos Útiles

- **Ollama Oficial**: https://ollama.ai
- **Modelos Disponibles**: https://ollama.ai/library
- **Documentación**: https://github.com/ollama/ollama

## 🆘 Si Nada Funciona

1. Desinstala Ollama completamente
2. Descarga la versión más reciente desde ollama.ai
3. Reinstala
4. Intenta nuevamente: `ollama pull llama2`
5. Abre PowerShell y ejecuta: `ollama serve`
6. Abre Trendo POS y prueba el chatbot

## ✨ Ventajas del Nuevo Sistema

- 🔒 **Privacidad Total**: Tus datos nunca salen de tu computadora
- 💰 **Sin Costos**: No pagas por API calls
- 🚀 **Rápido**: Funciona localmente sin latencia de red
- 🧠 **Inteligente**: Modelo IA real, no reglas programadas
- 🎯 **Contextual**: Entiende el contexto de tu negocio
- 🌙 **Funciona Offline**: No necesita internet después de descargado

¡Disfruta tu nuevo chatbot potenciado por IA! 🎉
