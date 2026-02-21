// Elementos de Katex para el procesado de ecuaciones y/o expresiones
const katex = window.katex
const marked = window.marked
const markedKatex = window.markedKatex

let currentProblemId = 0
let currentSet = 0
let isRendered = false
let messages = []

const problemArea = document.getElementById("problem-area")
const chatHistory = document.getElementById("chat-history")
const chatForm = document.getElementById("chat-form")
const chatInput = document.getElementById("chat-input")
const proofInput = document.getElementById("proof-input")
const proofPreview = document.getElementById("proof-preview")
const latexPreview = document.getElementById("latex-preview")
const compileButton = document.getElementById("render-button")
const prevButton = document.getElementById("prev-button")
const nextButton = document.getElementById("next-button")
const verifyButton = document.getElementById("verify-button")

// Configura marked para usar marked-katex
marked.use(markedKatex({
  throwOnError: false,
  displayMode: false,
}));

// Inicialización con un problema elegido al azar de la lista de problemas
function initializeRandomProblem() {
  const randomId = Math.floor(Math.random() * window.problemas.length+1)
  setCurrentProblem(randomId)
}

// Mantiene el indice del problema actual
function setCurrentProblem(set, id) {
  currentSet = set
  currentProblemId = id
  const problemas = window.problemas.find(problema => problema.id === set);
  console.log(problemas.subsections)
  const problem = problemas.subsections.find(problema => problema.id === id);
  if (problem) {
    problemArea.innerHTML = renderProblem(problem.content)
  }
}

// Renderiza el contenido matemático
function renderProblem(content) {
  try {
    return marked.parse(content)
  } catch (error) {
    console.error("Error rendering content:", error)
    return content
  }
}

// Cambia al problema anterior y borra toda la información de la página
function previousProblem() {
  const problemas = window.problemas.find((problema) => problema.id === currentSet);
  const newId = currentProblemId > 1 ? currentProblemId - 1 : problemas.subsections.length
  setCurrentProblem(currentSet, newId)
  messages = []
  chatHistory.innerHTML = ""
  proofInput.value = ""
  isRendered = false
  proofInput.style.display = "block"
  proofPreview.style.display = "none"
  verifyButton.textContent = "Verificar demostración"
}

// Cambia al siguiente problema y borra toda la información de la página
function nextProblem() {
  const problemas = window.problemas.find((problema) => problema.id === currentSet);
  const newId = currentProblemId < problemas.subsections.length ? currentProblemId + 1 : 1
  setCurrentProblem(currentSet, newId)
  messages = []
  chatHistory.innerHTML = ""
  proofInput.value = ""
  isRendered = false
  proofInput.style.display = "block"
  proofPreview.style.display = "none"
  verifyButton.textContent = "Verificar demostración"
}


// Verifica la escritura de la solución en formato de markdown.
function verify() {
  if (!isRendered) {
    proofInput.style.display = "none"
    proofPreview.style.display = "block"
    proofPreview.innerHTML = renderProof(proofInput.value)
    verifyButton.textContent = "Verificando demostración..."
    latexPreview.style.display = "none"
  } else {
    proofInput.style.display = "block"
    proofPreview.style.display = "none"
    verifyButton.textContent = "Verificar demostración"
  }
  isRendered = !isRendered
}

function render() {
  if (!isRendered) {
    proofInput.style.display = "none"
    proofPreview.style.display = "block"
    proofPreview.innerHTML = renderProof(proofInput.value)
    compileButton.textContent = "Editar"
    latexPreview.style.display = "none"
  } else {
    proofInput.style.display = "block"
    proofPreview.style.display = "none"
    compileButton.textContent = "Compilar"
  }
  isRendered = !isRendered
}

// Renderiza las ecuaciones
function renderProof(text) {
  let result = text.split(/(\\\[[^$]+\\\])/).map((part) => {
    if (part.startsWith("\\[") && part.endsWith("\\]")) {
      try {
        const latex = part.slice(2, -2)
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        })
      } catch (error) {
        return part
      }
    }
    return part
  })

  result = result.map((part) => {
    subparts = part.split(/(\\\(+[^$]\\\))/)
    subpart = subparts.map((subpart) => {
      subsubparts = subpart.split(/(\\\([^$]+\\\))/)
      return subsubparts
      .map((subPart) => {
        if (subPart.startsWith("\\(") && subPart.endsWith("\\)")) {
          try {
            const latex = subPart.slice(2, -2)
            return katex.renderToString(latex, {
              throwOnError: false,
              displayMode: false,
            })
          } catch (error) {
            return subPart
          }
        }
        return subPart
      })
      .join("")
    })
    return subpart.join("")
  })
  return result.join("")
}

// Maneja la previsualización de las ecuaciones
function handleLatexPreview(e) {
  const textarea = e.target
  const cursorPosition = textarea.selectionStart
  const text = textarea.value

  const latexContent = findLatexAtCursor(text, cursorPosition)
  if (latexContent) {
    try {
      const rendered = katex.renderToString(latexContent.content, {
        throwOnError: false,
        displayMode: latexContent.isBlock,
      })

      const rect = textarea.getBoundingClientRect()
      const coords = getCaretCoordinates(textarea, cursorPosition)

      latexPreview.innerHTML = rendered
      latexPreview.style.display = "block"
      latexPreview.style.left = `${rect.left}px`
      latexPreview.style.top = `${coords.top + 15}px`
    } catch (error) {
      console.error("LaTeX rendering error:", error)
    }
  } else {
    latexPreview.style.display = "none"
  }
}

