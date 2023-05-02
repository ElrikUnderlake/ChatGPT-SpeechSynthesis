// Utility function to clean HTML and read all elements
function cleanHTMLAndReadElements(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText;
}

let foundVoice = false
function getUKFemaleVoice() {
  if (foundVoice) {
    return foundVoice
  }
  const voices = window.speechSynthesis.getVoices();
  const ukFemaleVoices = voices.filter(voice => {
    const isGb = voice.lang === 'en-GB' ;
    const isFemale = (voice.name.toLowerCase().indexOf('female') > -1);
    return isGb && isFemale;
  });

  if (ukFemaleVoices.length > 0) {
    foundVoice = ukFemaleVoices[0];
    return foundVoice;
  }
  return null;
}

function createPlayStopButton(type) {
  const button = document.createElement("button");
  button.classList.add("play-stop-button");
  button.innerHTML = "▶️";
  button.setAttribute('chat-type', type)
  button.setAttribute('data-playing', 'false')
  button.addEventListener("click", handlePlayStop);
  return button;
}

function getActiveContainer() {
  return document.querySelector(".chatgptreader-active");
}

function speakChunks(utterance, allChunksCompleteCallback) {
  const text = utterance.text;
  const MAX_CHUNK_LENGTH = 100;
  const chunks = [];

  let startIndex = 0;

  const speakNextChunk = () => {
    if (chunks.length === 0) {
      return;
    }
    const chunkUtterance = chunks.shift();
    window.speechSynthesis.speak(chunkUtterance);
  };

  const handleUtteranceEnd = () => {
    if (chunks.length > 0) {
      speakNextChunk();
    } else {
      allChunksCompleteCallback();
    }
  };

  while (startIndex < text.length) {
    let endIndex = startIndex + MAX_CHUNK_LENGTH;
    while (endIndex < text.length && text[endIndex] !== ' ') {
      endIndex--;
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    const chunkUtterance = new SpeechSynthesisUtterance(chunk);
    chunkUtterance.voice = utterance.voice;
    chunkUtterance.rate = utterance.rate;
    chunkUtterance.onend = handleUtteranceEnd

    if (chunk.length > 0) {
      chunks.push(chunkUtterance);
    }
    startIndex = endIndex;
  }


  speakNextChunk();
}

function getTextToRead(button, chatType) {
  let container;
  if (chatType === 'user') {
    container = button.parentElement.parentElement.firstElementChild.firstElementChild;
  } else {
    container = button.parentElement.parentElement.previousElementSibling.firstElementChild;
  }
  const text = container.textContent;
  return { text: cleanHTMLAndReadElements(text), container: container };
}

let currentPlaying = null;
let utterance = new SpeechSynthesisUtterance();
function handlePlayStop(e) {
  const button = e.target;

  // Set the desired voice and rate for the utterance
  const ukFemaleVoice = getUKFemaleVoice();
  if (ukFemaleVoice) {
    utterance.voice = ukFemaleVoice;
  }
  utterance.rate = 1.25;

  if (button.getAttribute('data-playing') === 'false') {
    if (currentPlaying) {
      // Stop the currently playing speech
      window.speechSynthesis.cancel();
      
      // Update the play/stop icon and data-playing attribute of the current playing element
      currentPlaying.setAttribute('data-playing', 'false');
      currentPlaying.innerHTML = "▶️";

      // Remove the active class from the previous container
      const prevContainer = getContainer(currentPlaying);
      prevContainer.classList.remove('chatgptreader-active');
    }

    const chatType = button.getAttribute('chat-type');
    const {text, container} = getTextToRead(button, chatType);
    utterance.text = text;

    // Add the active class to the current container
    container.classList.add('chatgptreader-active');
  
    // Start the new speech
    const allChunksCompleteCallback = () => {
      button.setAttribute('data-playing', 'false');
      button.innerHTML = "▶️";
      currentPlaying = null;
      container.classList.remove('chatgptreader-active');
    };
    speakChunks(utterance, allChunksCompleteCallback);

    // Update the play/stop icon and data-playing attribute
    button.setAttribute('data-playing', 'true');
    button.innerHTML = "⏹️";

    // Update the currentPlaying variable
    currentPlaying = button;
  } else {
    // Stop the speech and update the play/stop icon and data-playing attribute
    window.speechSynthesis.cancel();
    button.setAttribute('data-playing', 'false');
    button.innerHTML = "▶️";

    // Reset the currentPlaying variable
    currentPlaying = null;

    // Remove the active class from the container
    const container = getContainer(button);
    container.classList.remove('chatgptreader-active');
  }

  // Stop playing when the speech ends
  utterance.onend = () => {
    button.setAttribute('data-playing', 'false');
    button.innerHTML = "▶️";
    currentPlaying = null;
    // Remove the active class
    const container = getContainer(button);
    container.classList.remove('chatgptreader-active');
  };
}

function getContainer(button) {
  const chatType = button.getAttribute('chat-type');
  if (chatType === 'user') {
    return button.parentElement.parentElement.firstElementChild.firstElementChild;
  } else {
    return button.parentElement.parentElement.previousElementSibling.firstElementChild;
  }
}

function addPlayStopButtons() {
  const buttonGroups = document.querySelectorAll(".text-gray-400.flex.self-end");
  buttonGroups.forEach((buttonGroup, index) => {
    if (!buttonGroup.querySelector(".play-stop-button")) {
      const type = index % 2 ? 'bot' : 'user'
      const playStopButton = createPlayStopButton(type);
      buttonGroup.appendChild(playStopButton);
    }
  });
}

let speakingInstance;

setInterval(addPlayStopButtons, 500);

speechSynthesis.addEventListener('voiceschanged', addPlayStopButtons);
addPlayStopButtons();

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  .chatgptreader-active, .chatgptreader-active * {
    color: orange;
    animation: blink 1.44s infinite;
  }

  @keyframes blink {
    30% {
      opacity: 1;
    }

    50% {
      opacity: 0.9;
    }

    60% {
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleTag);
