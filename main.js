// Elementos de Katex para el procesado de ecuaciones y/o expresiones
const katex = window.katex;
const marked = window.marked;
const markedKatex = window.markedKatex;

let currentProblemId = 0;
let currentSet = 0;
let isRendered = false;
let messages = [];

const problemArea = document.getElementById("problem-area");
const chatHistory = document.getElementById("chat-history");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const proofInput = document.getElementById("proof-input");
const proofPreview = document.getElementById("proof-preview");
const latexPreview = document.getElementById("latex-preview");
const compileButton = document.getElementById("render-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const verifyButton = document.getElementById("verify-button");

// Configura marked para usar marked-katex
marked.use(
  markedKatex({
    throwOnError: false,
    displayMode: false,
  }),
);

// Inicialización con un problema elegido al azar de la lista de problemas
function initializeRandomProblem() {
  const randomId = Math.floor(Math.random() * window.problemas.length + 1);
  setCurrentProblem(randomId);
}

// Mantiene el indice del problema actual
function setCurrentProblem(set, id) {
  currentSet = set;
  currentProblemId = id;
  const problemas = window.problemas.find((problema) => problema.id === set);
  if (!problemas) return;
  const problem = problemas.subsections.find((problema) => problema.id === id);
  if (problem) {
    problemArea.innerHTML = renderProblem(problem.content);
  }
}

// Renderiza el contenido matemático
function renderProblem(content) {
  try {
    return marked.parse(content);
  } catch (error) {
    console.error("Error rendering content:", error);
    return content;
  }
}

// Cambia al problema anterior y borra toda la información de la página
function previousProblem() {
  const problemas = window.problemas.find(
    (problema) => problema.id === currentSet,
  );
  const newId =
    currentProblemId > 1 ? currentProblemId - 1 : problemas.subsections.length;
  setCurrentProblem(currentSet, newId);
  messages = [];
  chatHistory.innerHTML = "";
  proofInput.value = "";
  isRendered = false;
  proofInput.style.display = "block";
  proofPreview.style.display = "none";
  verifyButton.textContent = "Verificar demostración";
}

// Cambia al siguiente problema y borra toda la información de la página
function nextProblem() {
  const problemas = window.problemas.find(
    (problema) => problema.id === currentSet,
  );
  const newId =
    currentProblemId < problemas.subsections.length ? currentProblemId + 1 : 1;
  setCurrentProblem(currentSet, newId);
  messages = [];
  chatHistory.innerHTML = "";
  proofInput.value = "";
  isRendered = false;
  proofInput.style.display = "block";
  proofPreview.style.display = "none";
  verifyButton.textContent = "Verificar demostración";
}

// --- FUNCIÓN VERIFY (CONEXIÓN CON EUCLIDES Y EASTER EGG) ---
async function verify() {
  const proofText = proofInput.value.trim();

  // --- EASTER EGG EXCLUSIVO ---
  if (proofText === "/euclides26") {
    addMessage(
      "La confusión no es una propiedad de la información. - Euclides",
      false,
    );
    setTimeout(() => {
      addMessage(
        "Entonces la confusión es un bug, no una feature. - Nef",
        true,
      );
    }, 1500);
    proofInput.value = "";
    return;
  }
  // ---------------------------

  if (!proofText) {
    alert(
      "Euclides requiere que escribas una demostración lógica antes de evaluar.",
    );
    return;
  }

  // 1. Congelar la interfaz y mostrar el mensaje del alumno en el chat
  verifyButton.textContent = "Euclides está analizando...";
  verifyButton.disabled = true;
  proofInput.disabled = true;

  addMessage(proofText, true);

  try {
    // 2. Extraer el texto del problema actual
    const currentSetData = window.problemas.find((p) => p.id === currentSet);
    const currentProblemData = currentSetData
      ? currentSetData.subsections.find((p) => p.id === currentProblemId)
      : null;
    const problemText = currentProblemData
      ? currentProblemData.content
      : "Problema no especificado.";

    // 3. Preparar el JSON para nuestro backend en Python
    const payload = {
      problem_id: `${currentSet}-${currentProblemId}`,
      problem_text: problemText,
      current_proof: proofText,
      chat_history: messages,
      rigor_level: "dificil",
    };

    // 4. Llamada al backend local
    const codespaceUrl = "http://127.0.0.1:8000";

    const response = await fetch(`${codespaceUrl}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP del servidor: ${response.status}`);
    }

    // 5. Procesar la respuesta
    const data = await response.json();

    // 6. Inyectar la evaluación de Euclides en el chat
    addMessage(data.feedback, false);

    // Analíticas silenciosas para tu negociación (Fase 2)
    console.log("Métricas invisibles del alumno (Fase 2):", data.analytics);
  } catch (error) {
    console.error("Falla en la Matrix geométrica:", error);
    addMessage(
      "Error de conexión con el servidor de Euclides. Verifica que Uvicorn esté corriendo.",
      false,
    );
  } finally {
    // 7. Restaurar la interfaz
    verifyButton.textContent = "Verificar demostración";
    verifyButton.disabled = false;
    proofInput.disabled = false;
    proofInput.value = "";
  }
}
// -----------------------------------------------------------------

