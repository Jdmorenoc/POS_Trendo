# 📋 Resumen de Cambios - Chatbot Ollama

## 🎯 Objetivo
Reemplazar el sistema de chatbot basado en reglas con una solución de IA real usando Ollama + llama2.

## 📂 Archivos Modificados

### Nuevos Archivos Creados

1. **`src/renderer/src/services/ollamaService.js`** (382 líneas)
   - Servicio que se comunica con Ollama
   - Funciones para verificar disponibilidad de Ollama
   - Construcción de prompts contextualizados con datos del POS
   - Manejo de errores específicos (conexión rechazada, timeout, etc.)
   - Comando especial `debug` para diagnosticar

2. **`CHATBOT_AI_SETUP.md`**
   - Guía paso a paso de instalación de Ollama
   - Ejemplos de preguntas
   - Solución de problemas
   - Recursos útiles

3. **`OLLAMA_SETUP.md`**
   - Guía detallada de instalación
   - Configuración recomendada según capacidad del PC
   - Comandos útiles de Ollama
   - Troubleshooting avanzado

### Archivos Reemplazados

1. **`src/renderer/src/services/chatbotService.js`**
   - **Antes**: 742 líneas de lógica basada en reglas (Dexie local)
   - **Después**: 16 líneas que importan de ollamaService
   - Mantiene compatibilidad con ChatWindow.jsx

2. **`src/renderer/src/ui/ChatWindow.jsx`**
   - **Agregado**: Verificación de estado de Ollama
   - **Agregado**: Indicador visual de conexión (✅ conectado / ❌ no disponible)
   - **Mejorado**: Timeout extendido a 2 minutos (Ollama puede ser lento)
   - **Mejorado**: Manejo de errores con mensajes útiles
   - **Mejorado**: Desabilita input si Ollama no está disponible
   - **Agregado**: Advertencia en pantalla de inicio si Ollama no está disponible

3. **`package.json`**
   - **Agregado**: `"axios": "^1.6.2"` para comunicarse con Ollama

## 🏗️ Arquitectura

```
ChatWindow.jsx (UI)
    ↓
chatbotService.js (Adaptador)
    ↓
ollamaService.js (Lógica)
    ↓
Ollama (http://localhost:11434/api/generate)
    ↓
llama2 (Modelo de IA)
```

## 🔄 Flujo de Operación

1. Usuario abre ChatWindow
2. ChatWindow verifica disponibilidad de Ollama (isOllamaAvailable)
3. Usuario escribe pregunta
4. sendMessage() llama a processChatbotQuery()
5. chatbotService.js llama a processQuery() en ollamaService
6. ollamaService construye prompt contextualizado con datos del POS
7. Envía a Ollama vía HTTP
8. Ollama ejecuta llama2 y devuelve respuesta
9. Respuesta se muestra en ChatWindow

## 💡 Ventajas del Nuevo Sistema

| Aspecto | Sistema Anterior | Sistema Nuevo |
|--------|-----------------|----------------|
| **Flexibilidad** | Solo preguntas predefinidas | Cualquier pregunta en lenguaje natural |
| **Inteligencia** | Reglas if/else | Red neural real (llama2) |
| **Contexto** | Datos específicos buscados | Entiende contexto completo del POS |
| **Privacidad** | Local (Dexie) | Local (Ollama en PC) |
| **Costo** | Gratis (pero limitado) | Gratis (todo local) |
| **Escalabilidad** | Difícil (agregar reglas) | Fácil (el modelo es flexible) |
| **Velocidad de respuesta** | Instantáneo (lookup) | 5-30 segundos (depende del modelo) |

## 📦 Dependencias Agregadas

- **axios** (^1.6.2): Cliente HTTP para comunicarse con Ollama
- **Ollama**: Aplicación externa (descargada por usuario)
- **llama2 o llama3.2**: Modelo de IA (descargado vía Ollama)

## ⚙️ Configuración Recomendada

### Para PCs Potentes (16GB+ RAM)
```powershell
ollama pull llama2:13b
```

### Para PCs Normales (8GB RAM)
```powershell
ollama pull llama2:7b
```
O dejar el default `llama2`

### Para PCs Limitadas
```powershell
ollama pull orca-mini:3b
```

## 🔐 Seguridad y Privacidad

- ✅ Todo funciona localmente en la PC del usuario
- ✅ Ningún dato se envía a servidores externos
- ✅ Ollama se ejecuta en `localhost:11434`
- ✅ No requiere API keys o credenciales
- ✅ Totalmente offline (después de descargar el modelo)

## 🚨 Consideraciones

1. **Ollama DEBE estar ejecutándose**
   - Usuario debe dejar `ollama serve` en una terminal
   - Sin Ollama, el chatbot muestra error

2. **Primera respuesta es lenta**
   - Primer request tarda más
   - Siguientes respuestas son más rápidas
   - Esto es normal en sistemas locales

3. **Requiere descargas grandes**
   - llama2: ~4GB
   - llama3.2: ~6GB
   - orca-mini:3b: ~2GB

4. **Consumo de recursos**
   - La primera respuesta usa CPU/RAM más intensamente
   - Importante cerrar otras aplicaciones pesadas

## 📊 Comparativa de Modelos

| Modelo | Tamaño | RAM | Velocidad | Inteligencia |
|--------|--------|-----|-----------|--------------|
| orca-mini:3b | 2GB | 4GB | ⚡⚡⚡ | ⭐⭐ |
| llama2:7b | 3.5GB | 8GB | ⚡⚡ | ⭐⭐⭐ |
| llama2 | 4GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ |
| llama2:13b | 8GB | 16GB | ⚡ | ⭐⭐⭐⭐⭐ |
| llama3.2 | Variable | 8GB+ | Variable | ⭐⭐⭐⭐⭐ |

## 🛠️ Instalación para Desarrolladores

1. Ejecutar: `npm install` (instala axios)
2. Descargar Ollama desde ollama.ai
3. Ejecutar: `ollama pull llama2` (o el modelo deseado)
4. Ejecutar: `ollama serve` en una terminal
5. Abrir Trendo POS normalmente
6. Chatbot debería estar disponible

## ✅ Testing

Para probar:
1. Abrir DevTools (F12)
2. Ir a Console
3. Escribir en el chatbot: "debug"
4. Verificar que muestre datos de ventas/productos
5. Escribir una pregunta normal: "¿Cuáles son mis ingresos?"
6. Verificar que Ollama responda (puede tardar 5-30 seg)

## 📝 Notas

- El sistema mantiene **compatibilidad total** con la UI existente
- Los estilos de ChatWindow siguen siendo los mismos
- Las preguntas sugeridas se mantienen como ejemplos
- La integración es limpia y sin efectos secundarios

## 🎓 Aprendizaje

Este cambio demuestra:
- Migración de sistema basado en reglas a IA
- Integración de modelos locales (Ollama)
- Construcción de prompts contextual izados
- Manejo de llamadas HTTP asincrónicas
- Error handling para sistemas externos

---

**Fecha**: Diciembre 2025
**Cambio**: Sistema Chatbot Completo
**Estado**: ✅ Listo para Producción
