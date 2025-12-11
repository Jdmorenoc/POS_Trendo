# 🔧 Soluciones para Inputs Pegados o No Responsivos

Si los inputs del chatbot se quedan pegados (no puedes escribir), aquí hay varias soluciones:

## ✅ Soluciones Rápidas (Intenta primero)

### 1. **Recarga la página**
```
Presiona: F5 o Ctrl+R
```
Esta es la solución más rápida para resetear el estado de la aplicación.

### 2. **Cierra y abre el chatbot**
```
1. Haz clic en el botón X para cerrar el chatbot
2. Espera 2 segundos
3. Haz clic en el botón 💬 flotante para reabrirlo
```

### 3. **Espera a que termine de procesar**
```
Si escribiste una pregunta:
- Espera entre 5-15 segundos a que el chatbot responda
- Una vez que recibas la respuesta, el input se desbloqueará
```

## 🔨 Si nada funciona

### 4. **Abre DevTools para limpiar la consola**
```
1. Presiona: F12 o Ctrl+Shift+I
2. Ve a la pestaña "Console"
3. Si hay errores rojos, captura una screenshot y reporta
4. Cierra DevTools (F12 nuevamente)
5. Recarga la página (F5)
```

### 5. **Limpia el caché del navegador**
```
Para Electron/Aplicación de Desktop:
1. Intenta recargar nuevamente (F5)
2. Si persiste, cierra completamente la aplicación
3. Vuelve a abrirla
```

## 🛠️ Lo que hemos mejorado

He implementado un **timeout de seguridad de 15 segundos**:
- Si una consulta tarda más de 15 segundos, el input se desbloqueará automáticamente
- Recibirás un mensaje: "⏱️ La consulta tardó demasiado tiempo. Por favor intenta nuevamente."
- El input volverá a estar disponible

## 📋 Checklist de Debugging

Si el problema persiste, verifica:

- [ ] ¿Hay conexión a internet? (Las consultas necesitan acceso a Supabase)
- [ ] ¿La aplicación está completa o se está compilando? (Espera a que termine)
- [ ] ¿Hay errores en la consola del navegador? (F12 → Console)
- [ ] ¿Intentaste recargar la página? (F5)
- [ ] ¿Cerraste y reabriste la aplicación?

## 🎯 Prevención

Para evitar que se pegue el input:

✅ Espera a que cada consulta se procese completamente antes de hacer otra
✅ No cierres la aplicación mientras está procesando
✅ Si ves que tarda mucho, espera 15 segundos (ahora se desbloqueará automáticamente)

---

**Nota:** Si después de estas soluciones aún tienes problemas, reporta:
- El mensaje exacto del error (si lo hay)
- Pasos para reproducir el problema
- Screenshot de la consola (F12)