function render() {
  if (!isRendered) {
    proofInput.style.display = "none";
    proofPreview.style.display = "block";
    proofPreview.innerHTML = renderProof(proofInput.value);
    compileButton.textContent = "Editar";
    latexPreview.style.display = "none";
  } else {
    proofInput.style.display = "block";
    proofPreview.style.display = "none";
    compileButton.textContent = "Compilar";
  }
  isRendered = !isRendered;
}

// Renderiza las ecuaciones
function renderProof(text) {
  let result = text.split(/(\\\[[^$]+\\\])/).map((part) => {
    if (part.startsWith("\\[") && part.endsWith("\\]")) {
      try {
        const latex = part.slice(2, -2);
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (error) {
        return part;
      }
    }
    return part;
  });

  result = result.map((part) => {
    let subparts = part.split(/(\\\(+[^$]\\\))/);
    let subpart = subparts.map((subpart) => {
      let subsubparts = subpart.split(/(\\\([^$]+\\\))/);
      return subsubparts
        .map((subPart) => {
          if (subPart.startsWith("\\(") && subPart.endsWith("\\)")) {
            try {
              const latex = subPart.slice(2, -2);
              return katex.renderToString(latex, {
                throwOnError: false,
                displayMode: false,
              });
            } catch (error) {
              return subPart;
            }
          }
          return subPart;
        })
        .join("");
    });
    return subpart.join("");
  });
  return result.join("");
}

// Maneja la previsualización de las ecuaciones
function handleLatexPreview(e) {
  const textarea = e.target;
  const cursorPosition = textarea.selectionStart;
  const text = textarea.value;

  const latexContent = findLatexAtCursor(text, cursorPosition);
  if (latexContent) {
    try {
      const rendered = katex.renderToString(latexContent.content, {
        throwOnError: false,
        displayMode: latexContent.isBlock,
      });

      const rect = textarea.getBoundingClientRect();
      const coords = getCaretCoordinates(textarea, cursorPosition);

      latexPreview.innerHTML = rendered;
      latexPreview.style.display = "block";
      latexPreview.style.left = `${rect.left}px`;
      latexPreview.style.top = `${coords.top + 15}px`;
    } catch (error) {
      console.error("LaTeX rendering error:", error);
    }
  } else {
    latexPreview.style.display = "none";
  }
}

// Encuentra el contenido entre los delimitadores para mostrar la previsualización
function findLatexAtCursor(text, cursorPosition) {
  const beforeCursor = text.slice(0, cursorPosition);
  const afterCursor = text.slice(cursorPosition);

  if (
    afterCursor.indexOf(")") !== 0 &&
    beforeCursor.lastIndexOf("\\") !== beforeCursor.length - 1
  ) {
    // Para delimitadores \[ \] (latex en línea separada)
    const blockStartIndex = beforeCursor.lastIndexOf("\\[");
    const blockIndex = beforeCursor.lastIndexOf("\\]");
    if (
      (blockStartIndex !== -1 && blockIndex === -1) ||
      (blockStartIndex !== -1 && blockIndex < blockStartIndex)
    ) {
      const blockEndIndex = afterCursor.indexOf("\\]");
      if (blockEndIndex !== -1) {
        return {
          content: text.slice(
            blockStartIndex + 2,
            cursorPosition + blockEndIndex,
          ),
          isBlock: true,
        };
      }
    }

    // Para delimitadores \( \) (latex en línea con texto)
    const inlineStartIndex = beforeCursor.lastIndexOf("\\(");
    const inlineIndex = beforeCursor.lastIndexOf("\\)");
    if (
      (inlineStartIndex !== -1 && inlineIndex === -1) ||
      (inlineStartIndex !== -1 && inlineIndex < inlineStartIndex)
    ) {
      const inlineEndIndex = afterCursor.indexOf("\\)");
      if (inlineEndIndex !== -1) {
        return {
          content: text.slice(
            inlineStartIndex + 2,
            cursorPosition + inlineEndIndex,
          ),
          isBlock: false,
        };
      }
    }
  }

  return null;
}

// Da las coordenadas para la previsualización
function getCaretCoordinates(element, position) {
  const div = document.createElement("div");
  const styles = getComputedStyle(element);
  const properties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "wordWrap",
    "whiteSpace",
    "borderLeftWidth",
    "borderTopWidth",
    "paddingLeft",
    "paddingTop",
  ];

  properties.forEach((prop) => {
    div.style[prop] = styles[prop];
  });

  div.textContent = element.value.substring(0, position);
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  document.body.appendChild(div);

  const coordinates = {
    left: div.offsetWidth + element.offsetLeft,
    top: div.offsetHeight + element.offsetTop,
  };

  document.body.removeChild(div);
  return coordinates;
}

