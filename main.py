import os
import json
# import sqlite3  # <-- COMENTADO: RESERVADO PARA NEGOCIACIÓN (FASE 2)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from openai import OpenAI

# 1. Configuración de la API y el Cliente LLM (GitHub Models)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
if not GITHUB_TOKEN:
    raise ValueError("Falta la variable de entorno GITHUB_TOKEN. Asegúrate de haberla exportado.")

client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=GITHUB_TOKEN,
)
MODEL_NAME = "gpt-4o-mini"

# 2. Inicialización de la Base de Datos SQLite
# <-- COMENTADO: RESERVADO PARA NEGOCIACIÓN (FASE 2) -->
# def init_db():
#     conn = sqlite3.connect("analiticas_4020.db")
#     cursor = conn.cursor()
#     cursor.execute("""
#         CREATE TABLE IF NOT EXISTS interacciones (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             problem_id TEXT,
#             rigor_level TEXT,
#             frustration_level INTEGER,
#             dependence_score INTEGER,
#             persistence_index INTEGER,
#             error_category TEXT
#         )
#     """)
#     conn.commit()
#     conn.close()
#
# init_db()

# 3. Configuración de FastAPI
app = FastAPI(title="GeoAsesor-Ciencias Auditor API (MVP)")

# Permitir CORS para que tu frontend pueda comunicarse con este backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Modelos de Datos
class Message(BaseModel):
    role: str
    content: str

class ProofRequest(BaseModel):
    problem_id: str
    problem_text: str
    current_proof: str
    chat_history: List[Message]
    rigor_level: str = Field(default="dificil")

# 5. El System Prompt Maestro
SYSTEM_PROMPT = """
Eres "Euclides", el motor de auditoría matemática para Geometría Analítica. Tu objetivo es evaluar demostraciones socráticamente.
DEBES RESPONDER ÚNICAMENTE CON UN JSON VÁLIDO. NO incluyas formato Markdown (```json) en la salida.

Estructura JSON requerida:
{
  "feedback": "Tu respuesta socrática al alumno aquí. Usa formato Markdown. Para matemáticas usa $ para inline y $$ para bloques. IMPORTANTE: Usa doble barra invertida para comandos LaTeX (ejemplo: \\\\theta, \\\\frac) para evitar errores de JSON.",
  "status": "needs_revision",
  "analytics": {
    "student_state": {
      "frustration_level": <int 1-10>,
      "dependence_score": <int 1-10>,
      "persistence_index": <int 1-10>
    },
    "math_assessment": {
      "error_category": "<algebraico|logico_estructural|conceptual|notacion|ninguno>",
      "specific_concept_flagged": "breve descripción del concepto",
      "self_correction_capacity": "<alta|media|baja>"
    }
  }
}

REGLAS GLOBALES:
1. NUNCA resuelvas el problema directamente.
2. Evalúa divisiones por cero, razonamiento circular y omisiones de dominio.
3. ESCAPE DE LATEX: Es obligatorio usar doble barra invertida en TODOS los comandos matemáticos (ejemplo: \\\\theta, \\\\frac, \\\\pi) para evitar que el JSON confunda \\t con tabulaciones.

NIVEL DE RIGOR ACTUAL: {rigor_level}
- facil: Heurística de Pólya. Da pistas conceptuales suaves.
- dificil: Socrático puro. Preguntas incisivas, cero pistas directas.
- extremo: Compilador. Solo señala la falla lógica y la línea. Sin empatía.
"""

@app.post("/api/verify")
async def verify_proof(request: ProofRequest):
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.replace("{rigor_level}", request.rigor_level)}
        ]
        
        user_context = f"Problema: {request.problem_text}\nDemostración del alumno: {request.current_proof}"
        
        # Añadir historial reciente (últimos 4 mensajes para no saturar el contexto)
        for msg in request.chat_history[-4:]:
            messages.append({"role": msg.role, "content": msg.content})
            
        messages.append({"role": "user", "content": user_context})

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.2,
            response_format={ "type": "json_object" }
        )
        
        llm_output = json.loads(response.choices[0].message.content)
        
        # <-- COMENTADO: GUARDADO EN BASE DE DATOS (FASE 2) -->
        # analytics = llm_output.get("analytics", {})
        # state = analytics.get("student_state", {})
        # math_eval = analytics.get("math_assessment", {})
        # 
        # conn = sqlite3.connect("analiticas_4020.db")
        # cursor = conn.cursor()
        # cursor.execute("""
        #     INSERT INTO interacciones 
        #     (problem_id, rigor_level, frustration_level, dependence_score, persistence_index, error_category)
        #     VALUES (?, ?, ?, ?, ?, ?)
        # """, (
        #     request.problem_id, 
        #     request.rigor_level,
        #     state.get("frustration_level", 0),
        #     state.get("dependence_score", 0),
        #     state.get("persistence_index", 0),
        #     math_eval.get("error_category", "desconocido")
        # ))
        # conn.commit()
        # conn.close()
        # ---------------------------------------------------

        return llm_output

    except Exception as e:
        print(f"🔥 ERROR FATAL EN EL BACKEND: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