// Encuentra el contenido entre los delimitadores para mostrar la previsualización
function findLatexAtCursor(text, cursorPosition) {
  const beforeCursor = text.slice(0, cursorPosition)
  const afterCursor = text.slice(cursorPosition)

  if (afterCursor.indexOf(")") !== 0 && beforeCursor.lastIndexOf("\\") !== beforeCursor.length-1) {
    // Para delimitadores \[ \] (latex en línea separada)
    const blockStartIndex = beforeCursor.lastIndexOf("\\[")
    const blockIndex = beforeCursor.lastIndexOf("\\]")
    if ((blockStartIndex !== -1 && blockIndex === -1) || (blockStartIndex !== -1 && blockIndex < blockStartIndex)) {
      const blockEndIndex = afterCursor.indexOf("\\]")
      if (blockEndIndex !== -1) {
        return {
          content: text.slice(blockStartIndex + 2, cursorPosition + blockEndIndex),
          isBlock: true,
        }
      }
    }

    // Para delimitadores \( \) (latex en línea con texto)
    const inlineStartIndex = beforeCursor.lastIndexOf("\\(")
    const inlineIndex = beforeCursor.lastIndexOf("\\)")
    if ((inlineStartIndex !== -1 && inlineIndex === -1) || (inlineStartIndex !== -1 && inlineIndex < inlineStartIndex)) {
      const inlineEndIndex = afterCursor.indexOf("\\)")
      if (inlineEndIndex !== -1) {
        return {
          content: text.slice(inlineStartIndex + 2, cursorPosition + inlineEndIndex),
          isBlock: false,
        }
      }
    }
  }

  return null
}

// Da las coordenadas para la previsualización
function getCaretCoordinates(element, position) {
  const div = document.createElement("div")
  const styles = getComputedStyle(element)
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
  ]

  properties.forEach((prop) => {
    div.style[prop] = styles[prop]
  })

  div.textContent = element.value.substring(0, position)
  div.style.position = "absolute"
  div.style.visibility = "hidden"
  document.body.appendChild(div)

  const coordinates = {
    left: div.offsetWidth + element.offsetLeft,
    top: div.offsetHeight + element.offsetTop,
  }

  document.body.removeChild(div)
  return coordinates
}

// Maneja el envio de mensaje. Función de prueba.
function handleSubmit(message) {
  if (message.trim()) {
    // Process user message
    console.log("Processing user message:", message)
    addMessage(message, true)

    // Generate response (placeholder)
    const response = `Received: ${message}`
    addMessage(response, false)
  }
}

// Añadir el mensaje al historial del chat
function addMessage(content, isUser) {
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${isUser ? "user" : "bot"}`
  messageDiv.textContent = content
  chatHistory.appendChild(messageDiv)
  chatHistory.scrollTop = chatHistory.scrollHeight
}

// Event listener para actualizar la organización del historial del chat
chatForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const message = chatInput.value.trim()
  if (message) {
    handleSubmit(message)
    chatInput.value = ""
    chatInput.style.height = "auto"
  }
})

// Event listener para actualizar la altura de la entrada de chat
chatInput.addEventListener("input", (e) => {
  const textarea = e.target
  textarea.style.height = "auto"
  textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`
})

// Maneja la posición del cursor de texto dentro del área de demostración
// Muestra la previsualización cuando el cursor del texto vuelve dentro de los delimitadores (por ejemplo, si el usuario quiere revisar una ecuación otra vez)
function handleCursor(e) {
  const textarea = e.target
  const cursorPosition = textarea.selectionStart
  const text = textarea.value
  const latexContent = findLatexAtCursor(text, cursorPosition)
  if (latexContent == null) {
    latexPreview.style.display = "none"
  }
  else {
    try {
      const rendered = katex.renderToString(latexContent.content, {
        throwOnError: false,
        displayMode: latexContent.isBlock,
      })

      const rect = textarea.getBoundingClientRect()
      const coords = getCaretCoordinates(textarea, cursorPosition)

      latexPreview.innerHTML = rendered
      latexPreview.style.display = "block"
      latexPreview.style.left = `${rect.left}px`
      latexPreview.style.top = `${coords.top + 15}px`
    } catch (error) {
      console.error("LaTeX rendering error:", error)
    }
  }
}

// Event listener para mostrar previsualización mientras se escribe la ecuación
//proofInput.addEventListener("input", handleLatexPreview)

// Event listener para detectar la posición del cursor de texto dentro de la página web y así mostrar la previsualización de ecuaciones
document.addEventListener("selectionchange", handleCursor)

// Llama a la función de inicialización cuando el DOM esté completamente cargado
//document.addEventListener("DOMContentLoaded", initializeRandomProblem)