// Maneja el envio de dudas directas desde la caja de chat inferior
async function handleSubmit(message) {
  if (!message.trim()) return;

  // 1. Mostrar el mensaje del usuario en el chat (se guarda en la memoria de messages)
  console.log("Procesando duda del usuario:", message);
  addMessage(message, true);

  // 2. Bloquear la cajita de texto mientras Euclides piensa
  chatInput.disabled = true;
  chatInput.placeholder = "Euclides está analizando tu duda...";

  try {
    // Extraer el texto del problema actual
    const currentSetData = window.problemas.find((p) => p.id === currentSet);
    const currentProblemData = currentSetData
      ? currentSetData.subsections.find((p) => p.id === currentProblemId)
      : null;
    const problemText = currentProblemData
      ? currentProblemData.content
      : "Problema no especificado.";

    // Obtener la demostración actual (aunque esté a medias o vacía)
    const proofText =
      proofInput.value.trim() ||
      "(El alumno hace una pregunta directa en el chat. Ayúdalo socráticamente con su duda.)";

    // 3. Preparar el paquete (payload)
    const payload = {
      problem_id: `${currentSet}-${currentProblemId}`,
      problem_text: problemText,
      current_proof: proofText,
      chat_history: messages, // Aquí ya va incluida la duda que se acaba de escribir
      rigor_level: "dificil",
    };

    // 4. Llamar al servidor local FastAPI
    const codespaceUrl = "http://127.0.0.1:8000";
    const response = await fetch(`${codespaceUrl}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // 5. Mostrar la respuesta de Euclides
    addMessage(data.feedback, false);
  } catch (error) {
    console.error("Falla al consultar duda:", error);
    addMessage(
      "Lo siento, hubo un error de conexión al procesar tu duda.",
      false,
    );
  } finally {
    // 6. Restaurar la cajita de texto
    chatInput.disabled = false;
    chatInput.placeholder = "Escribe tus dudas...";
    chatInput.focus();
  }
}

// --- FUNCIÓN ADDMESSAGE (LA OPCIÓN NUCLEAR PARA KATEX Y MARKDOWN) ---
// Añadir el mensaje al historial del chat
function addMessage(content, isUser) {
  // 1. Agregar al arreglo global para que el LLM tenga memoria
  messages.push({ role: isUser ? "user" : "assistant", content: content });

  // 2. Renderizar visualmente en el DOM
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "bot"}`;

  if (!isUser) {
    // LA OPCIÓN NUCLEAR: Invocar a KaTeX directamente
    let procesado = content;

    // A) Renderizar bloques matemáticos $$...$$
    procesado = procesado.replace(/\$\$(.*?)\$\$/gs, (match, ecuacion) => {
      return katex.renderToString(ecuacion, {
        throwOnError: false,
        displayMode: true,
      });
    });

    // B) Renderizar matemáticas en línea $...$
    procesado = procesado.replace(/\$(.*?)\$/g, (match, ecuacion) => {
      return katex.renderToString(ecuacion, {
        throwOnError: false,
        displayMode: false,
      });
    });

    // C) Interpretar negritas de Markdown y saltos de línea para que se vea estético
    procesado = procesado.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    procesado = procesado.replace(/\n/g, "<br>");

    messageDiv.innerHTML = procesado;
  } else {
    messageDiv.textContent = content;
  }

  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Event listener para actualizar la organización del historial del chat
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (message) {
    handleSubmit(message);
    chatInput.value = "";
    chatInput.style.height = "auto";
  }
});

// Event listener para actualizar la altura de la entrada de chat
chatInput.addEventListener("input", (e) => {
  const textarea = e.target;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
});

// Maneja la posición del cursor de texto dentro del área de demostración
function handleCursor(e) {
  const textarea = e.target;
  const cursorPosition = textarea.selectionStart;
  const text = textarea.value;
  const latexContent = findLatexAtCursor(text, cursorPosition);
  if (latexContent == null) {
    latexPreview.style.display = "none";
  } else {
    try {
      const rendered = katex.renderToString(latexContent.content, {
        throwOnError: false,
        displayMode: latexContent.isBlock,
      });

      const rect = textarea.getBoundingClientRect();
      const coords = getCaretCoordinates(textarea, cursorPosition);

      latexPreview.innerHTML = rendered;
      latexPreview.style.display = "block";
      latexPreview.style.left = `${rect.left}px`;
      latexPreview.style.top = `${coords.top + 15}px`;
    } catch (error) {
      console.error("LaTeX rendering error:", error);
    }
  }
}

// Event listener para detectar la posición del cursor de texto dentro de la página web
document.addEventListener("selectionchange", handleCursor);
