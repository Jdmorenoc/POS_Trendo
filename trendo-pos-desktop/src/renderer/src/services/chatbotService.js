/**
 * chatbotService.js
 * 
 * Servicio de chatbot que usa Ollama + llama2/llama3.2
 * Este reemplaza completamente el sistema anterior basado en reglas
 */

import { processQuery } from './ollamaService'

/**
 * Función principal que procesa consultas del chatbot
 * Compatible con la interfaz anterior de ChatWindow
 */
export async function processChatbotQuery(userMessage) {
  return await processQuery(userMessage)
}

export default processChatbotQuery
